# Jarvis Chrome Extension

A Chrome extension with a sidebar on any website — auto-fill accelerator forms and find team member emails, powered by Jarvis AI.

## Install (Developer Mode)

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **"Load unpacked"**
4. Select this `chrome-extension/` folder
5. The Jarvis icon appears in your Chrome toolbar

## Usage

### Fill Forms
1. Click the Jarvis icon → sign in with your dashboard password
2. Navigate to an accelerator application page
3. Click the **JARVIS** tab on the right edge → **Fill Form** mode
4. Click **Scan Again** → Jarvis maps fields and fills Reelin AI's answers
5. Click **Fill Form** to apply values to the page

### Find Emails
1. Navigate to a team page (e.g. CRV Ventures team page)
2. Open the Jarvis sidebar → switch to **Find Emails** tab
3. Click **Scan Page** — Jarvis detects all people on the page
4. For each person, it searches Google for their work email (e.g. `"Jane Foster" CRV Ventures email`)
5. Copy individual emails or click **Copy All Emails**

Or use the popup button **Find Emails on Page** for a one-click scan.

## Backend Requirement

- Railway deployed with `OPENAI_API_KEY` and `APIFY_API_TOKEN` set
- Backend URL configured in extension popup settings
