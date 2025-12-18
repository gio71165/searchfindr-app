// popup.js — multi-user with Supabase Bearer token (no API key)
console.log("SearchFindr popup v12 loaded");

// 🔥 Your LIVE API endpoint
const API_URL = "https://searchfindr-app.vercel.app/api/capture-deal";

const sendButton = document.getElementById("sendButton");
const statusEl = document.getElementById("status");

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#f87171" : "#9ca3af";
}

function handleClick() {
  setStatus("Reading page…");

  // 1) Get active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    if (!tab || !tab.id) {
      setStatus("No active tab found.", true);
      return;
    }

    // 2) Execute script in the page to grab URL, title, and body text
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          const url = window.location.href;
          const title = document.title || "";
          const pageText = document.body.innerText || "";
          return {
            url,
            title,
            pageText: pageText.slice(0, 20000), // limit size
          };
        },
      },
      (results) => {
        if (!results || !results[0] || !results[0].result) {
          setStatus("Could not read page content.", true);
          return;
        }

        const { url, title, pageText } = results[0].result;

        if (!pageText || pageText.trim().length === 0) {
          setStatus("No text found on page.", true);
          return;
        }

        setStatus("Sending to SearchFindr…");

        // 3) Load token from chrome.storage and send Authorization header
        chrome.storage.sync.get(["sf_access_token"], ({ sf_access_token }) => {
          if (!sf_access_token) {
            setStatus("Not logged in. Go to SearchFindr → /extension/callback", true);
            return;
          }

          fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sf_access_token}`,
            },
            body: JSON.stringify({ url, title, text: pageText }),
          })
            .then((res) => {
              return res.text().then((body) => {
                console.log("RAW API RESPONSE:", body);
                console.log("STATUS:", res.status, "OK?", res.ok);

                if (!res.ok) {
                  setStatus("API error (see console).", true);
                } else {
                  setStatus("Deal saved to SearchFindr ✓");
                }
              });
            })
            .catch((err) => {
              console.error("Extension fetch error:", err);
              setStatus("Unexpected error.", true);
            });
        });
      }
    );
  });
}

if (sendButton) {
  sendButton.addEventListener("click", handleClick);
}
