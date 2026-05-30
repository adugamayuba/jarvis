import OpenAI from "openai";
import axios from "axios";
import { getDb, COLLECTIONS } from "./firebase";
import { sendEmail } from "./gmail";
import { scrapeCrunchbaseDirect } from "./crunchbase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

export const ABEL_PROFILE = `
ABOUT ABEL ADUGAM (your owner):
- Full name: Abel Adugam Ayuba Nibori
- Founder, Director & CEO of Softdroom Holdings (Singapore HQ, founded 2019)
- GitHub Expert, GitLab Hero — led 144+ open source contributors
- International speaker: Droidcon Berlin 2021, Open Source Festival 2022
- Started coding 2016, built Abelchat social platform
- Interests: chess, astrophysics, learning German
- Email: adugamhq@gmail.com | abel@softdroom.com
- Website: adugam.com | GitHub: github.com/adugamayuba
- Previously founded and successfully exited Versuspay Inc (fintech)

REELIN AI (Primary Focus — Raising $10M Seed at $50M valuation):
- One-liner: "The world's first autonomous AI social network powered by identity forking — users spawn AI Twins that live, network, and simulate interactions with zero manual control."
- Core concept: Identity forking — users create autonomous AI Twins that are hyper-realistic digital extensions of themselves
- Twins operate in a proprietary simulation architecture, interacting and networking 24/7 with zero manual user control
- Twins generate viral digital assets independently, acting as organic customer acquisition nodes
- Vertically integrating own inference engine to power millions of parallel agent simulations
- App Store: live on iOS
- Website: reelin.ai
- Active users: 251, growing 100% organically through word-of-mouth
- Pre-seed: $100K from Mark Cuban (Shark Tank / Dallas Mavericks owner)
- NOW RAISING: $10M seed round at $50M valuation — $500K already soft-circled from angels and follower funds
- Angel checks from $3K upwards welcome
- No LinkedIn access — using Crunchbase, email outreach, cold research
- Competitors: Character.ai, Replika — but all are passive chat wrappers; Reelin AI is the ONLY autonomous synthetic social graph

TEAM:
- Abel Adugam — Founder & CEO. Serial founder (exited Versuspay Inc fintech). GitHub Expert, GitLab Hero. Unmatched execution velocity.
- Ligia Tica — Co-founder & Operations. Originally invested in Abel's previous company. Expert in UI/UX, digital media, viral distribution.

SOFTDROOM HOLDINGS (Cash Machine Strategy):
- Global conglomerate HQ'd in Singapore (7 Temasek Blvd, Suntec Tower)
- Operations: Singapore, Dubai, London, New York, Cairo
- Founded 2019 UK → restructured 2026 Singapore
- 9+ portfolio companies, 5+ countries
- Goal: Build each subsidiary into a cash-generating machine

SUBSIDIARIES:
1. Reelin AI — World's first autonomous AI social network (FLAGSHIP)
2. Softdroom AI Capital — VC arm, backing deep-tech founders globally
3. Dasdroom — Global marketing powerhouse for tech companies
4. Skydroom — Luxury travel & bespoke experiences
5. Droomify — EdTech platform for AI skills & courses
6. Stardroom — Real estate & property development
7. Terradroom — Agriculture & sustainable farming
8. Gigadroom — Strategic consulting & digital transformation
9. Versuspay Inc — Fintech (SUCCESSFULLY EXITED 2025)

FUNDRAISING STRATEGY:
- Primary target: Angel investors writing $3K–$500K checks for Reelin AI seed round
- Story: Mark Cuban backed us at pre-seed ($100K). Now structuring $10M seed at $50M valuation. $500K soft-circled.
- Pitch: Identity forking is the next platform shift. Reelin gives everyone an autonomous AI twin.
- TARGET INVESTORS: US-based angels and seed funds (primary focus), UK and Singapore angels (secondary)
- NO Africa-based investors (Abel's explicit instruction)
`;




