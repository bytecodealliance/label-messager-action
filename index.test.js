/*global test*/
const assert = require("assert");
const {
  getCommentLabel,
  makeMessage,
} = require("./label-messager");

test("test makeMessage", () => {
  const expected = `
#### Label Messager: wasmtime:config

This is a message for you

<details>

To modify this label's message, edit the <code>.github/label-messager/wasmtime:config</code> file.  To
stop leaving these messages for the <code>wasmtime:config</code> label completely,
remove that file.

To add new label messages, add a file inside the <code>.github/label-messager</code>
directory with the name of the label.

[Learn more.](https://github.com/bytecodealliance/label-messager-action)

</details>
`.trim();

  const observed = makeMessage(
    ".github/label-messager",
    ".github/label-messager/wasmtime:config",
    "wasmtime:config",
    "This is a message for you"
  );

  assert.equal(expected, observed);
});

test("test getCommentLabel", () => {
  const comment = makeMessage(
    ".github/label-messager",
    ".github/label-messager/wasmtime:config",
    "wasmtime:config",
    "This is a message for you"
  );

  const label = getCommentLabel(comment);
  assert.equal(label, "wasmtime:config");
});
