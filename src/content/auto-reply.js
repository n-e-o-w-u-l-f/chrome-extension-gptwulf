globalThis.GPTWULF = globalThis.GPTWULF || {};

class AutoReplyController {
  constructor(composer, stateEngine) {
    this.composer = composer;
    this.stateEngine = stateEngine;
    this.enabled = false;
    this.repeatMode = false;
    this.prompt = "";
    this.messageInProgress = false;
    this.lastSubmission = null;
    this.generationStarted = false;
    this.pendingActivation = false;
    this.unsubscribe = stateEngine.onChange((snapshot) => this.handleState(snapshot));
  }

  configure({ enabled, repeatMode, prompt }) {
    const wasEnabled = this.enabled;
    this.enabled = Boolean(enabled);
    this.repeatMode = Boolean(repeatMode);
    this.prompt = typeof prompt === "string" ? prompt : "";
    if (!this.enabled) {
      this.pendingActivation = false;
      this.resetLock();
    } else if (!wasEnabled) {
      this.pendingActivation = true;
    }
  }

  resetLock() {
    this.messageInProgress = false;
    this.generationStarted = false;
  }

  hashPrompt(prompt) {
    let hash = 2166136261;
    for (let i = 0; i < prompt.length; i += 1) {
      hash ^= prompt.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  async submitOnce() {
    if (!this.enabled || this.messageInProgress || !this.prompt.trim()) return false;
    const snapshot = this.stateEngine.evaluate();
    if (snapshot.state !== GPTWULF.STATES.READY && snapshot.state !== GPTWULF.STATES.EMPTY) return false;

    const id = crypto.randomUUID();
    this.lastSubmission = { id, promptHash: this.hashPrompt(this.prompt), submittedAt: Date.now() };
    this.messageInProgress = true;
    this.pendingActivation = false;
    try {
      await this.composer.send(this.prompt);
      this.generationStarted = true;
      return true;
    } catch (error) {
      this.messageInProgress = false;
      this.lastSubmission = null;
      this.stateEngine.setState(GPTWULF.STATES.ERROR, 1, { reason: error.message });
      return false;
    }
  }

  handleState(snapshot) {
    if (!this.enabled) return;
    if (this.pendingActivation && (snapshot.state === GPTWULF.STATES.READY || snapshot.state === GPTWULF.STATES.EMPTY)) {
      void this.submitOnce();
      return;
    }
    if (!this.messageInProgress) return;
    if (snapshot.state === GPTWULF.STATES.GENERATING) {
      this.generationStarted = true;
      return;
    }
    if (this.generationStarted && snapshot.state === GPTWULF.STATES.READY) {
      this.messageInProgress = false;
      this.generationStarted = false;
      if (this.repeatMode) setTimeout(() => this.submitOnce(), 250);
    }
  }

  destroy() {
    this.unsubscribe?.();
  }
}

GPTWULF.AutoReplyController = AutoReplyController;
