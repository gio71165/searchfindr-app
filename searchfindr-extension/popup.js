// popup.js — SearchFindr Extension UX v15 (MV3, no "tabs" permission required)
// - No chrome.tabs.create()
// - Uses window.open for navigation
// - Uses chrome.tabs.query ONLY to get active tab id (works with activeTab + user gesture)
// - Injects script via chrome.scripting.executeScript to read URL/title/text

console.log("SearchFindr popup v15 loaded");

// 🌐 Base URL configuration
// Set to "production" for production, "staging" for staging/dev
const ENV = "production"; // Change to "staging" for dev/staging
const BASE_URL = ENV === "production" 
  ? "https://searchfindr.net"
  : "https://searchfindr-app.vercel.app";

// 🔥 Your LIVE API endpoint
const API_URL = `${BASE_URL}/api/capture-deal`;

// Optional URLs
const APP_HOME_URL = `${BASE_URL}/dashboard`;
const SETTINGS_URL = `${BASE_URL}/settings`;

// Storage key for API key — MUST use local so key persists after popup closes (MV3 session clears)
const API_KEY_STORAGE_KEY = "searchfindr_api_key";
const STORAGE = chrome.storage.local;
console.log("📦 Popup using storage: local (persistent)");

// Verify API key format
function validateApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }
  // Must start with sf_live_ or sf_test_ and have at least 32 more chars
  return /^sf_(live|test)_[a-f0-9]{32,}$/i.test(apiKey);
}

async function saveApiKey(apiKey) {
  // Store API key directly (it's already a secret, no need to encode)
  await STORAGE.set({ [API_KEY_STORAGE_KEY]: apiKey });
}

async function getApiKey() {
  const result = await STORAGE.get(API_KEY_STORAGE_KEY);
  return result[API_KEY_STORAGE_KEY] || null;
}

async function clearApiKey() {
  await STORAGE.remove(API_KEY_STORAGE_KEY);
}

