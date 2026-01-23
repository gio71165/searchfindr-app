// background.js - Minimal background script for Manifest V2 compatibility
// This extension primarily uses popup.js, but MV2 requires a background script

console.log("SearchFindr background script loaded (MV2 compatibility)");

// Minimal background script - most functionality is in popup.js
// This is only needed for Manifest V2 compatibility

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("SearchFindr extension installed/updated:", details.reason);
});

// Keep service worker alive (not needed for MV2, but good practice)
// MV2 uses persistent background pages, so this is just for logging
