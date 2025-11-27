// popup.js — ultra simple debug version
console.log("Popup script VDEBUG loaded");

const API_URL = "http://localhost:3000/api/capture-deal";

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

    // 2) Execute a script in the page to grab URL, title, and body text
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          const url = window.location.href;
          const title = document.title || "";
          const bodyText = document.body.innerText || "";
          return {
            url,
            title,
            bodyText: bodyText.slice(0, 20000),
          };
        },
      },
      (results) => {
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

        // 3) Send to your Next.js API
        fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, title, text: bodyText }),
          credentials: "include", // send Supabase cookies
        })
          .then((res) => {
            return res.text().then((body) => {
              console.log("RAW API RESPONSE:", body);
              console.log("STATUS:", res.status, "OK?", res.ok);
              if (!res.ok) {
                setStatus("API error (see console).", true);
              } else {
                setStatus("Request sent successfully ✓");
              }
            });
          })
          .catch((err) => {
            console.error("Extension fetch error:", err);
            setStatus("Unexpected error.", true);
          });
      }
    );
  });
}

if (sendButton) {
  sendButton.addEventListener("click", handleClick);
}