// Verify API key with server.
// Returns { valid, error?, isUnauthorized? }. Only isUnauthorized (401) should trigger clearing the stored key.
async function verifyApiKey(apiKey) {
  try {
    const response = await fetch(`${BASE_URL}/api/extension/verify-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = data.error || "Invalid API key";
      const isUnauthorized = response.status === 401;
      return { valid: false, error, isUnauthorized };
    }

    return { valid: true, user_id: data.user_id, workspace_id: data.workspace_id };
  } catch (error) {
    console.error("[SearchFindr] API key verification error:", error);
    return { valid: false, error: "Network error. Please check your connection.", isUnauthorized: false };
  }
}

/**
 * Log debug information about current auth state
 */
async function logDebugInfo() {
  console.group("🔍 SearchFindr Extension - Debug Info");
  const apiKey = await getApiKey();
  const hasKey = !!apiKey;
  const isValidFormat = apiKey ? validateApiKeyFormat(apiKey) : false;
  
  console.log("API key present:", hasKey ? "✅ Yes" : "❌ No");
  console.log("API key format valid:", isValidFormat ? "✅ Yes" : "❌ No");
  if (apiKey) {
    console.log("API key prefix:", apiKey.substring(0, 12) + "...");
  }
  console.log("Current UI state:", uiState);
  console.log("Last capture:", lastDealUrl ? "✅ " + new Date().toLocaleString() : "❌ Never");
  console.log("Last debug ID:", lastDebugId || "None");
  console.groupEnd();
}

// ---- DOM ----
const statusEl = document.getElementById("status");
const titleEl = document.getElementById("title"); // optional
const primaryBtn =
  document.getElementById("primaryButton") || document.getElementById("sendButton");
const secondaryBtn = document.getElementById("secondaryButton"); // optional
const apiKeyInput = document.getElementById("apiKeyInput");
const apiKeySection = document.getElementById("apiKeySection");

const debugRow = document.getElementById("debugRow"); // optional container
const debugIdText = document.getElementById("debugIdText"); // optional span
const copyDebugBtn = document.getElementById("copyDebugButton"); // optional button

// ---- State ----
/**
 * UiState:
 * logged_out | ready | loading | success | error | expired
 */
let uiState = "logged_out";
let lastDebugId = null;
let lastDealUrl = null;

// ---- UI helpers ----
function setStatus(text, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#f87171" : "#9ca3af";
}

function setTitle(text) {
  if (!titleEl) return;
  titleEl.textContent = text;
}

function setDebug(idOrNull) {
  lastDebugId = idOrNull;
  if (!debugRow || !debugIdText) return;

  if (!idOrNull) {
    debugRow.style.display = "none";
    debugIdText.textContent = "";
    return;
  }

  debugRow.style.display = "block";
  debugIdText.textContent = idOrNull;
}

function makeDebugId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${Date.now()}-${rand}`;
}

function setButtons({ primaryText, primaryDisabled, secondaryText, secondaryHidden }) {
  if (primaryBtn) {
    if (primaryText != null) primaryBtn.textContent = primaryText;
    primaryBtn.disabled = !!primaryDisabled;
    primaryBtn.style.opacity = primaryBtn.disabled ? "0.6" : "1";
    primaryBtn.style.cursor = primaryBtn.disabled ? "not-allowed" : "pointer";
  }

  if (secondaryBtn) {
    if (secondaryText != null) secondaryBtn.textContent = secondaryText;
    secondaryBtn.style.display = secondaryHidden ? "none" : "inline-block";
    secondaryBtn.disabled = false;
    secondaryBtn.style.opacity = "1";
  }
}

function render() {
  if (uiState !== "error") setDebug(null);

  // Show/hide API key input section
  if (apiKeySection) {
    apiKeySection.classList.toggle("hidden", uiState !== "logged_out" && uiState !== "expired");
  }

  switch (uiState) {
    case "logged_out":
      setTitle("Not connected");
      setStatus("Enter your API key to connect the extension.");
      setButtons({
        primaryText: "Save API Key",
        primaryDisabled: false,
        secondaryText: "Get API Key",
        secondaryHidden: !secondaryBtn,
      });
      break;

    case "expired":
      setTitle("API key invalid");
      setStatus("Your API key is invalid or has been revoked. Please enter a new key.", true);
      setButtons({
        primaryText: "Save API Key",
        primaryDisabled: false,
        secondaryHidden: true,
      });
      break;

    case "ready":
      setTitle("Connected");
      if (window._currentTabIsDealPage) {
        setStatus("Ready to capture this listing.");
        setButtons({
          primaryText: "Capture / Save to SearchFindr",
          primaryDisabled: false,
          secondaryText: "Disconnect",
          secondaryHidden: !secondaryBtn,
        });
      } else {
        setStatus("Open a listing page on BizBuySell, LoopNet, or another supported deal site to capture.");
        setButtons({
          primaryText: "Capture / Save to SearchFindr",
          primaryDisabled: true,
          secondaryText: "Disconnect",
          secondaryHidden: !secondaryBtn,
        });
      }
      break;

    case "loading":
      setTitle("Saving…");
      setStatus("Saving…");
      setButtons({
        primaryText: "Saving…",
        primaryDisabled: true,
        secondaryHidden: true,
      });
      break;

    case "success":
      setTitle("Saved");
      setStatus("Listing added to your SearchFindr workspace.");
      setButtons({
        primaryText: "Open in SearchFindr",
        primaryDisabled: false,
        secondaryText: "Capture another",
        secondaryHidden: !secondaryBtn,
      });
      break;

    case "error":
      setTitle("Something went wrong");
      // status is set by the error handler so we can customize copy
      setButtons({
        primaryText: "Retry",
        primaryDisabled: false,
        secondaryText: secondaryBtn ? "Copy debug ID" : undefined,
        secondaryHidden: !secondaryBtn,
      });
      if (lastDebugId) setDebug(lastDebugId);
      break;

    default:
      uiState = "logged_out";
      render();
  }
}

// ---- Storage helpers ----
// (getApiKey and clearApiKey are now defined at top of file)

// ---- Navigation ----
// No chrome.tabs.create() -> avoids "tabs" permission concerns.
function openUrl(url) {
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    // fallback
    location.href = url;
  }
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

// ---- Deal-page allowlist: only these domains can be captured ----
const DEAL_PAGE_HOSTS = [
  "bizbuysell.com",
  "www.bizbuysell.com",
  "bizquest.com",
  "www.bizquest.com",
  "loopnet.com",
  "www.loopnet.com",
  "dealstream.com",
  "www.dealstream.com",
  "axial.net",
  "www.axial.net",
  "sunbeltnetwork.com",
  "www.sunbeltnetwork.com",
  "businessbroker.net",
  "www.businessbroker.net",
  "mergersandacquisitions.com",
  "www.mergersandacquisitions.com",
];

function isDealPageUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return DEAL_PAGE_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

// ---- Capture ----
function getActiveTabId() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab || !tab.id) return reject(new Error("No active tab"));
      resolve(tab.id);
    });
  });
}

