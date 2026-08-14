const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const jsFiles = [
  "src/background/service-worker.js",
  "src/shared/constants.js",
  "src/shared/storage.js",
  "src/content/chatgpt-dom.js",
  "src/content/chatgpt-state.js",
  "src/content/composer.js",
  "src/content/auto-reply.js",
  "src/content/content.js",
  "src/popup/popup.js"
];

test("all JavaScript files parse", () => {
  for (const relative of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", path.join(root, relative)], { encoding: "utf8" });
    assert.equal(result.status, 0, `${relative}: ${result.stderr}`);
  }
});

test("manifest is MV3 and restricted to ChatGPT", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ["https://chatgpt.com/*"]);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.ok(!manifest.host_permissions.includes("<all_urls>"));
});

test("safe-send guard requires READY and SEND", () => {
  const source = fs.readFileSync(path.join(root, "src/content/composer.js"), "utf8");
  assert.match(source, /snapshot\.state === GPTWULF\.STATES\.READY/);
  assert.match(source, /mode\.mode === "SEND"/);
  assert.match(source, /!button\.disabled/);
});

test("unknown and generating states do not directly submit", () => {
  const source = fs.readFileSync(path.join(root, "src/content/auto-reply.js"), "utf8");
  assert.match(source, /messageInProgress/);
  assert.match(source, /snapshot\.state !== GPTWULF\.STATES\.READY && snapshot\.state !== GPTWULF\.STATES\.EMPTY/);
  assert.match(source, /snapshot\.state === GPTWULF\.STATES\.GENERATING/);
});
