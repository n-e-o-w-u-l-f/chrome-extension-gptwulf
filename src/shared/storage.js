globalThis.GPTWULF = globalThis.GPTWULF || {};

GPTWULF.Storage = {
  async getSettings() {
    const stored = await chrome.storage.local.get(GPTWULF.DEFAULT_SETTINGS);
    return { ...GPTWULF.DEFAULT_SETTINGS, ...stored };
  },

  async setSettings(partial) {
    const next = { ...GPTWULF.DEFAULT_SETTINGS, ...(await this.getSettings()), ...partial };
    await chrome.storage.local.set(next);
    return next;
  }
};
