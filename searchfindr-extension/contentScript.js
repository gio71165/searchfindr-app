console.log("[SearchFindr] content script injected on", location.href);

(function () {
  try {
    let sessionStr = null;

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        sessionStr = localStorage.getItem(k);
        console.log("[SearchFindr] Found supabase key:", k);
        break;
      }
    }

    if (!sessionStr) {
      console.warn("[SearchFindr] No Supabase session found in localStorage.");
      return;
    }

    const session = JSON.parse(sessionStr);
    const access_token = session?.access_token;
    const refresh_token = session?.refresh_token;

    if (!access_token) {
      console.warn("[SearchFindr] Session found but missing access_token.");
      return;
    }

    chrome.storage.sync.set(
      { sf_access_token: access_token, sf_refresh_token: refresh_token },
      () => {
        console.log("[SearchFindr] Saved tokens to chrome.storage.sync");
        chrome.storage.sync.get(["sf_access_token"], (res) => {
          console.log("[SearchFindr] Verify saved access token exists:", !!res.sf_access_token);
        });
      }
    );
  } catch (e) {
    console.error("[SearchFindr] Failed:", e);
  }
})();
