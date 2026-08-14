const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadAdapter() {
  class FakeElement {
    constructor({ textarea = false, contenteditable = false, value = "", text = "" } = {}) {
      this._textarea = textarea;
      this._contenteditable = contenteditable;
      this.value = value;
      this.innerText = text;
      this.textContent = text;
      this.isConnected = true;
      this.disabled = false;
      this.attributes = new Map();
    }
    matches(selector) {
      return (selector === "textarea" && this._textarea) || (selector === '[contenteditable="true"]' && this._contenteditable);
    }
    getBoundingClientRect() { return { width: 400, height: 40, top: 700, bottom: 740 }; }
    getAttribute(name) { return this.attributes.get(name) || ""; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    focus() {}
  }

  const context = vm.createContext({
    console,
    location: { hostname: "chatgpt.com", pathname: "/c/test" },
    window: { innerHeight: 900, getSelection: () => ({ removeAllRanges() {}, addRange() {} }) },
    document: { documentElement: { clientHeight: 900 }, createRange: () => ({ selectNodeContents() {} }), execCommand: () => true, querySelectorAll: () => [] },
    getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
    HTMLTextAreaElement: FakeElement,
    HTMLButtonElement: FakeElement,
    InputEvent: class InputEvent {},
    Event: class Event {}
  });
  vm.runInContext(fs.readFileSync(path.join(root, "src/shared/constants.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "src/content/chatgpt-dom.js"), "utf8"), context);
  return { GPTWULF: context.GPTWULF, FakeElement };
}

test("textarea composer value is read from value", () => {
  const { GPTWULF, FakeElement } = loadAdapter();
  const adapter = new GPTWULF.ChatGPTDOMAdapter();
  const textarea = new FakeElement({ textarea: true, value: "hello" });
  assert.equal(adapter.getComposerValue(textarea), "hello");
});

test("contenteditable composer value is read from rendered text", () => {
  const { GPTWULF, FakeElement } = loadAdapter();
  const adapter = new GPTWULF.ChatGPTDOMAdapter();
  const editor = new FakeElement({ contenteditable: true, text: "hello world" });
  assert.equal(adapter.getComposerValue(editor), "hello world");
});

test("unknown button evidence never becomes SEND", () => {
  const { GPTWULF, FakeElement } = loadAdapter();
  const adapter = new GPTWULF.ChatGPTDOMAdapter();
  const button = new FakeElement();
  assert.equal(adapter.detectButtonMode(button).mode, "UNKNOWN");
});

test("disabled send evidence becomes SEND_DISABLED", () => {
  const { GPTWULF, FakeElement } = loadAdapter();
  const adapter = new GPTWULF.ChatGPTDOMAdapter();
  const button = new FakeElement();
  button.disabled = true;
  button.setAttribute("aria-label", "Send message");
  assert.equal(adapter.detectButtonMode(button).mode, "SEND_DISABLED");
});

test("stop evidence takes precedence only when unambiguous", () => {
  const { GPTWULF, FakeElement } = loadAdapter();
  const adapter = new GPTWULF.ChatGPTDOMAdapter();
  const stop = new FakeElement();
  stop.setAttribute("aria-label", "Stop generating");
  assert.equal(adapter.detectButtonMode(stop).mode, "STOP");

  const ambiguous = new FakeElement();
  ambiguous.setAttribute("aria-label", "Send or stop");
  assert.equal(adapter.detectButtonMode(ambiguous).mode, "UNKNOWN");
});
