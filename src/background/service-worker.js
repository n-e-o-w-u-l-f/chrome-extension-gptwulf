chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(["prompt", "autoReplyEnabled", "repeatMode", "theme"]);
  await chrome.storage.local.set({
    prompt: current.prompt ?? "",
    autoReplyEnabled: current.autoReplyEnabled ?? false,
    repeatMode: current.repeatMode ?? false,
    theme: current.theme ?? "auto"
  });
});
