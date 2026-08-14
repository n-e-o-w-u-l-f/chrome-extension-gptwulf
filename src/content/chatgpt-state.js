globalThis.GPTWULF = globalThis.GPTWULF || {};

class ChatGPTStateEngine {
  constructor(adapter) {
    this.adapter = adapter;
    this.state = GPTWULF.STATES.UNKNOWN;
    this.confidence = 0;
    this.lastEvidence = null;
    this.listeners = new Set();
  }

  setState(state, confidence, evidence = null) {
    const changed = this.state !== state || this.confidence !== confidence;
    this.state = state;
    this.confidence = confidence;
    this.lastEvidence = evidence;
    if (changed) this.listeners.forEach((listener) => listener(this.getSnapshot()));
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return { state: this.state, confidence: this.confidence, evidence: this.lastEvidence };
  }

  evaluate() {
    if (!this.adapter.isChatGPT()) {
      this.setState(GPTWULF.STATES.NOT_CHATGPT, 1);
      return this.getSnapshot();
    }

    const composer = this.adapter.findComposer();
    const button = this.adapter.findSubmitButton();
    if (!composer) {
      this.setState(GPTWULF.STATES.UNKNOWN, 0.9, { composerDetected: false });
      return this.getSnapshot();
    }

    if (!button) {
      this.setState(GPTWULF.STATES.UNKNOWN, 0.85, { composerDetected: true, submitButtonDetected: false });
      return this.getSnapshot();
    }

    const mode = this.adapter.detectButtonMode(button);
    const value = this.adapter.getComposerValue(composer).trim();
    const evidence = { composerDetected: true, submitButtonDetected: true, valuePresent: Boolean(value), mode };

    if (mode.mode === "STOP") {
      this.setState(GPTWULF.STATES.GENERATING, mode.confidence, evidence);
    } else if (mode.mode === "SEND" && value) {
      this.setState(GPTWULF.STATES.READY, mode.confidence, evidence);
    } else if (mode.mode === "SEND_DISABLED" || !value) {
      this.setState(GPTWULF.STATES.EMPTY, mode.confidence, evidence);
    } else {
      this.setState(GPTWULF.STATES.UNKNOWN, Math.min(mode.confidence, 0.5), evidence);
    }
    return this.getSnapshot();
  }
}

GPTWULF.ChatGPTStateEngine = ChatGPTStateEngine;
