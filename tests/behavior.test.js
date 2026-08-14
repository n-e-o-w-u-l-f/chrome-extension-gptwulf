const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function load(relativePaths, globals = {}) {
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    crypto: { randomUUID: () => "test-id" },
    ...globals
  });
  for (const relative of relativePaths) {
    vm.runInContext(fs.readFileSync(path.join(root, relative), "utf8"), context, { filename: relative });
  }
  return context.GPTWULF;
}

test("state engine never treats a disabled send button with text as READY", () => {
  const GPTWULF = load(["src/shared/constants.js", "src/content/chatgpt-state.js"]);
  const adapter = {
    isChatGPT: () => true,
    findComposer: () => ({}),
    findSubmitButton: () => ({}),
    detectButtonMode: () => ({ mode: "SEND_DISABLED", confidence: 0.95 }),
    getComposerValue: () => "hello"
  };
  const engine = new GPTWULF.ChatGPTStateEngine(adapter);
  const snapshot = engine.evaluate();
  assert.equal(snapshot.state, GPTWULF.STATES.UNKNOWN);
  assert.ok(snapshot.confidence < 0.8);
});

test("UNKNOWN and GENERATING cannot pass the safe-send guard", () => {
  const GPTWULF = load(["src/shared/constants.js", "src/content/composer.js"]);
  let state = GPTWULF.STATES.UNKNOWN;
  const engine = {
    evaluate: () => ({ state, confidence: 1 }),
    setState: (next) => { state = next; }
  };
  const button = { disabled: false };
  const adapter = {
    findSubmitButton: () => button,
    detectButtonMode: () => ({ mode: "SEND", confidence: 0.95 })
  };
  const controller = new GPTWULF.ComposerController(adapter, engine);
  assert.equal(controller.canSend(), false);
  state = GPTWULF.STATES.GENERATING;
  assert.equal(controller.canSend(), false);
});

test("safe-send guard refuses a missing button without throwing", () => {
  const GPTWULF = load(["src/shared/constants.js", "src/content/composer.js"]);
  const engine = {
    evaluate: () => ({ state: GPTWULF.STATES.READY, confidence: 0.95 }),
    setState: () => {}
  };
  const adapter = {
    findSubmitButton: () => null,
    detectButtonMode: () => ({ mode: "UNKNOWN", confidence: 0 })
  };
  const controller = new GPTWULF.ComposerController(adapter, engine);
  assert.doesNotThrow(() => controller.canSend());
  assert.equal(controller.canSend(), false);
});

test("auto reply locks duplicate submissions until generation completes", async () => {
  const GPTWULF = load(["src/shared/constants.js", "src/content/auto-reply.js"]);
  let state = GPTWULF.STATES.READY;
  const listeners = new Set();
  const engine = {
    evaluate: () => ({ state, confidence: 0.95 }),
    setState: (next) => {
      state = next;
      for (const listener of listeners) listener({ state, confidence: 1 });
    },
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
  let sends = 0;
  const composer = {
    send: async () => {
      sends += 1;
      state = GPTWULF.STATES.GENERATING;
      for (const listener of listeners) listener({ state, confidence: 1 });
    },
    inject: async () => {}
  };
  const auto = new GPTWULF.AutoReplyController(composer, engine);
  auto.configure({ enabled: true, repeatMode: false, prompt: "hello" });
  assert.equal(await auto.submitOnce(), true);
  assert.equal(await auto.submitOnce(), false);
  assert.equal(sends, 1);
  state = GPTWULF.STATES.READY;
  for (const listener of listeners) listener({ state, confidence: 1 });
  assert.equal(auto.messageInProgress, false);
});

test("resetLock cancels a pending repeat submission", async () => {
  const GPTWULF = load(["src/shared/constants.js", "src/content/auto-reply.js"]);
  let state = GPTWULF.STATES.READY;
  const listeners = new Set();
  const engine = {
    evaluate: () => ({ state, confidence: 0.95 }),
    setState: (next) => { state = next; },
    onChange: (listener) => { listeners.add(listener); return () => listeners.delete(listener); }
  };
  let sends = 0;
  const composer = { send: async () => { sends += 1; state = GPTWULF.STATES.GENERATING; }, inject: async () => {} };
  const auto = new GPTWULF.AutoReplyController(composer, engine);
  auto.configure({ enabled: true, repeatMode: true, prompt: "hello" });
  await auto.submitOnce();
  auto.generationStarted = true;
  state = GPTWULF.STATES.READY;
  auto.handleState({ state: GPTWULF.STATES.READY, confidence: 1 });
  auto.resetLock();
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(sends, 1);
});
