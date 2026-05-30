import { chromium, Browser, BrowserContext, Page } from "playwright";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Reelin AI application profile ────────────────────────────────────────────
export const REELIN_PROFILE = {
  // Company
  companyName: "Reelin AI",
  website: "https://reelin.ai",
  description: "Reelin AI is the world's first autonomous AI social network. Users share a selfie and voice note — our AI builds a high-fidelity digital twin that lives 24/7 in a persistent shared simulation, meets other twins, and develops a social life autonomously. Users get daily 60–90 second cinematic 4K video reels of what their twin did. Features include Drama Feed, Daily Reels, WhatsApp updates, and autopilot posting to TikTok/Instagram/X.",
  shortDescription: "The world's first autonomous AI social network — your AI twin lives, socialises and creates content for you 24/7.",
  problem: "People want a social media presence and social connections but lack the time, energy, or confidence to consistently create content and engage. Existing platforms demand constant effort with diminishing returns.",
  solution: "Reelin AI creates a digital twin of every user that autonomously socialises, generates content, and builds connections — giving users a rich social life and growing audience with just one daily check-in.",
  stage: "Pre-seed",
  sector: "Artificial Intelligence, Social Media, Consumer Tech",
  businessModel: "Freemium SaaS — $34.99/month Starter, $79.99/month Pro, $129.99/month Elite. B2C subscription with viral growth loop built in.",
  traction: "Live on iOS App Store. $100K pre-seed from Mark Cuban. Backed by early investors of Figure AI. Now raising $10M seed round.",
  raise: "$10,000,000",
  raiseStage: "Seed",
  previousRaise: "$100,000 pre-seed from Mark Cuban",
  useOfFunds: "60% product engineering & AI model training, 20% user acquisition & growth, 15% team expansion, 5% operations.",
  marketSize: "$150B+ social media advertising market. 4.9 billion social media users globally. Creator economy valued at $250B.",
  competition: "Traditional social platforms (Instagram, TikTok, X) — but Reelin AI is the only platform where the AI creates your content autonomously. No direct competitor.",
  differentiation: "First-mover in autonomous AI social networking. Proprietary twin engine. Daily cinematic reels. Fully autonomous social life with zero effort from users.",
  team: "Abel Adugam Ayuba — Founder & CEO. GitHub Expert, GitLab Hero, international speaker at Droidcon Berlin and Open Source Festival. Started coding 2016, built multiple platforms.",
  founded: "2024",
  hq: "Singapore",
  platform: "iOS",

  // Founder personal info
  founderName: "Abel Adugam Ayuba",
  founderFirstName: "Abel",
  founderLastName: "Adugam Ayuba",
  founderEmail: "adugamhq@gmail.com",
  founderRole: "Founder & CEO",
  founderLinkedIn: "https://linkedin.com/in/adugamayuba",
  founderGitHub: "https://github.com/adugamayuba",
  founderWebsite: "https://adugam.com",
  founderBio: "Serial founder and engineer. GitHub Expert, GitLab Hero, international speaker. Building Reelin AI — the world's first autonomous AI social network. Backed by Mark Cuban pre-seed.",

  // Softdroom Holdings (parent)
  parentCompany: "Softdroom Holdings",
  parentHQ: "Singapore",
};

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
  }
  return browser;
}

export interface FormField {
  label: string;
  type: string;
  selector: string;
  required: boolean;
  options?: string[];
  suggestedValue: string;
  reasoning: string;
}

export interface ApplicationPreview {
  url: string;
  title: string;
  fields: FormField[];
  screenshot: string; // base64
  warnings: string[];
}

// Use AI to map a form field label to the best value from REELIN_PROFILE
async function aiMapField(
  label: string,
  fieldType: string,
  options: string[],
  context: string
): Promise<{ value: string; reasoning: string }> {
  const profile = JSON.stringify(REELIN_PROFILE, null, 2);

  const prompt = `You are filling out an accelerator application for Reelin AI.

REELIN AI PROFILE:
${profile}

FORM FIELD:
Label: "${label}"
Type: ${fieldType}
${options.length > 0 ? `Options: ${options.join(", ")}` : ""}
Page context: ${context}

Based on the Reelin AI profile above, what is the BEST value to fill in for this field?
For select/radio fields, choose the most appropriate option from the list.
For text fields, write a professional, compelling answer.
Keep text answers under 500 words unless the field clearly requires more.

Respond with JSON: { "value": "...", "reasoning": "..." }`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });
    const json = JSON.parse(res.choices[0].message.content || "{}");
    return { value: json.value || "", reasoning: json.reasoning || "" };
  } catch {
    return { value: "", reasoning: "Could not map field" };
  }
}

