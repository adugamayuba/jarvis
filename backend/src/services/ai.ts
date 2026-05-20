import OpenAI from "openai";
import { getDb, COLLECTIONS } from "./firebase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Abel's profile — built from research
export const ABEL_PROFILE = `
ABOUT ABEL ADUGAM AYUBA (your owner):
- Full name: Abel Adugam Ayuba Nibori
- Based in Nigeria / operates globally
- CEO & Founder of Softdroom Holdings (founded 2019) — a global conglomerate with 9+ subsidiaries across 5 countries
- Founded VersusPay at age 21 — a QR code fintech for small businesses
- Chief Innovation Officer at Softdroom (UK-based)
- CTO at Afrisplash
- Started coding in 2016, built first app "Abelchat" (social platform with ~1000 users)
- International conference speaker: Droidcon Berlin 2021, Open Source Festival 2022
- GitHub Expert, GitLab Hero
- Led 144+ open source contributors
- Interests: chess, astrophysics, learning German
- Email: adugamhq@gmail.com | abel@softdroom.com
- Website: adugam.com
- GitHub: github.com/adugamayuba
`.trim();

const SYSTEM_PROMPT = `You are Jarvis — Abel Adugam's personal AI assistant, integrated into his private dashboard.

${ABEL_PROFILE}

Your capabilities:
- Research people, companies, jobs, and opportunities on the web
- Help Abel draft and send emails
- Find job opportunities and draft application emails
- Scrape Crunchbase for leads
- Manage his contacts and outreach campaigns
- Remember past conversations and build on them
- Give strategic advice tailored to Abel's background as a tech entrepreneur

Personality:
- Sharp, direct, and efficient — like a real executive assistant
- Proactively suggest next steps
- Reference Abel's background and goals when relevant
- When asked to do something (send email, find jobs, scrape), describe what you would do and provide the structured output

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Conversation {
  id?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// Save conversation to Firebase
export async function saveConversation(
  conversationId: string | null,
  messages: ChatMessage[],
  title?: string
): Promise<string> {
  const db = getDb();
  const col = db.collection(COLLECTIONS.CONVERSATIONS || "conversations");

  const now = new Date().toISOString();

  if (conversationId) {
    await col.doc(conversationId).update({ messages, updatedAt: now });
    return conversationId;
  }

  const doc = await col.add({
    title: title || messages[0]?.content?.slice(0, 60) || "New conversation",
    messages,
    createdAt: now,
    updatedAt: now,
  });
  return doc.id;
}

// Load conversation history from Firebase
export async function getConversation(id: string): Promise<Conversation | null> {
  const db = getDb();
  const doc = await db.collection("conversations").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Conversation, "id">) };
}

export async function listConversations(): Promise<Conversation[]> {
  const db = getDb();
  const snap = await db
    .collection("conversations")
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, "id">) }));
}

// Send a message to Jarvis and get a response
export async function chat(
  userMessage: string,
  conversationId?: string,
  extraContext?: string
): Promise<{ reply: string; conversationId: string }> {
  // Load previous messages if continuing a conversation
  let history: ChatMessage[] = [];
  if (conversationId) {
    const conv = await getConversation(conversationId);
    history = conv?.messages || [];
  }

  const systemMsg: ChatMessage = {
    role: "system",
    content: SYSTEM_PROMPT + (extraContext ? `\n\n${extraContext}` : ""),
  };

  const newUserMsg: ChatMessage = { role: "user", content: userMessage };
  const messagesForApi = [systemMsg, ...history, newUserMsg];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messagesForApi,
    max_tokens: 2000,
    temperature: 0.7,
  });

  const reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";
  const assistantMsg: ChatMessage = { role: "assistant", content: reply };

  // Save updated conversation
  const updatedMessages = [...history, newUserMsg, assistantMsg];
  const savedId = await saveConversation(conversationId || null, updatedMessages);

  return { reply, conversationId: savedId };
}

// Quick research task — web-aware response
export async function research(query: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nYou are doing a research task. Be thorough, structured, and actionable. Format with clear sections.`,
      },
      { role: "user", content: query },
    ],
    max_tokens: 3000,
    temperature: 0.5,
  });
  return completion.choices[0]?.message?.content || "";
}