function getActiveTabUrl() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab || !tab.url) return reject(new Error("No active tab"));
      resolve(tab.url);
    });
  });
}

async function readActiveTabPayload() {
  const tabId = await getActiveTabId();

  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          const url = window.location.href;
          const title = document.title || "";
          const pageText = document.body?.innerText || "";
          return { url, title, pageText: pageText.slice(0, 20000) };
        },
      },
      (results) => {
        const r = results?.[0]?.result;
        if (!r) return reject(new Error("Could not read page content"));

        const { url, title, pageText } = r;
        if (!pageText || !pageText.trim()) return reject(new Error("No text found on page"));

        resolve({ url, title, text: pageText });
      }
    );
  });
}

// ---- API wrapper ----
async function apiCaptureDeal(payload, apiKey) {
  const debugId = makeDebugId();
  console.group("🌐 SearchFindr Extension - API Request");
  console.log("Debug ID:", debugId);
  console.log("Endpoint:", API_URL);
  console.log("Method: POST");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const startTime = Date.now();
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const duration = Date.now() - startTime;
    const bodyText = await res.text();
    let json = null;
    try {
      json = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // non-json response is allowed; we handle it below
    }

    console.log("Response status:", res.status, res.statusText);
    console.log("Response time:", duration, "ms");
    console.log("Response OK:", res.ok);
    if (json) {
      console.log("Response body:", json);
    } else {
      console.log("Response body (text):", bodyText?.substring(0, 200));
    }

    if (res.status === 401) {
      console.warn("⚠️ API key invalid or expired (401)");
      console.groupEnd();
      return { kind: "expired", debugId };
    }
    if (res.status === 403) {
      console.warn("⚠️ Forbidden (403) — often origin/CORS; do not clear key");
      console.groupEnd();
      return { kind: "forbidden", debugId, error: json?.error || "Request forbidden" };
    }
    if (res.status === 400 || res.status === 422) {
      console.error("❌ Bad request (400/422)");
      console.groupEnd();
      return { kind: "bad_request", debugId };
    }
    if (!res.ok) {
      console.error("❌ Request failed:", res.status);
      console.groupEnd();
      return { kind: "retryable", debugId };
    }

    if (!json || json.success !== true) {
      console.error("❌ Invalid response format or success !== true");
      console.groupEnd();
      return { kind: "retryable", debugId };
    }

    console.log("✅ Request successful");
    console.groupEnd();
    return { kind: "ok", debugId, json };
  } catch (err) {
    console.error("❌ Network error:", err.name, err.message);
    if (err.name === "AbortError") {
      console.error("Request timeout after 15 seconds");
    }
    console.groupEnd();
    return { kind: "retryable", debugId };
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Actions ----
async function ensureStateFromApiKey() {
  console.group("🔐 SearchFindr Extension - Auth Check");
  try {
    const apiKey = await getApiKey();
    console.log("API key found:", !!apiKey);
    
    // If no API key, user is logged out
    if (!apiKey) {
      if (uiState !== "logged_out") {
        console.log(`State changed: ${uiState} -> logged_out`);
        uiState = "logged_out";
        render();
      } else {
        console.log("Already logged out");
      }
      console.groupEnd();
      return;
    }
    
    // Validate format
    if (!validateApiKeyFormat(apiKey)) {
      console.warn("⚠️ Invalid API key format, clearing");
      await clearApiKey();
      if (uiState !== "expired") {
        console.log(`State changed: ${uiState} -> expired`);
        uiState = "expired";
        render();
      }
      console.groupEnd();
      return;
    }
    
    // Verify API key with server (only clear stored key on explicit 401; keep key on 429/500/network errors)
    console.log("Verifying API key with server...");
    const verification = await verifyApiKey(apiKey);
    
    if (!verification.valid) {
      console.warn("⚠️ API key verification failed:", verification.error, "isUnauthorized:", verification.isUnauthorized);
      if (verification.isUnauthorized) {
        await clearApiKey();
        if (uiState !== "expired") {
          console.log(`State changed: ${uiState} -> expired`);
          uiState = "expired";
          render();
        }
      } else {
        // Transient failure (429, 500, network): keep key and stay ready so capture still works
        console.log("Keeping key; transient failure, not clearing.");
        if (uiState !== "ready") {
          uiState = "ready";
          render();
        }
      }
      console.groupEnd();
      return;
    }
    
    // API key is valid
    if (uiState !== "ready") {
      console.log(`✅ State changed: ${uiState} -> ready`);
      console.log("User ID:", verification.user_id);
      uiState = "ready";
      render();
    } else {
      console.log("✅ Already in ready state");
    }
  } catch (error) {
    console.error("❌ Error checking API key state:", error);
    // Fallback to logged_out if there's an error
    if (uiState !== "logged_out") {
      uiState = "logged_out";
      render();
    }
  }
  console.groupEnd();
}

async function doCapture() {
  console.group("📥 SearchFindr Extension - Capture Deal");
  console.log("Capture button clicked at:", new Date().toLocaleString());
  
  setDebug(null);
  uiState = "loading";
  render();

  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn("⚠️ No API key found in storage, switching to logged_out state. Check chrome.storage.local in DevTools.");
    uiState = "logged_out";
    render();
    console.groupEnd();
    return;
  }
  
  if (!validateApiKeyFormat(apiKey)) {
    console.warn("⚠️ Invalid API key format, clearing and showing expired state");
    await clearApiKey();
    uiState = "expired";
    render();
    console.groupEnd();
    return;
  }

  // Only allow capture on deal/listing pages
  let currentUrl;
  try {
    currentUrl = await getActiveTabUrl();
  } catch {
    uiState = "error";
    setStatus("Could not read current tab. Please try again.", true);
    setDebug(makeDebugId());
    render();
    console.groupEnd();
    return;
  }
  if (!isDealPageUrl(currentUrl)) {
    uiState = "error";
    setStatus("Capture is only allowed on listing pages (e.g. BizBuySell, LoopNet). Open a deal listing and try again.", true);
    setDebug(makeDebugId());
    render();
    console.groupEnd();
    return;
  }

  let payload;
  try {
    payload = await readActiveTabPayload();
  } catch {
    uiState = "error";
    setStatus("We couldn’t read this page. Please try a different listing page.", true);
    setDebug(makeDebugId());
    render();
    return;
  }

  const result = await apiCaptureDeal(payload, apiKey);

  if (result.kind === "ok") {
    console.log("✅ API Response: Success");
    console.log("Response data:", result.json);
    // API returns dealUrl in the response
    const dealUrl = result.json?.dealUrl || null;
    lastDealUrl = typeof dealUrl === "string" && dealUrl.trim() ? dealUrl.trim() : null;
    console.log("Deal URL:", lastDealUrl || "Not provided");

    uiState = "success";
    render();
    console.groupEnd();
    return;
  }

  if (result.kind === "expired") {
    console.warn("⚠️ API key invalid or expired (401)");
    await clearApiKey();
    uiState = "expired";
    render();
    console.groupEnd();
    return;
  }

  if (result.kind === "forbidden") {
    uiState = "error";
    setDebug(result.debugId);
    setStatus(result.error || "Request was forbidden. Try again or check your connection.", true);
    render();
    console.groupEnd();
    return;
  }

  if (result.kind === "bad_request") {
    uiState = "error";
    setDebug(result.debugId);
    setStatus(
      "This listing couldn’t be saved. Please try a different page or contact support.",
      true
    );
    render();
    return;
  }

  uiState = "error";
  setDebug(result.debugId);
  setStatus("We couldn’t save this listing. Please try again.", true);
  render();
}