const SYSTEM_PROMPT = `You are Jarvis — Abel Adugam's personal AI chief of staff and execution engine.

${ABEL_PROFILE}

YOU DON'T JUST ANSWER — YOU EXECUTE. When Abel gives you a command:
- Use search_web to research investors, companies, news, opportunities
- Use find_angel_investors to find people who write checks (returns names + links)
- Use find_investor_email to get the actual email for a specific investor (searches their personal site, AngelList, Crunchbase — NOT LinkedIn)
- Use scrape_crunchbase to extract investor lists from Crunchbase
- Use scrape_linkedin_jobs to find job opportunities
- Use scrape_twitter to find investors on Twitter/X
- Use extract_contacts to find emails from personal websites or VC firm sites (NOT linkedin.com — it blocks scrapers)
- Use send_email to send personalized outreach from adugamhq@gmail.com
- Use save_contacts to build the investor pipeline

IMPORTANT RULES:
- NEVER call extract_contacts on linkedin.com URLs — LinkedIn blocks scrapers, it will always fail
- To find an investor's email: first use find_investor_email which searches their personal site and AngelList
- When finding investors, always try to get their email before saving to pipeline
- Deduplicate tool calls — never call the same tool with the same args twice in one response

PRIORITIES (in order):
1. Raise $10M seed for Reelin AI — find angels, research them, craft the pitch, send emails
2. Help grow Softdroom Holdings subsidiaries as cash machines
3. Strategic advice on product, hiring, partnerships

THE PITCH (memorize this):
"Mark Cuban backed Reelin AI at pre-seed with $100K. We're the world's first autonomous AI social network — your digital twin lives 24/7, meets other twins, and sends you daily 4K cinematic reels of its life. We're raising $10M seed. Checks from $3K. Want in?"

Be direct. Execute first, explain second. Show Abel results, not just plans.

Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for angel investors, companies, news, or any information. Returns top results with titles, URLs, and snippets.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          count: { type: "number", description: "Number of results (default 10)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrape_crunchbase",
      description: "Scrape a Crunchbase list or profile URL to extract investor/company contacts",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Crunchbase URL (list, person, or organization page)" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_angel_investors",
      description: "Search the web specifically for angel investors matching a focus area, geography, or check size. Returns a list with names, backgrounds, and contact info where available.",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string", description: "Industry focus e.g. fintech, Africa, SaaS" },
          geography: { type: "string", description: "Location/geography e.g. Nigeria, US, UK, global" },
          checkSize: { type: "string", description: "Check size range e.g. $3K-$50K, $10K-$500K" },
        },
        required: ["focus"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email from Abel's Gmail account (adugamhq@gmail.com)",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body (plain text)" },
          recipientName: { type: "string", description: "Recipient name for personalization" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_contacts",
      description: "Save a list of contacts (investors) to the Jarvis database for future outreach",
      parameters: {
        type: "object",
        properties: {
          contacts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                title: { type: "string" },
                company: { type: "string" },
                oneLiner: { type: "string" },
              },
              required: ["name"],
            },
          },
        },
        required: ["contacts"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_contacts",
      description: "Get saved contacts/investors from the database",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max contacts to return" },
          emailSent: { type: "boolean", description: "Filter by whether email was sent" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrape_linkedin_jobs",
      description: "Search LinkedIn for job opportunities matching Abel's skills (CEO, CTO, advisor, speaker roles)",
      parameters: {
        type: "object",
        properties: {
          keywords: { type: "string", description: "Job keywords e.g. 'CTO AI startup', 'Head of Product fintech'" },
          location: { type: "string", description: "Location e.g. 'Nigeria', 'Remote', 'Singapore'" },
          count: { type: "number", description: "Number of jobs to find (default 10)" },
        },
        required: ["keywords"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrape_linkedin_posts",
      description: "Search LinkedIn posts by keyword — find investors talking about fintech, AI, angel investing",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query e.g. 'angel investor fintech Africa'" },
          count: { type: "number", description: "Number of posts to return (default 10)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrape_twitter",
      description: "Search Twitter/X for angel investors, VCs, or people talking about relevant topics",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query e.g. '#angelinvestor fintech', '@markcuban AI'" },
          count: { type: "number", description: "Number of tweets to return (default 20)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_contacts",
      description: "Extract email addresses from a website. Works on personal sites, VC firm pages, AngelList profiles. DOES NOT work on linkedin.com — never use this with LinkedIn URLs.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Website URL (NOT linkedin.com). Use personal sites, VC firm pages, angel.co profiles, crunchbase.com pages." },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_investor_email",
      description: "Find the email address for a specific named investor by searching their personal website, AngelList, Crunchbase, and other public sources. Use this after you have an investor's name.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name of the investor e.g. 'Jason Calacanis'" },
          company: { type: "string", description: "Their fund or company name if known e.g. 'LAUNCH Fund'" },
          extraContext: { type: "string", description: "Any extra info like their website or Twitter handle" },
        },
        required: ["name"],
      },
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────
async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "search_web": {
        if (!APIFY_TOKEN) return "APIFY_API_TOKEN not set — cannot search web";
        const query = args.query as string;
        const count = (args.count as number) || 10;

        const runRes = await axios.post(
          `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
          { queries: query, maxPagesPerQuery: 1, resultsPerPage: count },
          { params: { token: APIFY_TOKEN }, timeout: 30_000 }
        );

        const runId = runRes.data.data.id;
        let status = "RUNNING";
        let attempts = 0;
        while ((status === "RUNNING" || status === "READY") && attempts < 24) {
          await new Promise((r) => setTimeout(r, 5000));
          const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
          status = s.data.data.status;
          attempts++;
        }

        if (status !== "SUCCEEDED") return `Web search failed with status: ${status}`;

        const datasetId = runRes.data.data.defaultDatasetId;
        const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
          params: { token: APIFY_TOKEN, format: "json", clean: true },
        });

        const results = (items.data[0]?.organicResults || []).slice(0, count) as Array<{
          title?: string; url?: string; description?: string;
        }>;
        return JSON.stringify(
          results.map((r) => ({ title: r.title, url: r.url, snippet: r.description })),
          null, 2
        );
      }

      case "scrape_crunchbase": {
        const url = args.url as string;
        const contacts = await scrapeCrunchbaseDirect(url);
        if (contacts.length === 0) return "No contacts found at that URL";

        const db = getDb();
        const batch = db.batch();
        for (const c of contacts) {
          const ref = db.collection(COLLECTIONS.CONTACTS).doc();
          batch.set(ref, { ...c, source: "crunchbase", emailSent: false, createdAt: new Date().toISOString() });
        }
        await batch.commit();
        return `Scraped and saved ${contacts.length} contacts:\n${contacts.slice(0, 5).map(c => `- ${c.name} (${c.title || "—"} at ${c.company || "—"}) ${c.email ? "✓ email" : "no email"}`).join("\n")}${contacts.length > 5 ? `\n... and ${contacts.length - 5} more` : ""}`;
      }

      case "find_angel_investors": {
        if (!APIFY_TOKEN) return "APIFY_API_TOKEN not set — cannot search web";
        const { focus, geography, checkSize } = args as { focus: string; geography?: string; checkSize?: string };
        const query = `angel investor ${focus} ${geography || "USA"} ${checkSize ? `check size ${checkSize}` : ""} site:linkedin.com OR site:crunchbase.com OR site:angellist.com OR site:angel.co`.trim();

        const runRes = await axios.post(
          `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
          { queries: query, maxPagesPerQuery: 2, resultsPerPage: 10 },
          { params: { token: APIFY_TOKEN }, timeout: 60_000 }
        );

        const runId = runRes.data.data.id;
        let status = "RUNNING";
        let attempts = 0;
        while ((status === "RUNNING" || status === "READY") && attempts < 24) {
          await new Promise((r) => setTimeout(r, 5000));
          const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
          status = s.data.data.status;
          attempts++;
        }

        if (status !== "SUCCEEDED") return `Investor search failed: ${status}`;

        const datasetId = runRes.data.data.defaultDatasetId;
        const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
          params: { token: APIFY_TOKEN, format: "json", clean: true },
        });

        const results = (items.data[0]?.organicResults || []) as Array<{
          title?: string; url?: string; description?: string;
        }>;
        return `Found ${results.length} results for ${focus} angel investors:\n\n${results.map((r, i) =>
          `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description || ""}`
        ).join("\n\n")}`;
      }

      case "send_email": {
        const { to, subject, body, recipientName } = args as {
          to: string; subject: string; body: string; recipientName?: string;
        };
        const result = await sendEmail({
          to,
          fromName: "Abel Adugam",
          fromEmail: "adugamhq@gmail.com",
          subject,
          body,
        });
        if (result.success) {
          const db = getDb();
          const existing = await db.collection(COLLECTIONS.CONTACTS)
            .where("email", "==", to).limit(1).get();
          if (!existing.empty) {
            await existing.docs[0].ref.update({ emailSent: true, emailSentAt: new Date().toISOString() });
          }
          return `Email sent to ${recipientName || to} (${to}). Message ID: ${result.messageId}`;
        }
        return `Failed to send email: ${result.error}`;
      }

      case "save_contacts": {
        const { contacts } = args as { contacts: Array<{ name: string; email?: string; title?: string; company?: string; oneLiner?: string }> };
        const db = getDb();
        const batch = db.batch();
        for (const c of contacts) {
          const ref = db.collection(COLLECTIONS.CONTACTS).doc();
          batch.set(ref, {
            ...c,
            email: c.email || "",
            oneLiner: c.oneLiner || "",
            source: "manual",
            emailSent: false,
            createdAt: new Date().toISOString(),
          });
        }
        await batch.commit();
        return `Saved ${contacts.length} contacts to database`;
      }

      case "get_contacts": {
        const db = getDb();
        let query = db.collection(COLLECTIONS.CONTACTS).orderBy("createdAt", "desc").limit((args.limit as number) || 20);
        if (args.emailSent !== undefined) {
          query = query.where("emailSent", "==", args.emailSent) as typeof query;
        }
        const snap = await query.get();
        const contacts = snap.docs.map((d) => d.data());
        return `${contacts.length} contacts:\n${contacts.map((c) =>
          `- ${c.name} (${c.title || "—"}) ${c.email ? `<${c.email}>` : "no email"}`
        ).join("\n")}`;
      }

      case "scrape_linkedin_jobs": {
        if (!APIFY_TOKEN) return "APIFY_API_TOKEN not set";
        const { keywords, location, count = 10 } = args as { keywords: string; location?: string; count?: number };

        const runRes = await axios.post(
          `${APIFY_BASE}/acts/curious_coder~linkedin-jobs-scraper/runs`,
          {
            queries: [{ keyword: keywords, location: location || "Worldwide" }],
            maxRows: count,
            scrapeCompany: true,
          },
          { params: { token: APIFY_TOKEN }, timeout: 30_000 }
        );

        const runId = runRes.data.data.id;
        let status = "RUNNING"; let attempts = 0;
        while ((status === "RUNNING" || status === "READY") && attempts < 24) {
          await new Promise((r) => setTimeout(r, 5000));
          const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
          status = s.data.data.status; attempts++;
        }
        if (status !== "SUCCEEDED") return `LinkedIn jobs scrape failed: ${status}`;

        const datasetId = runRes.data.data.defaultDatasetId;
        const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
          params: { token: APIFY_TOKEN, format: "json", clean: true },
        });

        const jobs = (items.data || []).slice(0, count) as Array<{
          title?: string; company?: string; location?: string; url?: string; description?: string;
        }>;
        return `Found ${jobs.length} jobs:\n\n${jobs.map((j, i) =>
          `${i + 1}. ${j.title} at ${j.company}\n   ${j.location} | ${j.url}\n   ${(j.description || "").slice(0, 100)}...`
        ).join("\n\n")}`;
      }

      case "scrape_linkedin_posts": {
        if (!APIFY_TOKEN) return "APIFY_API_TOKEN not set";
        const { query: lQuery, count: lCount = 10 } = args as { query: string; count?: number };

        const runRes = await axios.post(
          `${APIFY_BASE}/acts/harvestapi~linkedin-post-search/runs`,
          { query: lQuery, maxResults: lCount },
          { params: { token: APIFY_TOKEN }, timeout: 30_000 }
        );

        const runId = runRes.data.data.id;
        let status = "RUNNING"; let attempts = 0;
        while ((status === "RUNNING" || status === "READY") && attempts < 24) {
          await new Promise((r) => setTimeout(r, 5000));
          const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
          status = s.data.data.status; attempts++;
        }
        if (status !== "SUCCEEDED") return `LinkedIn posts scrape failed: ${status}`;

        const datasetId = runRes.data.data.defaultDatasetId;
        const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
          params: { token: APIFY_TOKEN, format: "json", clean: true },
        });

        const posts = (items.data || []).slice(0, lCount) as Array<{
          text?: string; authorName?: string; authorTitle?: string; url?: string; reactionsCount?: number;
        }>;
        return `Found ${posts.length} LinkedIn posts:\n\n${posts.map((p, i) =>
          `${i + 1}. ${p.authorName} (${p.authorTitle || "—"})\n   "${(p.text || "").slice(0, 150)}..."\n   Reactions: ${p.reactionsCount || 0} | ${p.url}`
        ).join("\n\n")}`;
      }

      case "scrape_twitter": {
        if (!APIFY_TOKEN) return "APIFY_API_TOKEN not set";
        const { query: tQuery, count: tCount = 20 } = args as { query: string; count?: number };

        const runRes = await axios.post(
          `${APIFY_BASE}/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs`,
          { searchTerms: [tQuery], maxItems: tCount, queryType: "Latest" },
          { params: { token: APIFY_TOKEN }, timeout: 30_000 }
        );

        const runId = runRes.data.data.id;
        let status = "RUNNING"; let attempts = 0;
        while ((status === "RUNNING" || status === "READY") && attempts < 24) {
          await new Promise((r) => setTimeout(r, 5000));
          const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
          status = s.data.data.status; attempts++;
        }
        if (status !== "SUCCEEDED") return `Twitter scrape failed: ${status}`;

        const datasetId = runRes.data.data.defaultDatasetId;
        const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
          params: { token: APIFY_TOKEN, format: "json", clean: true },
        });

        const tweets = (items.data || []).slice(0, tCount) as Array<{
          text?: string; author?: { name?: string; userName?: string }; url?: string; likeCount?: number;
        }>;
        return `Found ${tweets.length} tweets for "${tQuery}":\n\n${tweets.map((t, i) =>
          `${i + 1}. @${t.author?.userName} (${t.author?.name})\n   "${(t.text || "").slice(0, 180)}"\n   ❤️ ${t.likeCount || 0} | ${t.url}`
        ).join("\n\n")}`;
      }

      case "find_investor_email": {
        if (!APIFY_TOKEN) return "APIFY_API_TOKEN not set";
        const { name: invName, company: invCompany, extraContext } = args as { name: string; company?: string; extraContext?: string };

        // Step 1: Search for their personal website / AngelList / contact page
        const searchQuery = `"${invName}" ${invCompany || ""} ${extraContext || ""} email contact angel investor site:angel.co OR site:crunchbase.com OR site:linkedin.com/in contact email`;
        const runRes = await axios.post(
          `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
          { queries: `"${invName}" ${invCompany || ""} angel investor email contact OR "@gmail.com" OR "@" -site:linkedin.com`, maxPagesPerQuery: 1, resultsPerPage: 5 },
          { params: { token: APIFY_TOKEN }, timeout: 30_000 }
        );
        const runId = runRes.data.data.id;
        let status = "RUNNING"; let attempts = 0;
        while ((status === "RUNNING" || status === "READY") && attempts < 12) {
          await new Promise((r) => setTimeout(r, 5000));
          const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
          status = s.data.data.status; attempts++;
        }
        if (status !== "SUCCEEDED") return `Email search failed for ${invName}`;

        const datasetId = runRes.data.data.defaultDatasetId;
        const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, { params: { token: APIFY_TOKEN, format: "json", clean: true } });
        const results = (items.data[0]?.organicResults || []) as Array<{ title?: string; url?: string; description?: string }>;

        // Extract any emails from snippets
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const allText = results.map(r => `${r.title} ${r.description} ${r.url}`).join(" ");
        const foundEmails = [...new Set(allText.match(emailRegex) || [])].filter(e => !e.includes("example") && !e.includes("test"));

        // Find best non-LinkedIn URL to scrape for contact info
        const targetUrl = results.find(r => r.url && !r.url.includes("linkedin.com") && (r.url.includes("angel.co") || r.url.includes("crunchbase") || r.url.includes(invName.toLowerCase().replace(" ", ""))))?.url;

        let scrapedEmails: string[] = [];
        if (targetUrl && foundEmails.length === 0) {
          try {
            const scrapeRun = await axios.post(
              `${APIFY_BASE}/acts/vdrmota~contact-info-scraper/runs`,
              { startUrls: [{ url: targetUrl }], maxDepth: 0, maxPages: 1 },
              { params: { token: APIFY_TOKEN }, timeout: 30_000 }
            );
            let scrapeStatus = "RUNNING"; let sa = 0;
            while ((scrapeStatus === "RUNNING" || scrapeStatus === "READY") && sa < 12) {
              await new Promise((r) => setTimeout(r, 5000));
              const ss = await axios.get(`${APIFY_BASE}/actor-runs/${scrapeRun.data.data.id}`, { params: { token: APIFY_TOKEN } });
              scrapeStatus = ss.data.data.status; sa++;
            }
            if (scrapeStatus === "SUCCEEDED") {
              const sd = scrapeRun.data.data.defaultDatasetId;
              const si = await axios.get(`${APIFY_BASE}/datasets/${sd}/items`, { params: { token: APIFY_TOKEN, format: "json", clean: true } });
              scrapedEmails = (si.data || []).flatMap((c: { emails?: string[] }) => c.emails || []);
            }
          } catch { /* ignore */ }
        }

        const allEmails = [...new Set([...foundEmails, ...scrapedEmails])];
        const topLinks = results.slice(0, 3).map(r => r.url).join("\n");

        return allEmails.length > 0
          ? `Found for ${invName}: ${allEmails.join(", ")}\nSources searched:\n${topLinks}`
          : `No email found in public sources for ${invName}. Top links found:\n${topLinks}\n\nSuggestion: manually check ${targetUrl || results[0]?.url || "their website"}`;
      }

      case "extract_contacts": {
        if (!APIFY_TOKEN) return "APIFY_API_TOKEN not set";
        const { url: contactUrl } = args as { url: string };

        // Block LinkedIn — it doesn't expose emails
        if (contactUrl.includes("linkedin.com")) {
          return "LinkedIn blocks contact scrapers. Use find_investor_email instead, or extract_contacts on their personal website / VC firm page.";
        }

        const runRes = await axios.post(
          `${APIFY_BASE}/acts/vdrmota~contact-info-scraper/runs`,
          { startUrls: [{ url: contactUrl }], maxDepth: 1, maxPages: 5 },
          { params: { token: APIFY_TOKEN }, timeout: 60_000 }
        );

        const runId = runRes.data.data.id;
        let status = "RUNNING"; let attempts = 0;
        while ((status === "RUNNING" || status === "READY") && attempts < 24) {
          await new Promise((r) => setTimeout(r, 5000));
          const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
          status = s.data.data.status; attempts++;
        }
        if (status !== "SUCCEEDED") return `Contact extraction failed: ${status}`;

        const datasetId = runRes.data.data.defaultDatasetId;
        const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
          params: { token: APIFY_TOKEN, format: "json", clean: true },
        });

        const contacts = (items.data || []) as Array<{
          emails?: string[]; phones?: string[]; linkedIns?: string[]; twitters?: string[];
        }>;
        const allEmails = [...new Set(contacts.flatMap((c) => c.emails || []))];
        const allLinkedIns = [...new Set(contacts.flatMap((c) => c.linkedIns || []))];

        return `Contact info from ${contactUrl}:\nEmails: ${allEmails.join(", ") || "none found"}\nLinkedIns: ${allLinkedIns.slice(0, 5).join(", ") || "none found"}`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

