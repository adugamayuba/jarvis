# Jarvis Chrome Extension — Reelin AI Auto-Apply

A Chrome extension that acts as a sidebar on any website, auto-fills accelerator application forms using Reelin AI's profile powered by Jarvis AI.

## Install (Developer Mode)

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **"Load unpacked"**
4. Select this `chrome-extension/` folder
5. The Jarvis icon appears in your Chrome toolbar

## Usage

1. **Click the Jarvis icon** in your toolbar
2. Enter your Jarvis password (same as dashboard login)
3. Set your backend URL (your Railway URL, e.g. `https://jarvis-production-42ed.up.railway.app`)
4. Navigate to any accelerator application page (YC, Techstars, 500 Global, etc.)
5. A **"JARVIS"** tab appears on the right edge of every page → click it
6. Or click the extension icon → **"Scan & Auto-Fill"**
7. Jarvis scans the form, sends fields to AI, fills in Reelin AI's answers
8. Review the filled values in the sidebar
9. Click **"Fill Form"** to apply values to the actual page
10. Submit manually or let Jarvis click submit

## Files

```
chrome-extension/
├── manifest.json       # Extension config (Manifest V3)
├── background.js       # Service worker — handles API calls to Jarvis backend
├── content.js          # Runs on every page — sidebar + form detection + filling
├── popup/
│   ├── popup.html      # Extension popup UI
│   └── popup.js        # Popup logic (login, settings)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Backend Requirement

The extension connects to your Jarvis Railway backend. Make sure:
- Railway is deployed and running
- You have `OPENAI_API_KEY` set in Railway environment variables
- Your backend URL is set in the extension popup settings