async function doDisconnect() {
  await clearApiKey();
  lastDealUrl = null;
  lastDebugId = null;
  uiState = "logged_out";
  render();
}

function normalizeApiKey(input) {
  if (!input || typeof input !== "string") return "";
  return input.trim().replace(/\s+/g, "");
}

async function doSaveApiKey() {
  const rawInput = apiKeyInput?.value ?? "";
  const apiKey = normalizeApiKey(rawInput);

  if (!apiKey) {
    setStatus("Please enter an API key", true);
    return;
  }

  if (!validateApiKeyFormat(apiKey)) {
    setStatus("Invalid format. Use the full key from Settings (40 chars, starts with sf_live_ or sf_test_).", true);
    return;
  }

  uiState = "loading";
  setStatus("Verifying API key...");
  render();

  console.group("🔐 SearchFindr Extension - Verifying API Key");
  console.log("Verifying API key format and with server...");

  const verification = await verifyApiKey(apiKey);
  
  if (!verification.valid) {
    console.error("❌ API key verification failed:", verification.error);
    uiState = "expired";
    const hint = " Copy the full key from Settings (show key once after generating); no extra spaces.";
    setStatus((verification.error || "Invalid API key.") + hint, true);
    render();
    console.groupEnd();
    return;
  }

  console.log("✅ API key verified successfully");
  console.log("User ID:", verification.user_id);
  console.groupEnd();

  // Save API key (persists in chrome.storage.local)
  await saveApiKey(apiKey);
  const readBack = await getApiKey();
  console.log("API key after save - present:", !!readBack, "length:", readBack ? readBack.length : 0);

  // Clear input
  if (apiKeyInput) {
    apiKeyInput.value = "";
  }

  uiState = "ready";
  setStatus("API key saved! Ready to capture listings.");
  render();
}