export interface Conversation {
  id?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export async function saveConversation(
  conversationId: string | null,
  messages: ChatMessage[],
  title?: string
): Promise<string> {
  const db = getDb();
  const col = db.collection(COLLECTIONS.CONVERSATIONS);
  const now = new Date().toISOString();

  if (conversationId) {
    await col.doc(conversationId).update({ messages, updatedAt: now });
    return conversationId;
  }
  const doc = await col.add({
    title: title || messages.find(m => m.role === "user")?.content?.slice(0, 60) || "New conversation",
    messages,
    createdAt: now,
    updatedAt: now,
  });
  return doc.id;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const db = getDb();
  const doc = await db.collection(COLLECTIONS.CONVERSATIONS).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Conversation, "id">) };
}

export async function listConversations(): Promise<Conversation[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.CONVERSATIONS).orderBy("updatedAt", "desc").limit(50).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, "id">) }));
}

// ── Main chat with tool execution ─────────────────────────────────────────────
export async function chat(
  userMessage: string,
  conversationId?: string
): Promise<{ reply: string; conversationId: string; toolCalls: ToolCall[] }> {
  let history: ChatMessage[] = [];
  if (conversationId) {
    const conv = await getConversation(conversationId);
    history = conv?.messages || [];
  }

  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
    { role: "user", content: userMessage },
  ];

  const toolCalls: ToolCall[] = [];
  let finalReply = "";

  // Agentic loop — keep calling until no more tool calls
  let iteration = 0;
  const maxIterations = 5;

  while (iteration < maxIterations) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: apiMessages,
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 2000,
      temperature: 0.7,
    });

    const choice = completion.choices[0];
    const msg = choice.message;

    apiMessages.push(msg as OpenAI.Chat.Completions.ChatCompletionMessageParam);

    if (choice.finish_reason === "tool_calls" && msg.tool_calls) {
      // Execute all tool calls in this turn
      const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];

      for (const tc of msg.tool_calls) {
        if (tc.type !== "function") continue;
        const fn = tc.function;
        const args = JSON.parse(fn.arguments) as Record<string, unknown>;
        console.log(`🔧 Jarvis calling tool: ${fn.name}`, args);
        const result = await runTool(fn.name, args);

        toolCalls.push({ tool: fn.name, args, result });
        toolResults.push({ role: "tool", tool_call_id: tc.id, content: result });
      }

      apiMessages.push(...toolResults);
      iteration++;
      continue;
    }

    // Final text response
    finalReply = msg.content || "Done.";
    break;
  }

  if (!finalReply) finalReply = "I completed the tasks. Check the results above.";

  // Save conversation
  const newUserMsg: ChatMessage = { role: "user", content: userMessage };
  const newAssistantMsg: ChatMessage = { role: "assistant", content: finalReply };
  const updatedMessages = [...history, newUserMsg, newAssistantMsg];
  const savedId = await saveConversation(conversationId || null, updatedMessages);

  return { reply: finalReply, conversationId: savedId, toolCalls };
}

export async function research(query: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT + "\n\nDo thorough research. Be structured and actionable." },
      { role: "user", content: query },
    ],
    max_tokens: 3000,
    temperature: 0.5,
  });
  return completion.choices[0]?.message?.content || "";
}
