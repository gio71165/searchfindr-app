// popup.js — SearchFindr Extension UX v15 (MV3, no "tabs" permission required)
// - No chrome.tabs.create()
// - Uses window.open for navigation
// - Uses chrome.tabs.query ONLY to get active tab id (works with activeTab + user gesture)
// - Injects script via chrome.scripting.executeScript to read URL/title/text

console.log("SearchFindr popup v15 loaded");

// 🔥 Your LIVE API endpoint
const API_URL = "https://searchfindr-app.vercel.app/api/capture-deal";

// 🔐 Login / connect entry point
const LOGIN_URL = "https://searchfindr-app.vercel.app/?next=/extension/callback";

// Optional
const LEARN_MORE_URL = "https://searchfindr-app.vercel.app/extension/help";
const APP_HOME_URL = "https://searchfindr-app.vercel.app/dashboard";

// Storage key
const TOKEN_KEY = "searchfindr_auth_token";
const SESSION_STORAGE = chrome.storage.session;

function encodeToken(token) {
  return btoa(token + "::" + Date.now());
}

function decodeToken(encoded) {
  try {
    const decoded = atob(encoded);
    const [token] = decoded.split("::");
    return token;
  } catch {
    return null;
  }
}

async function saveToken(token) {
  await SESSION_STORAGE.set({ [TOKEN_KEY]: encodeToken(token) });
}

async function getToken() {
  const result = await SESSION_STORAGE.get(TOKEN_KEY);
  return result[TOKEN_KEY] ? decodeToken(result[TOKEN_KEY]) : null;
}

async function clearToken() {
  await SESSION_STORAGE.remove(TOKEN_KEY);
}

// ---- DOM ----
const statusEl = document.getElementById("status");
const titleEl = document.getElementById("title"); // optional
const primaryBtn =
  document.getElementById("primaryButton") || document.getElementById("sendButton");
const secondaryBtn = document.getElementById("secondaryButton"); // optional

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

  switch (uiState) {
    case "logged_out":
      setTitle("Not connected");
      setStatus("Please log in to SearchFindr to use this extension.");
      setButtons({
        primaryText: "Log in",
        primaryDisabled: false,
        secondaryText: "Learn more",
        secondaryHidden: !secondaryBtn,
      });
      break;

    case "expired":
      setTitle("Session expired");
      setStatus("Your SearchFindr session expired. Please log in again.", true);
      setButtons({
        primaryText: "Log in again",
        primaryDisabled: false,
        secondaryHidden: true,
      });
      break;

    case "ready":
      setTitle("Connected");
      setStatus("Ready to capture this listing.");
      setButtons({
        primaryText: "Capture / Save to SearchFindr",
        primaryDisabled: false,
        secondaryText: "Disconnect",
        secondaryHidden: !secondaryBtn,
      });
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
// (getToken and clearToken are now defined at top of file)

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

// ---- Capture ----
function getActiveTabId() {
  return new Promise((resolve, reject) => {
    // With MV3, this typically works under user gesture with "activeTab".
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab || !tab.id) return reject(new Error("No active tab"));
      resolve(tab.id);
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
async function apiCaptureDeal(payload, token) {
  const debugId = makeDebugId();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const bodyText = await res.text();
    let json = null;
    try {
      json = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // non-json response is allowed; we handle it below
    }

    // Dev logs
    console.error("[SearchFindr EXT] capture-deal response", {
      debugId,
      status: res.status,
      ok: res.ok,
      bodyText,
    });

    if (res.status === 401 || res.status === 403) return { kind: "expired", debugId };
    if (res.status === 400 || res.status === 422) return { kind: "bad_request", debugId };
    if (!res.ok) return { kind: "retryable", debugId };

    if (!json || json.success !== true) return { kind: "retryable", debugId };

    return { kind: "ok", debugId, json };
  } catch (err) {
    console.error("[SearchFindr EXT] capture-deal fetch failed", { debugId, err });
    return { kind: "retryable", debugId };
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Actions ----
async function ensureStateFromToken() {
  const token = await getToken();
  uiState = token ? "ready" : "logged_out";
  render();
}

async function doCapture() {
  setDebug(null);
  uiState = "loading";
  render();

  const token = await getToken();
  if (!token) {
    uiState = "logged_out";
    render();
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

  const result = await apiCaptureDeal(payload, token);

  if (result.kind === "ok") {
    const dealUrl = result.json?.dealUrl || result.json?.url || null;
    lastDealUrl = typeof dealUrl === "string" ? dealUrl : null;

    uiState = "success";
    render();
    return;
  }

  if (result.kind === "expired") {
    await clearToken();
    uiState = "expired";
    render();
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
  await clearToken();
  lastDealUrl = null;
  lastDebugId = null;
  uiState = "logged_out";
  render();
}

// ---- Button wiring ----
function bindButtons() {
  if (primaryBtn) {
    primaryBtn.addEventListener("click", async () => {
      if (uiState === "logged_out" || uiState === "expired") {
        openUrl(LOGIN_URL);
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
      if (uiState === "logged_out") {
        openUrl(LEARN_MORE_URL);
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

  if (copyDebugBtn) {
    copyDebugBtn.addEventListener("click", () => {
      if (lastDebugId) copyToClipboard(lastDebugId);
    });
  }
}

// ---- Init ----
bindButtons();
ensureStateFromToken();
