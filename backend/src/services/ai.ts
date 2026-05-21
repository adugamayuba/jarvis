import OpenAI from "openai";
import axios from "axios";
import { getDb, COLLECTIONS } from "./firebase";
import { sendEmail } from "./gmail";
import { scrapeCrunchbaseDirect } from "./crunchbase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

export const ABEL_PROFILE = `
ABOUT ABEL ADUGAM AYUBA (your owner):
- Full name: Abel Adugam Ayuba Nibori
- Location: Nigeria / global operations
- CEO & Founder of Softdroom Holdings (founded 2019) — 9+ subsidiaries, 5 countries
- Founded VersusPay at age 21 — QR code fintech for small business payments
- CTO at Afrisplash, Chief Innovation Officer at Softdroom (UK)
- GitHub Expert, GitLab Hero — led 144+ open source contributors
- International conference speaker: Droidcon Berlin 2021, Open Source Festival 2022
- Started coding 2016, built Abelchat (social platform, ~1000 users)
- Email: adugamhq@gmail.com | abel@softdroom.com
- Website: adugam.com | GitHub: github.com/adugamayuba
- Interests: chess, astrophysics, learning German

CURRENT MISSION — FUNDRAISING:
- Goal: Raise $10M from angel investors
- Check size: $3K and above
- Previous raise: $100K from a Shark Tank investor (6 months ago)
- Product: VersusPay — QR code payment solution for SMBs
- Market: Africa & emerging markets (Nigeria focus, expanding)
- No LinkedIn access currently — using Crunchbase, email outreach, and web research
- Strategy: Find angel investors, research them, send personalized cold emails
`.trim();

const SYSTEM_PROMPT = `You are Jarvis — Abel Adugam's personal AI assistant and execution engine.

${ABEL_PROFILE}

You don't just answer — you ACT. When Abel gives you a command, you use your tools to:
- Search the web for investors, companies, opportunities
- Scrape Crunchbase for investor lists
- Send emails directly from Abel's Gmail (adugamhq@gmail.com)  
- Find angel investors matching specific criteria
- Save contacts to the database

Always be direct. When you execute a tool, tell Abel what you're doing and show the results.
If a task needs multiple steps, do them in sequence and report each step.

Fundraising focus: Abel needs to reach angel investors who write $3K–$500K checks.
The pitch: VersusPay solves payment delays for SMBs using QR codes. $100K raised from Shark Tank investor. Expanding across Africa.

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
        const query = `angel investor ${focus} ${geography || ""} ${checkSize ? `check size ${checkSize}` : ""} site:linkedin.com OR site:crunchbase.com OR site:angellist.com`.trim();

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
