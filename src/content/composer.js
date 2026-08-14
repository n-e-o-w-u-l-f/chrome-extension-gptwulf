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
    if (snapshot.state !== GPTWULF.STATES.READY || snapshot.confidence < 0.8) return false;

    const button = this.adapter.findSubmitButton();
    if (!button) return false;

    const mode = this.adapter.detectButtonMode(button);
    return mode.mode === "SEND" && mode.confidence >= 0.8 && button.disabled === false;
  }

  async waitForGenerating(timeoutMs = 2000, intervalMs = 100) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
      const snapshot = this.stateEngine.evaluate();
      if (snapshot.state === GPTWULF.STATES.GENERATING) return snapshot;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return this.stateEngine.evaluate();
  }

  async send(prompt) {
    if (prompt) await this.inject(prompt);
    if (!this.canSend()) throw new Error("ChatGPT is not safely ready to send");

    const button = this.adapter.findSubmitButton();
    if (!button) throw new Error("Submit button disappeared");

    const finalMode = this.adapter.detectButtonMode(button);
    if (finalMode.mode !== "SEND" || finalMode.confidence < 0.8 || button.disabled) {
      throw new Error("Submit button is no longer safely sendable");
    }

    this.stateEngine.setState(GPTWULF.STATES.SUBMITTING, 1);
    this.adapter.submit(button);

    // ChatGPT can need a short amount of time to replace the send control
    // with the generation/stop control. Poll only for a bounded period; if
    // GENERATING is never observed, the submission remains unverified.
    const next = await this.waitForGenerating();
    if (next.state !== GPTWULF.STATES.GENERATING) {
      this.stateEngine.setState(GPTWULF.STATES.ERROR, 1, { reason: "submission-not-verified", observedState: next.state });
      throw new Error("Submission could not be verified");
    }
    return next;
  }
}

GPTWULF.ComposerController = ComposerController;
