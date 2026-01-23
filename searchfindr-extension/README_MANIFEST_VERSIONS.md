# Manifest V2/V3 Compatibility

## Quick Start

### Current Setup (MV3)
- Active manifest: `manifest.json` (MV3)
- Storage: Automatically uses `chrome.storage.session` if available, falls back to `chrome.storage.local`

### To Test MV2
1. Copy `manifest_v2.json` to `manifest.json`
2. Reload extension in `chrome://extensions`
3. Test API key entry and capture flow
4. Check console: Should see `📦 Using storage: local`

### To Switch Back to MV3
1. Copy `manifest_v3.json` to `manifest.json`
2. Reload extension
3. Check console: Should see `📦 Using storage: session`

## What Changed

### Files Created
- ✅ `manifest_v3.json` - MV3 version (backup of current)
- ✅ `manifest_v2.json` - MV2 version (fallback)
- ✅ `background.js` - Minimal background script for MV2
- ✅ `MANIFEST_SWITCHING_GUIDE.md` - Detailed switching guide

### Files Updated
- ✅ `popup.js` - Now uses fallback: `chrome.storage.session || chrome.storage.local` for API key storage

## Automatic Fallback

Both scripts now automatically detect and use the best available storage:

```javascript
// Automatically falls back to local if session not available
const SESSION_STORAGE = chrome.storage.session || chrome.storage.local;
const STORAGE_TYPE = chrome.storage.session ? "session" : "local";
```

**Benefits:**
- Works in both MV2 and MV3
- Works even if session storage isn't available in MV3
- No code changes needed when switching manifests
- Console clearly shows which storage is being used

## Testing

### Verify Storage Type
Open browser console and look for:
```
📦 Using storage: session  (MV3 with session available)
📦 Using storage: local    (MV2 or MV3 fallback)
```

### Verify API Key Save
After entering API key, check console for:
```
✅ API key saved successfully to chrome.storage.session
✅ API key saved successfully to chrome.storage.local
```

## Differences

| Feature | MV2 | MV3 |
|---------|-----|-----|
| Storage | `chrome.storage.local` | `chrome.storage.session` (preferred) |
| Action | `browser_action` | `action` |
| Background | Persistent page | Service worker |
| Permissions | Single array | Separated arrays |
| Chrome Version | Works in older versions | Requires Chrome 88+ |

## Troubleshooting

**If API key save fails in MV3:**
- Try switching to MV2 manifest
- If MV2 works, the issue is likely session storage availability
- Check Chrome version (need 102+ for session storage)

**If API key save fails in both:**
- Check console for detailed error messages
- Verify "storage" permission in manifest
- Check API key size (should be < 10MB)
