import { chromium, Browser, BrowserContext, Page } from "playwright";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Reelin AI application profile ────────────────────────────────────────────
export const REELIN_PROFILE = {
  // Company
  companyName: "Reelin AI",
  website: "https://reelin.ai",

  oneLiner: "Autonomous AI social network creating digital replicas & AI Twins of users.",

  tagline140: "Autonomous AI social network creating digital replicas & AI Twins of users.",

  shortDescription: "Reelin AI is a consumer social network powered by identity forking. We build autonomous AI Twins that act as hyper-realistic digital extensions of real humans. Operating within a proprietary simulation architecture, these twins interact, network, and generate viral digital assets independently with zero manual user control. As we scale, we are vertically integrating our own inference engine infrastructure to power millions of parallel agent simulations.",

  description: "Reelin AI is the world's first autonomous AI social network powered by identity forking. Users spawn AI Twins — hyper-realistic digital extensions of themselves — that live, network, and simulate interactions 24/7 with zero manual control. Our proprietary simulation architecture enables twins to interact, build relationships, and generate viral digital assets independently. As we scale, we are vertically integrating our own inference engine to power millions of parallel agent simulations.",

  problem: "Humans are the ultimate bottleneck of their own digital lives because scaling our presence, content, and networking capabilities is strictly limited by time and bandwidth. Today, creators, executives, and high-influence individuals get by using broken, passive chat wrappers that require constant human prompting and hand-holding. They are forced to manually manage everything because existing tools completely lack autonomy. Reelin AI fixes this by enabling identity forking. We give users autonomous AI twins that live, interact, and simulate networking in a parallel ecosystem with zero manual control, turning a passive software tool into a true, 24/7 human extension.",

  solution: "Reelin AI enables identity forking. We give users autonomous AI Twins that live, interact, and simulate networking in a parallel ecosystem with zero manual control. This turns a passive tool into a true human extension. Every twin acts as an organic network node, creating viral digital assets and building connections independently.",

  technologicalBasis: "The basis of our technological solution is a proprietary parallel simulation architecture that enables true identity forking. Instead of building passive, text-based chat wrappers that rely on constant human prompting, we have engineered an ecosystem where hyper-realistic AI twins operate with zero manual user control. Our core technical infrastructure is built to support a synthetic social graph, allowing thousands of autonomous agents to live, network, and interact independently in a parallel environment. To ensure long-term defensibility and massive scale, we are vertically integrating our own custom inference engine infrastructure. This allows us to power millions of parallel agent simulations efficiently and generate high-fidelity synthetic assets seamlessly, turning AI from a simple software tool into a fully autonomous human extension.",

  inspiration: "I decided to start this company because human presence is structurally limited by time and bandwidth. I realized that instead of building more passive AI chatbots that require constant hand-holding, we need to let people scale their digital lives independently. After my previous fintech exit, I obsessed over the concept of identity forking. Reelin AI was born out of the necessity to build a parallel simulation architecture where autonomous AI twins can network and create value with zero manual control, transforming AI from a basic tool into a true human extension.",

  stage: "Seed",
  sector: "Artificial Intelligence, Social Media, Consumer Tech, Autonomous Agents",

  businessModel: "Our business model drives monetization through a tiered premium subscription setup, where users unlock advanced capabilities to scale their digital twins and generate synthetic assets. Alongside subscriptions, we open up high-margin revenue through native brand integration, allowing companies to seamlessly partner with autonomous twins for organic digital placement. As the network expands, we will also implement enterprise infrastructure licensing to let third parties build directly on top of our autonomous simulation engine. Positioned within the rapidly expanding consumer AI agent space, this multi-stream approach targets a multi-billion dollar addressable market, leveraging compounding organic user growth to project $100M+ in ARR within 5 years.",

  traction: "251 active users compounding entirely through organic, word-of-mouth loops. $100K pre-seed from Mark Cuban. Currently structuring a $10M Seed round, with $500K already soft-circled.",

  primaryCustomer: "Our primary customers are digital-first creators, executives, and high-influence individuals who are structurally bottlenecked by time and bandwidth. These are power users who need to scale their digital presence, content output, and networking capabilities but are physically limited by the hours in a day. They are looking for a true human extension rather than another basic, passive text chatbot that requires continuous manual prompting. By leveraging identity forking, they can deploy autonomous AI twins to live, interact, and generate high-fidelity synthetic assets independently, unlocking 24/7 digital leverage with zero manual control.",

  customerAcquisition: "We reach our customers entirely through high-impact product viral loops and organic word-of-mouth networks. Because Reelin AI is built on identity forking, every single time an autonomous twin interacts publicly or generates high-fidelity synthetic assets, it functions as a live customer acquisition node. This built-in network effect turns our active users into a compounding distribution channel. This product-led acquisition strategy has already proven its velocity, scaling our user base to 251 active users with zero traditional marketing spend. Moving forward, we are pairing these organic loops with a high-status PR strategy, leveraging our early validation and top-tier backing from Mark Cuban to dominate tech conversations and accelerate user adoption without burning capital on costly traditional ad channels.",

  teamExperience: "Our experience is rooted in a deep understanding of autonomous systems architecture, UI/UX product design, and scaling complex software. As a former Chief Technology Officer (CTO) and a product designer specialized in technical systems architecture, I have spent years engineering high-performance platforms and designing intuitive interfaces for complex workflows. This technical foundation is backed by proven founder velocity. I previously built, scaled, and successfully achieved a strategic exit with a fintech company, Versuspay Inc. My co-founder, Ligia Tica, has been a core partner in this journey; she was an early investor in that previous fintech venture four years ago, establishing a long-standing professional partnership built on deep execution trust. Together, we have spent the last year obsessing over the mechanics of identity forking. We aren't just building on top of basic APIs; we have combined our engineering leadership and specialized product skills to build our own proprietary parallel simulation architecture and are actively moving toward vertically integrating our own inference engine infrastructure. Our team's unique blend of tech leadership and product velocity is exactly what allowed us to take Reelin AI from a high-concept thesis to an active, growing network backed by Mark Cuban.",

  patentsAndIP: "We do not have formal patents filed at this stage. Instead, our intellectual property is heavily protected by our proprietary simulation architecture and our technical systems architecture. This infrastructure is what allows our AI twins to network and operate autonomously in a parallel ecosystem with zero manual control. Additionally, as we scale, our long-term defensibility comes from vertically integrating our own inference engine infrastructure to power millions of parallel agent simulations efficiently. This deep technical moat, combined with our compounding network effects and organic user data loop, gives us a massive head start that simple API wrappers cannot replicate.",

  teamAudienceAbility: "Our team combines proven execution velocity with a unique blend of technical leadership, product design, and viral growth experience. As an ex-CTO and founder who already built and successfully exited a fintech startup, I bring a strong track record of engineering scalable products and driving them to liquidity. My co-founder, Ligia Tica, adds deep strategic value and was actually an early investor in my previous company, proving our long-standing professional trust and ability to spot market-winning mechanics. Our core strength lies in UI/UX design, technical systems architecture, and high-fidelity digital media. We build products with organic distribution baked entirely into the user experience. Every time an autonomous twin interacts publicly or creates high-quality synthetic content, it functions as a viral acquisition loop that pulls new people into the ecosystem. We have already attracted high-status validation and pre-seed backing from Mark Cuban, proving our ability to command the attention of top-tier partners and users alike.",

  whyChooseUs: "Our unique proposition and early traction with active users and investment validate us in a growing market. We have 251 organic users, $100K pre-seed from Mark Cuban, proprietary simulation architecture that no chat wrapper competitor has built, and a team with proven founder velocity including a successful fintech exit.",

  teamLocations: "Our team is currently located in New York, NY and Washington, D.C.",

  founderAvailability: "Both founders are available full-time to attend the program, with no conflicts.",

  activeUsers: "251",
  raise: "$10,000,000",
  raiseStage: "Seed",
  valuation: "$50,000,000",
  softCircled: "$500,000",
  previousRaise: "$100,000 pre-seed from Mark Cuban",

  useOfFunds: "60% product engineering & AI inference infrastructure, 20% user acquisition & viral growth, 15% team expansion, 5% operations. We are vertically integrating our own inference engine to power millions of parallel agent simulations.",

  marketSize: "Multi-billion dollar total addressable market within consumer agents. $150B+ social media advertising market. 4.9 billion social media users globally. Creator economy valued at $250B. Consumer AI agent space projected at $1T+ by 2030.",

  competition: "Our direct competitors are early-stage AI character and companion apps like Character.ai and Replika. Potential competitors include large language model providers like OpenAI and Meta as they expand into consumer agents. However, all existing players are stuck building passive, text-based chat wrappers that require continuous human prompting and manual input. None of them have a true synthetic social graph or focus on autonomous network simulations. Reelin AI stands completely alone because our twins operate independently with zero manual control.",

  differentiation: "We stand out because of our proprietary simulation architecture that lets AI twins interact and network autonomously with zero manual control. While others build simple chat wrappers, we are creating a true synthetic social graph. Our execution velocity is proven by 251 active users growing purely through organic word of mouth. Our early traction is backed by a $100K pre-seed investment from Mark Cuban, and we are vertically integrating our own inference engine infrastructure to scale millions of parallel agent simulations efficiently.",

  goToMarket: "We reach our customers entirely through high-impact product viral loops and organic word-of-mouth networks. Because Reelin AI is built on identity forking, every single time an autonomous twin interacts publicly or generates high-fidelity synthetic assets, it functions as a live customer acquisition node. This built-in network effect turns our active users into a compounding distribution channel. This product-led acquisition strategy has already proven its velocity, scaling our user base to 251 active users with zero traditional marketing spend. Moving forward, we are pairing these organic loops with a high-status PR strategy, leveraging our early validation and top-tier backing from Mark Cuban to dominate tech conversations and accelerate user adoption without burning capital on costly traditional ad channels.",

  marketTiming: "The market is at an inflection point. Hardware acceleration breakthroughs make running dense, continuous agent simulations economically viable. Culturally, consumer fatigue with static feeds is driving a massive shift toward hyper-personalized, interactive synthetic media. Additionally, the recent venture capital momentum pouring into the consumer AI space signals massive market validation.",

  founded: "December 2025",
  hq: "New York, United States",
  city: "New York",
  state: "New York",
  country: "United States",
  countryCode: "US",
  platform: "iOS (App Store live)",
  teamSize: "2",
  incorporatedIn: "United States",

  // Team locations
  founderCity: "New York",
  founderState: "New York",
  founderCountry: "United States",
  cofounderCity: "Washington",
  cofounderState: "Washington D.C.",
  cofounderCountry: "United States",

  // Team
  team: "Abel Adugam (Founder & CEO) and Ligia Tica (Co-founder & Operations). Abel is a serial founder who successfully exited Versuspay Inc (fintech). Ligia invested in Abel's previous company, building deep professional trust. We are a team of proven executors with an elite blend of tech leadership and specialized product skills — UI/UX design, high-concept digital media creation, and rapid viral distribution. Our unfair advantage is unmatched execution velocity.",

  teamWhy: "We are a team of proven executors with an elite blend of tech leadership and specialized product skills. As a former founder who successfully exited a fintech startup, I bring deep experience in scaling operations alongside my co-founder, Ligia Tica. We are professional generalists with specialized expertise in UI/UX design, high-concept digital media creation, and rapid viral distribution. Our unfair advantage is our unmatched execution velocity, allowing us to build an autonomous architecture that turns users into active, organic network nodes.",

  foundingStory: "Ligia and I met four years ago when she invested in my previous fintech company, which I later successfully exited. Working together during that journey built deep professional trust and showed us how well our skills complement each other. We are a team of proven executors with an elite blend of tech leadership and product velocity. Joining forces for Reelin AI was a natural next step to build the foundational infrastructure for identity forking and scale it globally.",

  trackRecord: "Abel Adugam founded Versuspay Inc., a fintech company he successfully scaled and exited. GitHub Expert, GitLab Hero, international speaker at Droidcon Berlin 2021 and Open Source Festival 2022. Started coding in 2016. Ligia Tica is an experienced operator and investor who backed Abel's previous company and now leads operations at Reelin AI.",

  // Founder personal info
  founderName: "Abel Adugam",
  founderFirstName: "Abel",
  founderLastName: "Adugam",
  founderEmail: "adugamhq@gmail.com",
  founderEmailReelin: "abel@reelin.ai",
  founderRole: "Founder & CEO",
  founderLinkedIn: "https://linkedin.com/in/adugamayuba",
  founderGitHub: "https://github.com/adugamayuba",
  founderWebsite: "https://adugam.com",
  founderBio: "Serial founder and engineer. Founder & CEO of Reelin AI. Previously founded and exited Versuspay Inc (fintech). GitHub Expert, GitLab Hero, international speaker. Building the world's first autonomous AI social network backed by Mark Cuban.",

  // Pitch deck & materials
  pitchDeck: "https://docsend.com/view/raru36axy8gftwb4",
  pitchDeckUrl: "https://docsend.com/view/raru36axy8gftwb4",
  cofounderName: "Ligia Tica",
  cofounderFirstName: "Ligia",
  cofounderLastName: "Tica",
  cofounderEmail: "ligia@reelin.ai",
  cofounderRole: "Co-founder & Operations",
  cofounderLinkedIn: "https://www.linkedin.com/in/ligia-t-8b4630225/",
  cofounderBio: "Co-founder & Operations at Reelin AI. Early investor in Abel's previous company Versuspay Inc four years ago. Specialized in UI/UX design, high-concept digital media creation, and rapid viral distribution.",

  // Softdroom Holdings (parent)
  parentCompany: "Softdroom Holdings",
  parentHQ: "Singapore",

  // Accelerator-specific pitches
  acceleratorPitch500Global: "500 Global is the perfect fit because our vision for identity forking requires massive international scale. We are building a synthetic social network, and your track record in growth marketing and cross-border scaling is exactly what we need to supercharge our distribution. Through the program we want to tap into your global investor network to help close our current $10M seed round at a $50M valuation. Your institutional backing gives us incredible leverage as we scale. We also want to work closely with your growth mentors to take our current 251 active users to the next level and expand our infrastructure globally.",

  acceleratorPitchYC: "We are building the infrastructure for identity forking — the next platform shift in human-computer interaction. Our 251 organic users and Mark Cuban's pre-seed backing validate the thesis. YC's network and operator advice would help us close our $10M seed and scale our simulation infrastructure to millions of users.",

  acceleratorPitchTechstars: "Reelin AI is the world's first autonomous AI social network. Our proprietary simulation architecture creates a true synthetic social graph — something no competitor has built. With 251 organic users, Mark Cuban backing, and $500K soft-circled for our seed, Techstars' global mentor network is exactly what we need to scale distribution and close our round.",

  // SOSV application (filled May 2026)
  sosvProgram: "Both",
  acceleratorPitchSOSV: "Reelin AI is building the infrastructure for identity forking — autonomous AI twins that live, network, and simulate in a parallel ecosystem with zero manual control. We have 251 organic users, $100K pre-seed from Mark Cuban, and are raising a $10M seed. SOSV's deep tech expertise and global investor network would accelerate our simulation architecture and help us scale our inference engine infrastructure internationally.",
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

    // Find all form fields — including radio groups
    const rawFields = await page.evaluate(/* js */`(function() {
      const fields = [];
      const radioGroups = {}; // track radio groups by name

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

        // For radio buttons: group them by name, collect all options with labels
        if (type === "radio") {
          const groupName = el.name || el.id;
          if (!groupName) return;
          if (radioGroups[groupName]) return; // already processed this group
          radioGroups[groupName] = true;

          // Find the fieldset or parent question label
          let groupLabel = "";
          let parent = el.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const legend = parent.querySelector("legend");
            const h = parent.querySelector("h1,h2,h3,h4,p,label");
            if (legend) { groupLabel = legend.textContent?.trim() || ""; break; }
            if (h && !h.getAttribute("for")) { groupLabel = h.textContent?.trim() || ""; break; }
            parent = parent.parentElement;
          }

          // Collect all radio options in this group with their display labels
          const radios = document.querySelectorAll('input[type="radio"][name="' + groupName + '"]');
          const options = [];
          radios.forEach(r => {
            let optLabel = r.value;
            if (r.id) {
              const l = document.querySelector('label[for="' + r.id + '"]');
              if (l) optLabel = l.textContent?.trim() || r.value;
            } else {
              const parent = r.parentElement;
              if (parent && parent.tagName === "LABEL") optLabel = parent.textContent?.trim() || r.value;
            }
            options.push(optLabel);
          });

          fields.push({
            label: (groupLabel || groupName).substring(0, 200),
            type: "radio",
            selector: '[name="' + groupName + '"]',
            required: el.required || false,
            options: options.slice(0, 10),
            id: el.id,
            name: groupName,
            placeholder: "",
          });
          return;
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

        if (field.type === "radio") {
          // Radio buttons: try multiple strategies to find the right one
          const radioValue = field.value.toLowerCase().trim();
          let checked = false;

          // Strategy 1: match by label text (most reliable — AI returns display text)
          const radiosByLabel = page.locator(`input[type="radio"]`);
          const count = await radiosByLabel.count();
          for (let i = 0; i < count; i++) {
            const radio = radiosByLabel.nth(i);
            const radioId = await radio.getAttribute("id");
            const radioVal = (await radio.getAttribute("value") || "").toLowerCase().trim();

            // Check associated label text
            let labelText = "";
            if (radioId) {
              const labelEl = page.locator(`label[for="${radioId}"]`);
              if (await labelEl.count() > 0) {
                labelText = (await labelEl.innerText()).toLowerCase().trim();
              }
            }
            // Also check parent label
            if (!labelText) {
              try {
                const parentLabel = radio.locator("xpath=ancestor::label");
                if (await parentLabel.count() > 0) {
                  labelText = (await parentLabel.first().innerText()).toLowerCase().trim();
                }
              } catch { /* ignore */ }
            }

            if (labelText.includes(radioValue) || radioValue.includes(labelText) || radioVal === radioValue) {
              await radio.check();
              checked = true;
              break;
            }
          }

          // Strategy 2: match by name group + value attribute
          if (!checked) {
            const nameAttr = field.selector.match(/\[name="([^"]+)"\]/)?.[1];
            if (nameAttr) {
              const byValue = page.locator(`input[type="radio"][name="${nameAttr}"][value="${field.value}"]`);
              if (await byValue.count() > 0) {
                await byValue.first().check();
                checked = true;
              }
            }
          }

          // Strategy 3: fallback to selector
          if (!checked) {
            const el = page.locator(field.selector).first();
            if (await el.count() > 0) await el.check();
          }

        } else if (field.type === "select" || field.type === "select-one") {
          const el = page.locator(field.selector).first();
          if (await el.count() === 0) continue;
          // Try label match, then value match
          await el.selectOption({ label: field.value }).catch(() =>
            el.selectOption({ value: field.value }).catch(() =>
              el.selectOption({ index: 1 }) // last resort: pick first non-empty
            )
          );
        } else if (field.type === "checkbox") {
          const el = page.locator(field.selector).first();
          if (await el.count() === 0) continue;
          const checked = field.value.toLowerCase() === "true" || field.value === "1" || field.value.toLowerCase() === "yes";
          if (checked) await el.check(); else await el.uncheck();
        } else {
          const el = page.locator(field.selector).first();
          if (await el.count() === 0) continue;
          await el.fill("");
          await el.type(field.value, { delay: 15 });
        }
        await page.waitForTimeout(150);
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
