# Jarvis — AI Outreach Dashboard

Scrape leads from Crunchbase, find their emails, and send personalized campaigns at scale.

## Stack

| Layer | Tech | Host |
|-------|------|------|
| Frontend | Next.js 14 (App Router) + Tailwind + shadcn/ui | Vercel |
| Backend | Express + TypeScript | Railway |
| Database | Firebase Firestore | Firebase |
| Scraping | Apify API | Cloud |
| Email | Resend API | Cloud |

---

## Features

- **Scraper** — Paste any Crunchbase list/profile URL → Apify extracts contacts + emails
- **Contacts** — View, filter, search, export CSV, bulk-delete
- **Campaigns** — Write a template with `{{firstName}}`, `{{company}}` variables → send to selected contacts via Resend
- **Dashboard** — Stats overview + recent scrape jobs

---

## Local Development

### 1. Clone & install

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill in your keys

# Frontend
cd ../frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 2. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) → New project
2. Enable **Firestore** (Native mode)
3. Go to Project Settings → Service Accounts → Generate new private key
4. Copy `project_id`, `private_key`, `client_email` → paste into `backend/.env`

### 3. Get API keys

| Service | Where to get it | Notes |
|---------|----------------|-------|
| Apify | [console.apify.com](https://console.apify.com/account/integrations) | **Paid plan required** for LinkedIn scraping (free tier limits to 10 runs) |
| Gmail OAuth2 | See below | Free |
| Apollo.io | [apollo.io](https://app.apollo.io/#/settings/integrations/api) | **Paid plan required** for email enrichment (Basic $49/mo minimum) |
| Hunter.io | [hunter.io](https://hunter.io/api) | Free tier available (25 searches/month) |

### 4. Set up Gmail OAuth2 (one-time)

Emails are sent directly from your Gmail account using Google's API.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the **Gmail API**: APIs & Services → Library → search "Gmail API" → Enable
4. Create credentials: APIs & Services → Credentials → Create Credentials → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorised redirect URIs: add `https://developers.google.com/oauthplayground`
5. Copy your **Client ID** and **Client Secret**
6. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Click the gear icon → check **Use your own OAuth credentials** → paste Client ID + Secret
   - In Step 1, find and select `https://mail.google.com/`
   - Click **Authorize APIs** → sign in with your Gmail account
   - In Step 2, click **Exchange authorization code for tokens**
   - Copy the **Refresh token**
7. Add to `backend/.env`:
   ```
   GMAIL_CLIENT_ID=xxxx.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=GOCSPX-xxxx
   GMAIL_REFRESH_TOKEN=1//xxxx
   ```

### 4. Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Important: API Requirements

Before deploying, ensure you have:
- ✅ **Apify Paid Plan** ($49+/mo) — Free tier limits to 10 actor runs, blocking LinkedIn scraping
- ✅ **Apollo.io Basic Plan** ($49/mo) — Required for email enrichment via `people/match` endpoint
- ✅ **Gmail OAuth2** (free) — For sending emails
- ⚠️ **Hunter.io** (optional) — Free tier works but limited to 25 searches/month

### Backend → Railway

1. Push `backend/` to GitHub
2. Create new Railway project → deploy from GitHub
3. Add all env vars from `backend/.env.example`
4. Railway auto-detects `railway.toml` config

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add env var: `NEXT_PUBLIC_API_URL` = your Railway URL

---

## Email Template Variables

Use these in subject and body:

| Variable | Description |
|----------|-------------|
| `{{name}}` | Full name |
| `{{firstName}}` | First name only |
| `{{company}}` | Company name |
| `{{title}}` | Job title |

---

## API Reference

### Scraping
- `POST /api/scrape` — `{ url, source }` → starts job, returns `jobId`
- `GET /api/scrape/:jobId` — poll job status

### Contacts
- `GET /api/contacts` — list contacts
- `POST /api/contacts` — create contact
- `PATCH /api/contacts/:id` — update
- `DELETE /api/contacts/:id` — delete

### Email
- `POST /api/email/send` — send single email
- `POST /api/email/campaigns` — create + send campaign
- `GET /api/email/campaigns` — list campaigns