export async function analyzeApplicationForm(url: string): Promise<ApplicationPreview> {
  const b = await getBrowser();
  const context: BrowserContext = await b.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  const page: Page = await context.newPage();
  const warnings: string[] = [];

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));

    // Find all form fields
    const rawFields = await page.evaluate(/* js */`(function() {
      const fields = [];
      const inputs = document.querySelectorAll("input, textarea, select");
      inputs.forEach((el, idx) => {
        const type = el.type || el.tagName.toLowerCase();
        if (["hidden", "submit", "button", "reset", "image", "file"].includes(type)) return;

        let label = "";
        if (el.id) {
          const labelEl = document.querySelector('label[for="' + el.id + '"]');
          if (labelEl) label = labelEl.textContent?.trim() || "";
        }
        if (!label) {
          const parent = el.parentElement;
          if (parent) {
            const labelEl = parent.querySelector("label");
            if (labelEl) label = labelEl.textContent?.trim() || "";
          }
        }
        if (!label) {
          label = el.placeholder || el.name || ("Field " + idx);
        }

        const options = [];
        if (el.tagName === "SELECT") {
          el.querySelectorAll("option").forEach(opt => {
            if (opt.value) options.push(opt.text);
          });
        }

        const selector = el.id ? ("#" + el.id) : (el.name ? ("[name=\\"" + el.name + "\\"]") : (el.tagName.toLowerCase() + ":nth-of-type(" + (idx + 1) + ")"));

        fields.push({
          label: label.substring(0, 200),
          type,
          selector,
          required: el.required || false,
          options: options.slice(0, 20),
          id: el.id,
          name: el.name || "",
          placeholder: el.placeholder || "",
        });
      });
      return fields;
    })()`
    ) as Array<{
      label: string; type: string; selector: string;
      required: boolean; options: string[]; id: string; name: string; placeholder: string;
    }>;

    if (rawFields.length === 0) {
      warnings.push("No form fields found on this page. The form may require JavaScript or authentication to load.");
    }

    // Use AI to map values for each field
    const fields: FormField[] = [];
    for (const raw of rawFields.slice(0, 30)) { // max 30 fields
      const { value, reasoning } = await aiMapField(
        raw.label,
        raw.type,
        raw.options,
        pageText
      );
      fields.push({
        label: raw.label,
        type: raw.type,
        selector: raw.selector,
        required: raw.required,
        options: raw.options,
        suggestedValue: value,
        reasoning,
      });
    }

    // Take screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    const screenshot = screenshotBuffer.toString("base64");

    await context.close();

    return { url, title, fields, screenshot, warnings };
  } catch (err) {
    await context.close();
    throw err;
  }
}

export async function submitApplicationForm(
  url: string,
  fields: Array<{ selector: string; value: string; type: string }>,
  dryRun = false
): Promise<{ success: boolean; screenshot: string; message: string }> {
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(1500);

    // Fill in all fields
    for (const field of fields) {
      try {
        if (!field.value || !field.selector) continue;
        const el = page.locator(field.selector).first();
        const count = await el.count();
        if (count === 0) continue;

        if (field.type === "select" || field.type === "select-one") {
          await el.selectOption({ label: field.value }).catch(() =>
            el.selectOption({ value: field.value })
          );
        } else if (field.type === "checkbox") {
          const checked = field.value.toLowerCase() === "true" || field.value === "1";
          if (checked) await el.check();
        } else if (field.type === "radio") {
          await page.locator(`input[value="${field.value}"]`).first().check();
        } else {
          await el.fill("");
          await el.type(field.value, { delay: 20 });
        }
        await page.waitForTimeout(200);
      } catch {
        // skip fields that can't be filled
      }
    }

    // Screenshot before submitting
    const beforeShot = await page.screenshot({ fullPage: false });
    const beforeBase64 = beforeShot.toString("base64");

    if (dryRun) {
      await context.close();
      return { success: true, screenshot: beforeBase64, message: "Dry run — form filled but NOT submitted" };
    }

    // Find and click the submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      'button:has-text("Send Application")',
      'button:has-text("Apply Now")',
    ];

    let submitted = false;
    for (const sel of submitSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.count() > 0) {
        await btn.click();
        submitted = true;
        break;
      }
    }

    await page.waitForTimeout(3000);
    const afterShot = await page.screenshot({ fullPage: false });
    const afterBase64 = afterShot.toString("base64");

    await context.close();

    return {
      success: submitted,
      screenshot: afterBase64,
      message: submitted
        ? "Application submitted successfully"
        : "Form filled but submit button not found — please submit manually",
    };
  } catch (err) {
    await context.close();
    throw err;
  }
}
