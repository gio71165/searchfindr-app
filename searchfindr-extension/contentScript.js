console.log("[SearchFindr] content script injected on", location.href);

(function () {
  // Token encoding/decoding functions (same as popup.js)
  const TOKEN_KEY = "searchfindr_auth_token";
  const SESSION_STORAGE = chrome.storage.session;

  function encodeToken(token) {
    return btoa(token + "::" + Date.now());
  }

  function saveToken(token) {
    SESSION_STORAGE.set({ [TOKEN_KEY]: encodeToken(token) }, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.error("[SearchFindr] Failed saving token to chrome.storage.session:", err);
        return;
      }
      console.log("[SearchFindr] Saved access token to chrome.storage.session");
    });
  }

  try {
    // 1) Find Supabase auth session in YOUR web app's localStorage
    // Supabase typically stores under: sb-<projectRef>-auth-token
    let sessionStr = null;

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        sessionStr = localStorage.getItem(k);
        break;
      }
    }

    if (!sessionStr) {
      console.warn("[SearchFindr] No Supabase session found in localStorage.");
      // Optional: redirect to login/help page
      // location.href = "https://searchfindr-app.vercel.app/login";
      return;
    }

    let session = null;
    try {
      session = JSON.parse(sessionStr);
    } catch (e) {
      console.error("[SearchFindr] Failed to parse session JSON:", e);
      return;
    }

    // Supabase session object shape can vary slightly; access_token is the key thing
    const access_token = session?.access_token || session?.currentSession?.access_token;

    if (!access_token || typeof access_token !== "string" || !access_token.trim()) {
      console.warn("[SearchFindr] Session found but missing access_token.");
      return;
    }

    // 2) Save ONLY the access token to extension storage (SESSION, not local)
    // Session storage clears when browser closes (more secure)
    saveToken(access_token.trim());

    // 3) Optional cleanup: remove old local/sync keys if you previously stored there
    chrome.storage.local.remove(["sf_access_token", "searchfindr_auth_token"], () => {
      // ignore errors here
    });
    chrome.storage.sync.remove(["sf_access_token", "sf_refresh_token", "searchfindr_auth_token"], () => {
      // ignore errors here
    });

    // 4) Redirect user somewhere that confirms login success
    // Create this route or just go to dashboard
    const successUrl = "https://searchfindr-app.vercel.app/extension/success";
    // fallback if you don't have it:
    // const successUrl = "https://searchfindr-app.vercel.app/dashboard";

    // If you're already on callback, move them away so they don't keep re-triggering
    // Small delay to ensure token is saved
    setTimeout(() => {
      location.replace(successUrl);
    }, 100);
  } catch (e) {
    console.error("[SearchFindr] Content script failed:", e);
  }
})();
