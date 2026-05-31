/**
 * Verified Q&A training data from Abel's accelerator application forms.
 * Used for Jarvis AI context, form autofill, and knowledge base seeding.
 */

export const REELIN_CONTACT = {
  firstName: "Abel",
  lastName: "Adugam",
  email: "abel@reelin.ai",
};

export const REELIN_COMPANY = {
  name: "Reelin AI",
  website: "https://reelin.ai",
  tagline140: "Autonomous AI social network creating digital replicas & AI Twins of users.",
  city: "New York",
  state: "New York",
  country: "United States",
};

export const REELIN_FOUNDERS = [
  {
    name: "Abel Adugam",
    title: "Founder & CEO",
    email: "abel@reelin.ai",
    linkedIn: "https://adugam.com",
  },
  {
    name: "Ligia Tica",
    title: "Co-founder & Operations",
    email: "ligia@reelin.ai",
    linkedIn: "https://www.linkedin.com/in/ligia-t-8b4630225/",
  },
];

/** Question → answer pairs — use verbatim when matching form fields */
export const TRAINING_QA: Array<{ question: string; answer: string }> = [
  {
    question: "Where is your team currently located? (current location doesn't affect application)",
    answer: "Our team is currently located in New York, NY and Washington, D.C.",
  },
  {
    question: "What is the availability of the founders to attend the program? Please elaborate any potential conflicts",
    answer: "Both founders are available full-time to attend the program, with no conflicts.",
  },
  {
    question: "What problem are you working to solve?",
    answer: "Humans are the ultimate bottleneck of their own digital lives because scaling our presence, content, and networking capabilities is strictly limited by time and bandwidth. Today, creators, executives, and high-influence individuals get by using broken, passive chat wrappers that require constant human prompting and hand-holding. They are forced to manually manage everything because existing tools completely lack autonomy.\n\nReelin AI fixes this by enabling identity forking. We give users autonomous AI twins that live, interact, and simulate networking in a parallel ecosystem with zero manual control, turning a passive software tool into a true, 24/7 human extension.",
  },
  {
    question: "What is the basis of your technological solution?",
    answer: "The basis of our technological solution is a proprietary parallel simulation architecture that enables true identity forking. Instead of building passive, text-based chat wrappers that rely on constant human prompting, we have engineered an ecosystem where hyper-realistic AI twins operate with zero manual user control.\n\nOur core technical infrastructure is built to support a synthetic social graph, allowing thousands of autonomous agents to live, network, and interact independently in a parallel environment. To ensure long-term defensibility and massive scale, we are vertically integrating our own custom inference engine infrastructure. This allows us to power millions of parallel agent simulations efficiently and generate high-fidelity synthetic assets seamlessly, turning AI from a simple software tool into a fully autonomous human extension.",
  },
  {
    question: "What is your team's experience working on this technology?",
    answer: "Our experience is rooted in a deep understanding of autonomous systems architecture, UI/UX product design, and scaling complex software. As a former Chief Technology Officer (CTO) and a product designer specialized in technical systems architecture, I have spent years engineering high-performance platforms and designing intuitive interfaces for complex workflows.\n\nThis technical foundation is backed by proven founder velocity. I previously built, scaled, and successfully achieved a strategic exit with a fintech company, Versuspay Inc. My co-founder, Ligia Tica, has been a core partner in this journey; she was an early investor in that previous fintech venture four years ago, establishing a long-standing professional partnership built on deep execution trust.\n\nTogether, we have spent the last year obsessing over the mechanics of identity forking. We aren't just building on top of basic APIs; we have combined our engineering leadership and specialized product skills to build our own proprietary parallel simulation architecture and are actively moving toward vertically integrating our own inference engine infrastructure. Our team's unique blend of tech leadership and product velocity is exactly what allowed us to take Reelin AI from a high-concept thesis to an active, growing network backed by Mark Cuban.",
  },
  {
    question: "Do you have patents or intellectual property for this technology?",
    answer: "We do not have formal patents filed at this stage. Instead, our intellectual property is heavily protected by our proprietary simulation architecture and our technical systems architecture. This infrastructure is what allows our AI twins to network and operate autonomously in a parallel ecosystem with zero manual control.\n\nAdditionally, as we scale, our long-term defensibility comes from vertically integrating our own inference engine infrastructure to power millions of parallel agent simulations efficiently. This deep technical moat, combined with our compounding network effects and organic user data loop, gives us a massive head start that simple API wrappers cannot replicate.",
  },
  {
    question: "Who do you think your primary customer is?",
    answer: "Our primary customers are digital-first creators, executives, and high-influence individuals who are structurally bottlenecked by time and bandwidth. These are power users who need to scale their digital presence, content output, and networking capabilities but are physically limited by the hours in a day.\n\nThey are looking for a true human extension rather than another basic, passive text chatbot that requires continuous manual prompting. By leveraging identity forking, they can deploy autonomous AI twins to live, interact, and generate high-fidelity synthetic assets independently, unlocking 24/7 digital leverage with zero manual control.",
  },
  {
    question: "Have you already or how do you plan to reach your customer?",
    answer: "We reach our customers entirely through high-impact product viral loops and organic word-of-mouth networks. Because Reelin AI is built on identity forking, every single time an autonomous twin interacts publicly or generates high-fidelity synthetic assets, it functions as a live customer acquisition node. This built-in network effect turns our active users into a compounding distribution channel.\n\nThis product-led acquisition strategy has already proven its velocity, scaling our user base to 251 active users with zero traditional marketing spend.\n\nMoving forward, we are pairing these organic loops with a high-status PR strategy, leveraging our early validation and top-tier backing from Mark Cuban to dominate tech conversations and accelerate user adoption without burning capital on costly traditional ad channels.",
  },
  {
    question: "Describe your team's ability (role, skills, education, etc) to form or attract an audience, users, or customers.",
    answer: "Our team combines proven execution velocity with a unique blend of technical leadership, product design, and viral growth experience. As an ex-CTO and founder who already built and successfully exited a fintech startup, I bring a strong track record of engineering scalable products and driving them to liquidity. My co-founder, Ligia Tica, adds deep strategic value and was actually an early investor in my previous company, proving our long-standing professional trust and ability to spot market-winning mechanics.\n\nOur core strength lies in UI/UX design, technical systems architecture, and high-fidelity digital media. We build products with organic distribution baked entirely into the user experience. Every time an autonomous twin interacts publicly or creates high-quality synthetic content, it functions as a viral acquisition loop that pulls new people into the ecosystem.\n\nWe have already attracted high-status validation and pre-seed backing from Mark Cuban, proving our ability to command the attention of top-tier partners and users alike.",
  },
  {
    question: "How will your business make money?",
    answer: "Our business model drives monetization through a tiered premium subscription setup, where users unlock advanced capabilities to scale their digital twins and generate synthetic assets. Alongside subscriptions, we open up high-margin revenue through native brand integration, allowing companies to seamlessly partner with autonomous twins for organic digital placement. As the network expands, we will also implement enterprise infrastructure licensing to let third parties build directly on top of our autonomous simulation engine.\n\nPositioned within the rapidly expanding consumer AI agent space, this multi-stream approach targets a multi-billion dollar addressable market, leveraging compounding organic user growth to project $100M+ in ARR within 5 years.",
  },
  {
    question: "Have you taken any outside investment and, if so, where did it come from?",
    answer: "We raised $100K pre-seed from Mark Cuban and are currently structuring a $10M Seed round, with $500K already soft circled.",
  },
  {
    question: "Why should we choose your company?",
    answer: "Our unique proposition and early traction with active users and investment validate us in a growing market. We have 251 organic users growing purely through word of mouth, $100K pre-seed from Mark Cuban, proprietary simulation architecture that no chat wrapper competitor has built, and a team with proven founder velocity including a successful fintech exit.",
  },
  {
    question: "Please provide us with a link to your deck",
    answer: "https://docsend.com/view/raru36axy8gftwb4",
  },
];

