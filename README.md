# Label Messager Action

Leave a message on issues and comments when they are labeled with a specific
label.
## Usage

Add a `.github/workflows/label-messager.yml` file to your repository:

```yaml
name: "Label Messager"
on:
  issues:
    types: ["labeled"]
  schedule:
    # Run pull request triage every 5 minutes. Ideally, this would be on
    # "labeled" types of pull request events, but that doesn't work if the pull
    # request is from another fork. For example, see
    # https://github.com/actions/labeler/issues/12
    - cron: '*/5 * * * *'
jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
    - uses: bytecodealliance/label-messager-action@v1
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

Then configure what messages to add when issues or pull requests are labeled
with which label by adding files in the `.github/label-messager` directory. The
message for label `MY_LABEL` is the file `.github/label-messager/MY_LABEL`.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).
