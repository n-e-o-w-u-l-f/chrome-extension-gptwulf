globalThis.GPTWULF = globalThis.GPTWULF || {};

class ChatGPTDOMAdapter {
  isChatGPT() {
    return location.hostname === "chatgpt.com";
  }

  isVisible(element) {
    if (!element || !element.isConnected) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  isComposerCandidate(element) {
    if (!this.isVisible(element)) return false;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const nearBottom = rect.bottom >= viewportHeight * 0.55;
    const hasTextSemantics = element.matches("textarea, [contenteditable=\"true\"]");
    return hasTextSemantics && nearBottom;
  }

  findComposer() {
    const candidates = [];
    for (const selector of GPTWULF.SELECTORS.composerInputs) {
      for (const element of document.querySelectorAll(selector)) {
        if (this.isComposerCandidate(element)) candidates.push(element);
      }
    }
    candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    return candidates[0] || null;
  }

  findComposerContainer(input = this.findComposer()) {
    if (!input) return null;
    let node = input;
    for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
      if (node.querySelector('button[data-testid="send-button"], #composer-submit-button')) return node;
    }
    return input.parentElement;
  }

  findSubmitButton() {
    const direct = [];
    for (const selector of GPTWULF.SELECTORS.submitButton) {
      for (const button of document.querySelectorAll(selector)) {
        if (button instanceof HTMLButtonElement && this.isVisible(button)) direct.push(button);
      }
    }
    if (direct.length) {
      const composer = this.findComposer();
      const container = composer ? this.findComposerContainer(composer) : null;
      if (container) {
        const contextual = direct.find((button) => container.contains(button));
        if (contextual) return contextual;
      }
      return direct[direct.length - 1];
    }

    const composer = this.findComposer();
    const container = composer ? this.findComposerContainer(composer) : null;
    if (!container) return null;

    const buttons = [...container.querySelectorAll("button")].filter((button) => this.isVisible(button));
    const semantic = buttons.find((button) => {
      const label = (button.getAttribute("aria-label") || "").toLowerCase();
      return /(send|senden|submit|stop|cancel|abbrechen|stopp)/i.test(label);
    });
    return semantic || null;
  }

  getButtonEvidence(button = this.findSubmitButton()) {
    if (!button) return null;
    const use = button.querySelector("use");
    const iconHref = use?.getAttribute("href") || use?.getAttribute("xlink:href") || "";
    const aria = button.getAttribute("aria-label") || "";
    const testid = button.getAttribute("data-testid") || "";
    return {
      disabled: button.disabled,
      ariaLabel: aria,
      dataTestId: testid,
      className: typeof button.className === "string" ? button.className : "",
      iconHref,
      text: (button.textContent || "").trim()
    };
  }

  getComposerValue(element = this.findComposer()) {
    if (!element) return "";
    if (element instanceof HTMLTextAreaElement) return element.value;
    return element.innerText || element.textContent || "";
  }

  async setComposerValue(value, element = this.findComposer()) {
    if (!element) throw new Error("Composer not found");
    element.focus();

    if (element instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (!setter) throw new Error("Textarea value setter unavailable");
      setter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      return;
    }

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("insertText", false, value);
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  }

  detectButtonMode(button = this.findSubmitButton()) {
    const evidence = this.getButtonEvidence(button);
    if (!evidence) return { mode: "UNKNOWN", confidence: 0 };

    const label = evidence.ariaLabel.toLowerCase();
    const icon = evidence.iconHref.toLowerCase();
    const stopSignals = ["stop", "cancel", "abbrechen", "stopp"].some((x) => label.includes(x) || icon.includes(x));
    const sendSignals = ["send", "senden", "submit", "send-prompt"].some((x) => label.includes(x) || icon.includes(x));

    if (stopSignals && !sendSignals) return { mode: "STOP", confidence: 0.9 };
    if (sendSignals && !evidence.disabled) return { mode: "SEND", confidence: 0.95 };
    if (sendSignals && evidence.disabled) return { mode: "SEND_DISABLED", confidence: 0.95 };
    return { mode: "UNKNOWN", confidence: 0.35 };
  }

  getConversationId() {
    const match = location.pathname.match(/^\/c(?:hat)?\/([^/]+)/);
    return match?.[1] || null;
  }

  submit(button = this.findSubmitButton()) {
    if (!button) throw new Error("Submit button not found");
    button.click();
  }
}

GPTWULF.ChatGPTDOMAdapter = ChatGPTDOMAdapter;
