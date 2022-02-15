const core = require("@actions/core");
const github = require("@actions/github");
const path = require("path");

async function main() {
  try {
    const repoToken = core.getInput("repo-token");
    const client = new github.GitHub(repoToken);
    const messageDir = core.getInput("message-directory");

    if (github.context.payload.issue) {
      const issueNumber = github.context.payload.issue.number;
      const labels = [github.context.payload.label.name];
      await processIssue(client, messageDir, issueNumber, labels);
    } else {
      await triagePullRequests(client, messageDir);
    }
  } catch (error) {
    console.error(
      `Label Messager error: ${error.message}\n\nStack:\b${error.stack}`
    );
    core.setFailed(
      `Label Messager error: ${error.message}\n\nStack:\b${error.stack}`
    );
  }
}
exports.main = main;

function makeMessage(messageDir, messagePath, label, message) {
  // XXX: if you change the format of this message, make sure that we still
  // match it correctly in `triagePullRequests` and in `getCommentLabel`!!1!
  return `
#### Label Messager: ${label}

${message}

--------------------------------------------------------------------------------

<details>

To modify this label's message, edit the <code>${messagePath}</code> file.  To
stop leaving these messages for the <code>${label}</code> label completely,
remove that file.

To add new label messages, add a file inside the <code>${messageDir}</code>
directory with the name of the label.

[Learn more.](https://github.com/bytecodealliance/label-messager-action)

</details>
`.trim();
}
exports.makeMessage = makeMessage;

async function processIssue(client, messageDir, issueNumber, labels) {
  for (const label of labels) {
    console.log(`Processing label "${label}" on #${issueNumber}`);

    const messagePath = path.join(messageDir, label);
    let message = null;
    try {
      message = await fetchContent(client, messagePath);
    } catch (e) {
      console.log(`No message for label "${label}" at "${messagePath}"`);
      continue;
    }

    const messageText = makeMessage(messageDir, messagePath, label, message);

    console.log(`Creating comment:\n\n"""\n${message}\n"""`);

    await client.issues.createComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: issueNumber,
      body: messageText,
    });
  }
}

async function triagePullRequests(client, messageDir) {
  const operationsPerRun = parseInt(
    core.getInput("operations-per-run", { required: true })
  );
  if (operationsPerRun <= 0) {
    throw new Error(
      `operations-per-run must be greater than zero, got ${operationsPerRun}`
    );
  }
  let operationsLeft = operationsPerRun;

  // Iterate through pull requests, finding PRs that are labeled, but for which
  // we haven't commented yet.
  const listPullsOpts = await client.pulls.list.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    state: "open",
    sort: "updated",
  });
  for await (const pulls of client.paginate.iterator(listPullsOpts)) {
    for (const pr of pulls.data) {
      if (operationsLeft <= 0) {
        warn(
          "Executed the maximum operations for this run. Stopping now to avoid " +
            "hitting the github API rate limit."
        );
        return;
      }

      console.log(
        `Triaging PR #${pr.number} for labels which need a subscription comment`
      );

      const labelsToComment = new Set(pr.labels.map((l) => l.name));
      console.log(
        `PR #${pr.number} has these labels: ${[...labelsToComment]
          .sort()
          .join(", ")}`
      );

      // Iterate through all the existing comments in this PR and find our own
      // comments. For any comment we already made, remove the associated label
      // from `labelsToComment` so we don't duplicate comments.
      const listCommentsOpts = await client.issues.listComments.endpoint.merge({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: pr.number,
      });
      for await (const comments of client.paginate.iterator(listCommentsOpts)) {
        for (const comment of comments.data) {
          // XXX: The `startsWith` check needs to be kept in sync with the
          // message that this bot comments!! Failure to do so will result in
          // lots of bot spam.
          if (
            comment.user.login !== "github-actions[bot]" ||
            !comment.body.startsWith("#### Label Messager")
          ) {
            continue;
          }

          const alreadyCommented = getCommentLabel(comment.body);
          console.log(`Already left a subscription comment for label "${alreadyCommented}"`);
          labelsToComment.delete(alreadyCommented);
        }
      }

      if (labelsToComment.size > 0) {
        operationsLeft -= 1;
        processIssue(client, messageDir, pr.number, labelsToComment);
      }
    }
  }
}

function getCommentLabel(comment) {
  // Get the comment string after "Label Messager: ".
  const startOfLabel = comment.slice(comment.indexOf("Label Messager: ") + "Label Messager: ".length);

  // The label is up until the newline.
  return startOfLabel.slice(0, startOfLabel.indexOf("\n"));
}
exports.getCommentLabel = getCommentLabel;

async function fetchContent(client, path) {
  const response = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: github.context.sha,
    path,
  });
  console.log("Got response:", response);

  if (response.status != 200) {
    const msg = `Failed to fetch content: ${path}`;
    console.log(msg);
    throw new Error(msg);
  }

  return Buffer.from(response.data.content, response.data.encoding).toString();
}

function warn(msg) {
  console.warn(msg);
  core.warning(msg);
}
