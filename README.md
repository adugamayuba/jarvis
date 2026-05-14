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

| Service | Where to get it |
|---------|----------------|
| Apify | [console.apify.com](https://console.apify.com/account/integrations) |
| Resend | [resend.com/api-keys](https://resend.com/api-keys) |

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
