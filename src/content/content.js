(() => {
  if (globalThis.__GPTWULF_INITIALIZED__) return;
  globalThis.__GPTWULF_INITIALIZED__ = true;

  const adapter = new GPTWULF.ChatGPTDOMAdapter();
  const stateEngine = new GPTWULF.ChatGPTStateEngine(adapter);
  const composer = new GPTWULF.ComposerController(adapter, stateEngine);
  const autoReply = new GPTWULF.AutoReplyController(composer, stateEngine);

  const debug = (...args) => { if (GPTWULF.DEBUG) console.debug("[GPT-Wulf]", ...args); };
  let settings = { ...GPTWULF.DEFAULT_SETTINGS };
  let checkTimer = null;
  let lastConversationId = adapter.getConversationId();

  const scheduleStateCheck = () => {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => {
      const conversationId = adapter.getConversationId();
      if (conversationId !== lastConversationId) {
        lastConversationId = conversationId;
        autoReply.resetLock();
      }
      const snapshot = stateEngine.evaluate();
      debug("state", snapshot);
      updateInlineUI(snapshot);
    }, 100);
  };

  const ensureInlineUI = () => {
    if (document.querySelector(".gptwulf-root")) return;
    const root = document.createElement("div");
    root.className = "gptwulf-root";
    root.innerHTML = `
      <div class="gptwulf-panel" aria-label="GPT-Wulf">
        <span class="gptwulf-brand">GPT-Wulf</span>
        <span class="gptwulf-status" data-gptwulf-status>● Unbekannt</span>
        <label class="gptwulf-toggle"><input type="checkbox" data-gptwulf-auto> Auto Reply</label>
        <label class="gptwulf-toggle"><input type="checkbox" data-gptwulf-repeat> Wiederholen</label>
      </div>`;
    root.querySelector("[data-gptwulf-auto]").addEventListener("change", async (event) => {
      settings.autoReplyEnabled = event.target.checked;
      await GPTWULF.Storage.setSettings({ autoReplyEnabled: settings.autoReplyEnabled });
      autoReply.configure(settings);
      if (settings.autoReplyEnabled) await autoReply.submitOnce();
      scheduleStateCheck();
    });
    root.querySelector("[data-gptwulf-repeat]").addEventListener("change", async (event) => {
      settings.repeatMode = event.target.checked;
      await GPTWULF.Storage.setSettings({ repeatMode: settings.repeatMode });
      autoReply.configure(settings);
    });
    document.body.appendChild(root);
  };

  const updateInlineUI = (snapshot) => {
    const status = document.querySelector("[data-gptwulf-status]");
    const auto = document.querySelector("[data-gptwulf-auto]");
    const repeat = document.querySelector("[data-gptwulf-repeat]");
    if (!status || !auto || !repeat) return;
    const labels = { READY: "● Bereit", EMPTY: "● Composer leer", GENERATING: "● ChatGPT generiert", UNKNOWN: "● Status unsicher", NOT_CHATGPT: "● Nicht ChatGPT", ERROR: "● Fehler", INJECTING: "● Eingabe wird eingesetzt", SUBMITTING: "● Senden", COMPLETED: "● Fertig" };
    status.textContent = labels[snapshot.state] || `● ${snapshot.state}`;
    auto.checked = settings.autoReplyEnabled;
    repeat.checked = settings.repeatMode;
  };

  const handleMessage = async (message) => {
    switch (message?.type) {
      case GPTWULF.MESSAGE_TYPES.GET_STATUS:
        return buildStatus();
      case GPTWULF.MESSAGE_TYPES.SET_PROMPT:
        settings = await GPTWULF.Storage.setSettings({ prompt: message.prompt || "" });
        autoReply.configure(settings);
        return buildStatus();
      case GPTWULF.MESSAGE_TYPES.SEND_PROMPT:
        if (typeof message.prompt === "string" && message.prompt.trim()) settings = await GPTWULF.Storage.setSettings({ prompt: message.prompt });
        autoReply.configure(settings);
        await autoReply.submitOnce();
        return buildStatus();
      case GPTWULF.MESSAGE_TYPES.ENABLE_AUTO_REPLY:
        settings = await GPTWULF.Storage.setSettings({ autoReplyEnabled: true });
        autoReply.configure(settings);
        await autoReply.submitOnce();
        return buildStatus();
      case GPTWULF.MESSAGE_TYPES.DISABLE_AUTO_REPLY:
        settings = await GPTWULF.Storage.setSettings({ autoReplyEnabled: false });
        autoReply.configure(settings);
        return buildStatus();
      case GPTWULF.MESSAGE_TYPES.SET_REPEAT_MODE:
        settings = await GPTWULF.Storage.setSettings({ repeatMode: Boolean(message.enabled) });
        autoReply.configure(settings);
        return buildStatus();
      case GPTWULF.MESSAGE_TYPES.GET_SETTINGS:
        return settings;
      case GPTWULF.MESSAGE_TYPES.SET_SETTINGS:
        settings = await GPTWULF.Storage.setSettings(message.settings || {});
        autoReply.configure(settings);
        return settings;
      default:
        return undefined;
    }
  };

  const buildStatus = () => {
    const snapshot = stateEngine.evaluate();
    return {
      connected: adapter.isChatGPT(),
      chatDetected: Boolean(adapter.getConversationId()) || adapter.isChatGPT(),
      composerDetected: Boolean(adapter.findComposer()),
      submitButtonDetected: Boolean(adapter.findSubmitButton()),
      state: snapshot.state,
      confidence: snapshot.confidence,
      autoReply: settings.autoReplyEnabled,
      repeatMode: settings.repeatMode,
      messageInProgress: autoReply.messageInProgress
    };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    Promise.resolve(handleMessage(message)).then(sendResponse).catch((error) => sendResponse({ error: error.message }));
    return true;
  });

  const observer = new MutationObserver(scheduleStateCheck);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled", "aria-label", "data-testid", "class"] });

  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event("gptwulf:navigation"));
      return result;
    };
  }
  window.addEventListener("popstate", scheduleStateCheck);
  window.addEventListener("gptwulf:navigation", scheduleStateCheck);

  GPTWULF.Storage.getSettings().then((loaded) => {
    settings = loaded;
    autoReply.configure(settings);
    ensureInlineUI();
    scheduleStateCheck();
    debug("initialized");
  });
})();
