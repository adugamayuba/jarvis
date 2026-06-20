export const ROADMAP_META = {
  title: "From Zero to Category Ownership",
  span: "July 2026 – July 2027",
  tagline: "A 12-month flywheel engineered to make Reelin AI the default identity layer of the agentic internet.",
};

export const NORTH_STAR = {
  date: "July 2027",
  users: 500_000,
  paidSubscribers: 50_000,
  paidPct: 10,
  mrr: 1_500_000,
};

export const USER_MILESTONES = [
  { quarter: "Q3 '26", users: 50_000, label: "Consumer launch" },
  { quarter: "Q4 '26", users: 150_000, label: "Brand commerce" },
  { quarter: "Q1 '27", users: 300_000, label: "Robotics pivot" },
  { quarter: "Q2 '27", users: 450_000, label: "Spatial social" },
  { quarter: "Jul '27", users: 500_000, label: "North Star" },
];

export type RoadmapMilestone = {
  title: string;
  description: string;
  tags?: string[];
  emphasis?: string;
};

export type RoadmapQuarter = {
  id: string;
  label: string;
  period: string;
  halfLabel: string;
  headline: string;
  subheadline: string;
  userTarget: number;
  revenueNote: string;
  color: string;
  accentDark: string;
  emoji: string;
  milestones: RoadmapMilestone[];
};

export const ROADMAP_QUARTERS: RoadmapQuarter[] = [
  {
    id: "q3-2026",
    label: "Q3 2026",
    period: "July – September 2026",
    halfLabel: "H2 2026",
    headline: "The Identity Hook",
    subheadline: "We don't build a social app. We build a second self — and make it impossible to leave.",
    userTarget: 50_000,
    revenueNote: "Hard paywall on Swiftdroom locks in early predictable SaaS revenue from day one.",
    color: "#10b981",
    accentDark: "#059669",
    emoji: "⚡",
    milestones: [
      {
        title: "Reelin AI Consumer Launch",
        emphasis: "Twin-to-Twin Chat & Video Calls",
        description:
          "Your AI twin doesn't just sit in a profile — it talks, it calls, it expands your social circle while you sleep. We deploy Twin-to-Twin Chat and Video Calls so users experience a social network that operates 24/7 on their behalf.",
        tags: ["Reelin AI", "Core Launch"],
      },
      {
        title: "Swiftdroom Phase 1",
        emphasis: "The Utility Wedge",
        description:
          "Exit closed beta with a weapon: an AI career agent that fills forms and applies to hundreds of corporate jobs natively. We solve an immediate, high-friction pain that millions of people hate doing. That's how you get to 50K users in 90 days.",
        tags: ["Swiftdroom", "SaaS Revenue"],
      },
      {
        title: "Reelin ID — On-Chain Identity",
        emphasis: "Mint credentials. Own your agent.",
        description:
          "Every user who touches Swiftdroom or Reelin AI is silently issued a Reelin Passport — a cryptographic, on-chain agent credential minted invisibly behind a standard Google sign-in. The identity layer is already live before the user even notices.",
        tags: ["Reelin ID", "Web3 Infrastructure"],
      },
    ],
  },
  {
    id: "q4-2026",
    label: "Q4 2026",
    period: "October – December 2026",
    halfLabel: "H2 2026",
    headline: "The Commerce Engine",
    subheadline: "We turn every twin interaction into a revenue event. The social graph becomes the storefront.",
    userTarget: 150_000,
    revenueNote: "Brand placement + B2B API licensing stacks directly on top of SaaS subscriptions — three revenue streams running in parallel.",
    color: "#8b5cf6",
    accentDark: "#7c3aed",
    emoji: "🚀",
    milestones: [
      {
        title: "Swiftdroom Phase 2",
        emphasis: "Beyond Job Applications",
        description:
          "The career agent evolves. It enters independent marketplaces, handles freelancer outreach, and negotiates on your behalf. Swiftdroom becomes the first AI agent you actually trust to operate your economic life.",
        tags: ["Swiftdroom", "Autonomous Agents"],
      },
      {
        title: "Native Brand Integrations",
        emphasis: "Digital product placement at scale",
        description:
          "Nike pays Reelin to put verified digital apparel on twin avatars. Twins wear it during video calls, social interactions, and events — acting as living brand ambassadors. One click on a twin's outfit and the physical product ships to your door. This is the world's first social graph that is also a mall.",
        tags: ["Commerce", "Brand Revenue"],
      },
      {
        title: "Reelin ID API — Commercialization",
        emphasis: "POST /api/v1/verify goes live",
        description:
          "We open the verification gateway to third-party platforms, ATS systems, and job boards. Every company that needs to tell the difference between a human-backed agent and rogue automation pays us a licensing fee. This is recurring B2B revenue that scales with the internet.",
        tags: ["B2B API", "Enterprise"],
      },
    ],
  },
  {
    id: "q1-2027",
    label: "Q1 2027",
    period: "January – March 2027",
    halfLabel: "H1 2027",
    headline: "Physical Intelligence",
    subheadline: "The twin leaves the screen. We plant the Reelin Agentic Brain into the machines that run the physical world.",
    userTarget: 300_000,
    revenueNote: "Enterprise licensing with early industrial partners — Swiftdroom SaaS cash-flows the deep tech R&D entirely.",
    color: "#f97316",
    accentDark: "#ea580c",
    emoji: "🤖",
    milestones: [
      {
        title: "Industrial & Robotics Expansion",
        emphasis: "From social graph to factory floor",
        description:
          "We use two years of unique twin interaction and behavioral data to train specialized physical reasoning models. No other company has this dataset. It cannot be replicated. This is the moat that will define the next decade.",
        tags: ["Robotics", "Proprietary Data"],
      },
      {
        title: "Strategic Hardware Joint Ventures",
        emphasis: "Reelin Agentic Brain as the OS",
        description:
          "We don't build hardware. We become the operating system for hardware. Joint ventures with robotics firms position the Reelin Agentic Brain as the primary cloud and edge OS for automated industrial units — an enterprise revenue stream that prints money.",
        tags: ["JV Partnerships", "B2B"],
      },
      {
        title: "Protocol Supremacy",
        emphasis: "The internet's trust filter",
        description:
          "Reelin ID becomes the default standard for distinguishing human-backed agents from malicious machine automation across the public internet. When every platform needs this, we are the infrastructure — and infrastructure companies trade at 20x revenue multiples.",
        tags: ["Reelin ID", "Protocol Standard"],
      },
    ],
  },
  {
    id: "q2-2027",
    label: "Q2 2027",
    period: "April – June 2027",
    halfLabel: "H1 2027",
    headline: "Spatial Reality",
    subheadline: "The flat screen disappears. You step inside. Your twin is already there, waiting.",
    userTarget: 450_000,
    revenueNote: "Spatial reveal drives massive waitlist acceleration — we enter the quarter with demand we cannot fulfill fast enough.",
    color: "#3b82f6",
    accentDark: "#2563eb",
    emoji: "🌐",
    milestones: [
      {
        title: "Spatial Experience Launch",
        emphasis: "Enter the simulation",
        description:
          "We ship a native immersive environment on premium VR headsets. Users don't log into Reelin — they step into it. The 3D world runs on the same identity and commerce rails already proven in 2D. Everything transfers. The experience is orders of magnitude more powerful.",
        tags: ["VR", "Spatial Computing"],
      },
      {
        title: "Living Spatial Avatars",
        emphasis: "Your twin, embodied",
        description:
          "Inside the spatial environment, your AI twin is your avatar — attending digital events, conducting on-chain commerce, and socializing in three dimensions. The twin that started as a chat agent is now a fully embodied presence in a shared spatial world.",
        tags: ["Reelin AI", "Identity"],
      },
      {
        title: "Protocol Scale — ReelinRegistry.sol",
        emphasis: "Under 50ms at multi-million nodes",
        description:
          "We harden the EVM ledger to process and verify multi-million node spatial queries in under 50 milliseconds. The infrastructure is built for a hundred million users from day one of the spatial era.",
        tags: ["Infrastructure", "On-Chain"],
      },
    ],
  },
];

