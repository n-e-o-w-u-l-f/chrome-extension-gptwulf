globalThis.GPTWULF = globalThis.GPTWULF || {};

class ComposerController {
  constructor(adapter, stateEngine) {
    this.adapter = adapter;
    this.stateEngine = stateEngine;
  }

  async inject(prompt) {
    if (!prompt?.trim()) throw new Error("Prompt is empty");
    const composer = this.adapter.findComposer();
    if (!composer) throw new Error("Composer not found");

    this.stateEngine.setState(GPTWULF.STATES.INJECTING, 1);
    await this.adapter.setComposerValue(prompt, composer);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const actual = this.adapter.getComposerValue(composer).trim();
    if (actual !== prompt.trim()) {
      this.stateEngine.setState(GPTWULF.STATES.ERROR, 1, { reason: "composer-verification-failed" });
      throw new Error("Composer verification failed");
    }
    this.stateEngine.evaluate();
  }

  canSend() {
    const snapshot = this.stateEngine.evaluate();
    const button = this.adapter.findSubmitButton();
    const mode = this.adapter.detectButtonMode(button);
    return snapshot.state === GPTWULF.STATES.READY && snapshot.confidence >= 0.8 && mode.mode === "SEND" && mode.confidence >= 0.8 && !button.disabled;
  }

  async send(prompt) {
    if (prompt) await this.inject(prompt);
    if (!this.canSend()) throw new Error("ChatGPT is not safely ready to send");
    const button = this.adapter.findSubmitButton();
    if (!button) throw new Error("Submit button disappeared");

    this.stateEngine.setState(GPTWULF.STATES.SUBMITTING, 1);
    this.adapter.submit(button);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const next = this.stateEngine.evaluate();
    if (next.state !== GPTWULF.STATES.GENERATING && next.state !== GPTWULF.STATES.READY) {
      throw new Error("Submission could not be verified");
    }
    return next;
  }
}

GPTWULF.ComposerController = ComposerController;
