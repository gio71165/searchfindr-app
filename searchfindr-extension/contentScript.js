console.log("[SearchFindr] content script injected on", location.href);
(function () {
  try {
    let sessionStr = null;

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        sessionStr = localStorage.getItem(k);
        break;
      }
    }

    if (!sessionStr) return;

    const session = JSON.parse(sessionStr);
    const access_token = session?.access_token;
    const refresh_token = session?.refresh_token;

    if (!access_token) return;

    chrome.storage.sync.set({
      sf_access_token: access_token,
      sf_refresh_token: refresh_token
    });
  } catch (e) {
    console.error("[SearchFindr ext]", e);
  }
})();