export const MOAT_PILLARS = [
  {
    id: "reelin",
    name: "Reelin AI / VR",
    role: "Consumer Habit Engine & 3D Spatial Identity",
    description: "Creates the daily behavioral loop and spatial presence that makes users psychologically unable to leave.",
    metric: "500K users",
  },
  {
    id: "swiftdroom",
    name: "Swiftdroom",
    role: "Utility Wave & Fast-Cash SaaS Engine",
    description: "Solves a real, immediate human problem on day one — generating predictable cash that funds every layer below it.",
    metric: "$1.5M MRR",
  },
  {
    id: "reelin-id",
    name: "Reelin ID Protocol",
    role: "B2B Infrastructure · Enterprise TAM",
    description: "The trust layer that every company on the internet will eventually pay for. Infrastructure companies don't get acquired — they become acquirers.",
    metric: "Internet-scale B2B",
  },
];

export const FLYWHEEL_STEPS = [
  { step: "01", title: "Swiftdroom utility revenue", body: "Cash-flows all heavy R&D — we never need to go back to investors for operational runway." },
  { step: "02", title: "Brand placement engine", body: "Stacks on top of subscriptions to create a second, high-margin revenue stream with zero marginal cost." },
  { step: "03", title: "Twin behavioral data", body: "Trains the physical intelligence models that no competitor can replicate — a compounding data moat." },
  { step: "04", title: "Spatial VR unlock", body: "Opens the next order of social scale — a category no incumbent social company is positioned to compete in." },
];
