// popup.js

const API_URL = "http://localhost:3000/api/analyze-text"; // your dev API endpoint

const sendButton = document.getElementById("sendButton");
const statusEl = document.getElementById("status");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#f87171" : "#9ca3af";
}

sendButton.addEventListener("click", async () => {
  setStatus("Reading page…");

  try {
    // 1) Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      setStatus("No active tab found.", true);
      return;
    }

    // 2) Run script inside the page → get URL + text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const url = window.location.href;
        const text = document.body.innerText || "";
        return {
          url,
          text: text.slice(0, 20000) // limit size
        };
      }
    });

    const { url, text } = results[0].result;

    setStatus("Sending to SearchFindr…");

    // 3) Send to your Next.js API
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, text })
    });

    const json = await res.json();
    console.log("SearchFindr response:", json);

    if (!res.ok) {
      setStatus(json.error || "API error.", true);
      return;
    }

    setStatus("Sent to SearchFindr ✓");

  } catch (err) {
    console.error("Extension error:", err);
    setStatus("Unexpected error.", true);
  }
});
