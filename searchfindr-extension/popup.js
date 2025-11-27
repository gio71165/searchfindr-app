// popup.js — production version
console.log("SearchFindr popup loaded");

// 🔥 Your LIVE API endpoint
const API_URL = "https://searchfindr-app.vercel.app/api/capture-deal";

const sendButton = document.getElementById("sendButton");
const statusEl = document.getElementById("status");

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#f87171" : "#9ca3af";
}

async function handleClick() {
  setStatus("Reading page…");

  try {
    // 1) Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      setStatus("No active tab found.", true);
      return;
    }

    // 2) Extract URL + title + body text from the page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const url = window.location.href;
        const title = document.title || "";
        const bodyText = document.body.innerText || "";
        return {
          url,
          title,
          bodyText: bodyText.slice(0, 20000), // limit size
        };
      },
    });

    if (!results || !results[0] || !results[0].result) {
      setStatus("Could not read page content.", true);
      return;
    }

    const { url, title, bodyText } = results[0].result;

    if (!bodyText || bodyText.trim().length === 0) {
      setStatus("No text found on page.", true);
      return;
    }

    setStatus("Sending to SearchFindr…");

    // 3) Send to your live API (no cookies needed)
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, title, text: bodyText }),
    });

    const rawResponse = await res.text();
    console.log("RAW API RESPONSE:", rawResponse);
    console.log("STATUS:", res.status, "OK?", res.ok);

    if (!res.ok) {
      setStatus("API error (see console).", true);
      return;
    }

    setStatus("Deal saved to SearchFindr ✓");
  } catch (err) {
    console.error("Extension error:", err);
    setStatus("Unexpected error.", true);
  }
}

if (sendButton) {
  sendButton.addEventListener("click", handleClick);
}