function normalizeQuestion(q: string): string {
  return q.toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

/** Build a lookup map from training Q&A for form field matching */
export function buildQaFieldMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const { question, answer } of TRAINING_QA) {
    map[normalizeQuestion(question)] = answer;
  }
  return map;
}

export function getTrainingInsights(): Array<{ category: string; content: string }> {
  const categoryFor = (q: string): string => {
    const l = q.toLowerCase();
    if (l.includes("problem") || l.includes("why should")) return "pitch";
    if (l.includes("technolog") || l.includes("patent")) return "product";
    if (l.includes("team") || l.includes("founder") || l.includes("experience")) return "team";
    if (l.includes("customer") || l.includes("reach")) return "market";
    if (l.includes("money") || l.includes("investment")) return "financials";
    if (l.includes("deck")) return "pitch";
    return "pitch";
  };

  const insights = TRAINING_QA.map(({ question, answer }) => ({
    category: categoryFor(question),
    content: `Q: ${question}\nA: ${answer}`,
  }));

  insights.push({
    category: "team",
    content: `Founders: ${REELIN_FOUNDERS.map(f => `${f.name} (${f.title}, ${f.email})`).join("; ")}`,
  });

  return insights;
}

export function getTrainingKnowledgeText(): string {
  const lines = [
    "REELIN AI — VERIFIED APPLICATION Q&A (Abel Adugam, May 2026)",
    "",
    `Contact: ${REELIN_CONTACT.firstName} ${REELIN_CONTACT.lastName}, ${REELIN_CONTACT.email}`,
    `Company: ${REELIN_COMPANY.name} | ${REELIN_COMPANY.website} | ${REELIN_COMPANY.city}, ${REELIN_COMPANY.state}, ${REELIN_COMPANY.country}`,
    `One-liner: ${REELIN_COMPANY.tagline140}`,
    "",
    "Founders:",
    ...REELIN_FOUNDERS.map((f, i) => `${i + 1}. ${f.name} — ${f.title}, ${f.email}, ${f.linkedIn}`),
    "",
    "--- Q&A ---",
    "",
    ...TRAINING_QA.flatMap(({ question, answer }) => [`Q: ${question}`, `A: ${answer}`, ""]),
  ];
  return lines.join("\n").trim();
}
