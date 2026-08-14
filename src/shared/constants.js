globalThis.GPTWULF = globalThis.GPTWULF || {};

GPTWULF.STATES = Object.freeze({
  UNKNOWN: "UNKNOWN",
  NOT_CHATGPT: "NOT_CHATGPT",
  EMPTY: "EMPTY",
  READY: "READY",
  INJECTING: "INJECTING",
  SUBMITTING: "SUBMITTING",
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
  ERROR: "ERROR"
});

GPTWULF.DEFAULT_SETTINGS = Object.freeze({
  prompt: "",
  autoReplyEnabled: false,
  repeatMode: false,
  theme: "auto"
});

GPTWULF.SELECTORS = Object.freeze({
  submitButton: [
    'button[data-testid="send-button"]',
    '#composer-submit-button'
  ],
  composerInputs: [
    "#prompt-textarea",
    "textarea",
    '[contenteditable="true"]'
  ]
});

GPTWULF.MESSAGE_TYPES = Object.freeze({
  GET_STATUS: "GET_STATUS",
  SET_PROMPT: "SET_PROMPT",
  SEND_PROMPT: "SEND_PROMPT",
  ENABLE_AUTO_REPLY: "ENABLE_AUTO_REPLY",
  DISABLE_AUTO_REPLY: "DISABLE_AUTO_REPLY",
  SET_REPEAT_MODE: "SET_REPEAT_MODE",
  GET_SETTINGS: "GET_SETTINGS",
  SET_SETTINGS: "SET_SETTINGS"
});

GPTWULF.DEBUG = false;
