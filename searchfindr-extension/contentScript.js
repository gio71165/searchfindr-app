console.log("[SearchFindr] content script injected on", location.href);

(function () {
  // Token encoding/decoding functions (same as popup.js)
  const TOKEN_KEY = "searchfindr_auth_token";
  const SESSION_STORAGE = chrome.storage.session;

  function encodeToken(token) {
    return btoa(token + "::" + Date.now());
  }

  function saveToken(token) {
    return new Promise((resolve, reject) => {
      SESSION_STORAGE.set({ [TOKEN_KEY]: encodeToken(token) }, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          console.error("[SearchFindr] Failed saving token to chrome.storage.session:", err);
          reject(err);
          return;
        }
        console.log("[SearchFindr] Saved access token to chrome.storage.session");
        resolve();
      });
    });
  }

  async function tryReadToken(maxRetries = 10, delay = 300) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let access_token = null;

        // Method 1: Check for token in data attribute (injected by callback page)
        const tokenFromAttr = document.documentElement.getAttribute('data-searchfindr-token');
        if (tokenFromAttr && tokenFromAttr.trim()) {
          access_token = tokenFromAttr.trim();
          console.log("[SearchFindr] Found token from data attribute");
        }

        // Method 2: Try to read from localStorage (if accessible)
        if (!access_token) {
          try {
            // Inject script into page context to access localStorage
            const script = document.createElement('script');
            script.textContent = `
              (function() {
                try {
                  let sessionStr = localStorage.getItem("searchfindr-auth");
                  if (!sessionStr) {
                    for (let i = 0; i < localStorage.length; i++) {
                      const k = localStorage.key(i);
                      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
                        sessionStr = localStorage.getItem(k);
                        break;
                      }
                    }
                  }
                  if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    const token = session?.access_token || session?.currentSession?.access_token;
                    if (token) {
                      window.__searchfindr_token = token;
                    }
                  }
                } catch(e) {
                  console.error("[SearchFindr] localStorage read error:", e);
                }
              })();
            `;
            document.documentElement.appendChild(script);
            script.remove();
            
            // Wait a bit for script to execute
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Try to read from window (if script succeeded)
            if (window.__searchfindr_token) {
              access_token = window.__searchfindr_token;
              console.log("[SearchFindr] Found token from localStorage via injected script");
            }
          } catch (e) {
            console.warn("[SearchFindr] Could not access localStorage:", e);
          }
        }

        if (!access_token || typeof access_token !== "string" || !access_token.trim()) {
          if (attempt < maxRetries - 1) {
            console.log(`[SearchFindr] No token found, retrying... (${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          console.warn("[SearchFindr] No access token found after retries.");
          return false;
        }

        // Save the token to extension storage
        await saveToken(access_token.trim());

        // Cleanup: remove old local/sync keys if you previously stored there
        chrome.storage.local.remove(["sf_access_token", "searchfindr_auth_token"], () => {
          // ignore errors here
        });
        chrome.storage.sync.remove(["sf_access_token", "sf_refresh_token", "searchfindr_auth_token"], () => {
          // ignore errors here
        });

        console.log("[SearchFindr] Successfully saved token to extension storage");
        return true;
      } catch (e) {
        console.error(`[SearchFindr] Attempt ${attempt + 1} failed:`, e);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    return false;
  }

  // Listen for postMessage from page (callback page injects this)
  window.addEventListener('message', async (event) => {
    // Only accept messages from same origin
    if (event.origin !== window.location.origin) return;
    
    if (event.data && event.data.type === 'SEARCHFINDR_EXTENSION_TOKEN' && event.data.token) {
      console.log("[SearchFindr] Received token via postMessage");
      try {
        await saveToken(event.data.token.trim());
        console.log("[SearchFindr] Successfully saved token from postMessage");
      } catch (e) {
        console.error("[SearchFindr] Failed to save token from postMessage:", e);
      }
    }
  });

  // Main execution - try to read token
  (async () => {
    try {
      const success = await tryReadToken();
      
      if (success) {
        // Small delay to ensure token is saved before any redirect
        setTimeout(() => {
          // Don't redirect here - let the callback page handle it
          console.log("[SearchFindr] Token saved successfully");
        }, 200);
      } else {
        console.warn("[SearchFindr] Could not read token. User may need to log in again.");
      }
    } catch (e) {
      console.error("[SearchFindr] Content script failed:", e);
    }
  })();
})();