// ---- Button wiring ----
function bindButtons() {
  if (primaryBtn) {
    primaryBtn.addEventListener("click", async () => {
      if (uiState === "logged_out" || uiState === "expired") {
        await doSaveApiKey();
        return;
      }
      if (uiState === "ready") {
        await doCapture();
        return;
      }
      if (uiState === "error") {
        await doCapture();
        return;
      }
      if (uiState === "success") {
        openUrl(lastDealUrl || APP_HOME_URL);
        return;
      }
    });
  }

  if (secondaryBtn) {
    secondaryBtn.addEventListener("click", async () => {
      if (uiState === "logged_out" || uiState === "expired") {
        openUrl(SETTINGS_URL);
        return;
      }
      if (uiState === "ready") {
        await doDisconnect();
        return;
      }
      if (uiState === "success") {
        uiState = "ready";
        render();
        return;
      }
      if (uiState === "error") {
        if (lastDebugId) copyToClipboard(lastDebugId);
        return;
      }
    });
  }

  // Allow Enter key to save API key
  if (apiKeyInput) {
    apiKeyInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && (uiState === "logged_out" || uiState === "expired")) {
        e.preventDefault();
        await doSaveApiKey();
      }
    });
  }

  if (copyDebugBtn) {
    copyDebugBtn.addEventListener("click", () => {
      if (lastDebugId) copyToClipboard(lastDebugId);
    });
  }
}

// ---- Init ----
console.group("🚀 SearchFindr Extension - Popup Initialized");
console.log("Popup opened at:", new Date().toLocaleString());
console.log("Environment:", ENV);
console.log("Base URL:", BASE_URL);
console.log("API URL:", API_URL);

// Render initial state immediately (before async check)
uiState = "logged_out";
render();
bindButtons();

// Log initial debug info
logDebugInfo().catch(err => {
  console.error("Failed to log debug info:", err);
});

// Then check for API key and current tab URL
async function initState() {
  await ensureStateFromApiKey();
  try {
    const url = await getActiveTabUrl();
    window._currentTabIsDealPage = isDealPageUrl(url);
    if (uiState === "ready") render();
  } catch {
    window._currentTabIsDealPage = false;
    if (uiState === "ready") render();
  }
}
initState().catch(err => {
  console.error("❌ Initial state check failed:", err);
});

console.groupEnd();

// Listen for storage changes (when API key is saved or removed)
// When key is *set* we just go to ready without re-verifying (avoids double-verify and clearing on 429/network).
// When key is *removed* we go to logged_out.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[API_KEY_STORAGE_KEY]) return;
  const change = changes[API_KEY_STORAGE_KEY];
  const newVal = change.newValue;
  console.log("💾 API key storage changed in local. Key present:", !!newVal);
  if (newVal && typeof newVal === "string" && newVal.trim()) {
    // Key was saved/updated — trust it and show ready (no re-verify here to avoid clearing on transient failures)
    if (validateApiKeyFormat(newVal)) {
      uiState = "ready";
      render();
    } else {
      ensureStateFromApiKey().catch(err => console.error("❌ API key state refresh failed:", err));
    }
  } else {
    // Key was removed
    uiState = "logged_out";
    render();
  }
});

// Periodic check when popup is open (in case storage listener misses it)
let checkInterval = null;
function startPeriodicCheck() {
  if (checkInterval) return;
  
  checkInterval = setInterval(async () => {
    try {
      const apiKey = await getApiKey();
      if (apiKey) {
        if (uiState === "logged_out") {
          await ensureStateFromApiKey();
        } else if (!validateApiKeyFormat(apiKey)) {
          await ensureStateFromApiKey();
        } else if (uiState === "ready") {
          try {
            const url = await getActiveTabUrl();
            const isDeal = isDealPageUrl(url);
            if (window._currentTabIsDealPage !== isDeal) {
              window._currentTabIsDealPage = isDeal;
              render();
            }
          } catch {}
        }
      } else if (uiState !== "logged_out" && uiState !== "expired") {
        await ensureStateFromApiKey();
      }
    } catch (err) {
      console.error("[SearchFindr] Periodic check error:", err);
    }
  }, 1500);
}

// Start checking after initial render
setTimeout(startPeriodicCheck, 200);
