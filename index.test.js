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

--------------------------------------------------------------------------------

<details>

To modify this label's message, edit the <code>.github/label-messager/wasmtime-config.md</code> file.

To add new label messages or remove existing label messages, edit the
<code>.github/label-messager.json</code> configuration file.

[Learn more.](https://github.com/bytecodealliance/label-messager-action)

</details>
`.trim();

  const observed = makeMessage(
    ".github/label-messager.json",
    ".github/label-messager/wasmtime-config.md",
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
