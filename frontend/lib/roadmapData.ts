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
    subheadline: "We are building a persistent AI identity layer — not just a social app — with engagement mechanics designed for long-term retention.",
    userTarget: 50_000,
    revenueNote: "A hard paywall on Swiftdroom will establish early predictable SaaS revenue from day one of launch.",
    color: "#10b981",
    accentDark: "#059669",
    emoji: "⚡",
    milestones: [
      {
        title: "Reelin AI Consumer Launch",
        emphasis: "Twin-to-Twin Chat & Video Calls",
        description:
          "We will formally launch the Reelin AI consumer application with Twin-to-Twin Chat and Video Calls. Users will be able to interact with each other's AI twins asynchronously, enabling a social network that operates on their behalf around the clock.",
        tags: ["Reelin AI", "Core Launch"],
      },
      {
        title: "Swiftdroom Phase 1",
        emphasis: "The Utility Wedge",
        description:
          "We will exit closed beta and open Swiftdroom to the public — an AI career agent that automatically fills forms and submits job applications on behalf of users. By solving a high-friction, high-volume problem immediately, we project 50,000 registered users within the first 90 days of launch.",
        tags: ["Swiftdroom", "SaaS Revenue"],
      },
      {
        title: "Reelin ID — On-Chain Identity",
        emphasis: "Agent credentials anchored to their human owner",
        description:
          "Every user who onboards through Swiftdroom or Reelin AI will be issued a Reelin Passport — a cryptographic, on-chain agent credential provisioned invisibly behind a standard Google sign-in. This ensures the identity layer is active across all products from day one.",
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
    subheadline: "We will convert twin interactions into revenue events by embedding commerce directly into the social layer.",
    userTarget: 150_000,
    revenueNote: "Brand placement and B2B API licensing will stack on top of existing SaaS subscriptions, creating three parallel revenue streams by end of Q4.",
    color: "#8b5cf6",
    accentDark: "#7c3aed",
    emoji: "🚀",
    milestones: [
      {
        title: "Swiftdroom Phase 2",
        emphasis: "Beyond Job Applications",
        description:
          "We will expand Swiftdroom beyond job applications into independent marketplaces and freelancer platforms. Users will be able to delegate outreach, negotiation, and contract management to their AI agent — establishing Swiftdroom as a full economic utility, not just a job tool.",
        tags: ["Swiftdroom", "Autonomous Agents"],
      },
      {
        title: "Native Brand Integrations",
        emphasis: "Digital product placement at scale",
        description:
          "We will open a brand integration channel that allows companies to place verified digital products on twin avatars. Users will be able to purchase the physical items linked to what their twin is wearing in a single click — creating a commerce layer embedded within the social graph.",
        tags: ["Commerce", "Brand Revenue"],
      },
      {
        title: "Reelin ID API — Commercialization",
        emphasis: "POST /api/v1/verify goes live",
        description:
          "We will open the Reelin ID verification gateway to third-party platforms, ATS systems, and job boards. Any company that needs to distinguish human-backed agents from unauthorized automation will be able to license the API — generating recurring B2B revenue that scales with the volume of agentic internet traffic.",
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
    subheadline: "We will extend the Reelin identity layer beyond consumer screens and into physical and industrial environments.",
    userTarget: 300_000,
    revenueNote: "Swiftdroom SaaS revenue will fully fund this phase of R&D. Enterprise licensing agreements with early industrial partners are targeted for Q1.",
    color: "#f97316",
    accentDark: "#ea580c",
    emoji: "🤖",
    milestones: [
      {
        title: "Industrial & Robotics Expansion",
        emphasis: "Proprietary behavioral data → physical reasoning models",
        description:
          "By Q1 2027, we will have accumulated two years of unique twin interaction data. We will use this dataset to train specialized physical reasoning models. No competitor will have access to this data — it is proprietary, non-replicable, and forms the foundation of our long-term technical moat.",
        tags: ["Robotics", "Proprietary Data"],
      },
      {
        title: "Strategic Hardware Joint Ventures",
        emphasis: "Reelin Agentic Brain as the OS",
        description:
          "We will pursue joint ventures with robotics and hardware firms to position the Reelin Agentic Brain as the primary cloud and edge operating system for automated industrial units. We will not manufacture hardware — we will become the intelligence layer that runs it.",
        tags: ["JV Partnerships", "B2B"],
      },
      {
        title: "Protocol Supremacy",
        emphasis: "The internet's trust standard",
        description:
          "We will establish Reelin ID as the default protocol for distinguishing human-backed agents from unauthorized machine automation across the public internet. As agentic traffic continues to scale, we will be positioned as critical infrastructure — a category that commands durable, high-multiple enterprise valuations.",
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
    subheadline: "We will bring the Reelin identity and commerce layer into immersive spatial environments, opening the next scale of social interaction.",
    userTarget: 450_000,
    revenueNote: "The spatial launch announcement is expected to generate significant waitlist demand ahead of the Q2 release window.",
    color: "#3b82f6",
    accentDark: "#2563eb",
    emoji: "🌐",
    milestones: [
      {
        title: "Spatial Experience Launch",
        emphasis: "Native VR environment on premium headsets",
        description:
          "We will ship a native immersive environment on premium VR headsets. Users will be able to enter a 3D social world built on the same identity and commerce infrastructure already proven in our 2D product — meaning all existing user data, credentials, and integrations transfer without friction.",
        tags: ["VR", "Spatial Computing"],
      },
      {
        title: "Living Spatial Avatars",
        emphasis: "AI twin as fully embodied presence",
        description:
          "Within the spatial environment, users' AI twins will serve as their embodied avatars — attending digital events, conducting on-chain commerce, and socializing in three dimensions. This evolves the twin from a background agent into a persistent, visible presence in a shared world.",
        tags: ["Reelin AI", "Identity"],
      },
      {
        title: "Protocol Scale — ReelinRegistry.sol",
        emphasis: "Sub-50ms verification at multi-million nodes",
        description:
          "We will harden the EVM ledger to process and verify multi-million node spatial queries in under 50 milliseconds. This infrastructure investment ensures the protocol can support a user base of hundreds of millions from the earliest days of the spatial era.",
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
    description: "We will build a daily behavioral loop and spatial presence layer that drives long-term user retention across both 2D and immersive environments.",
    metric: "500K users",
  },
  {
    id: "swiftdroom",
    name: "Swiftdroom",
    role: "Utility SaaS Engine",
    description: "We will solve a high-friction, high-volume problem for users on day one — generating predictable subscription revenue that funds the infrastructure layers above and below it.",
    metric: "$1.5M MRR",
  },
  {
    id: "reelin-id",
    name: "Reelin ID Protocol",
    role: "B2B Infrastructure · Enterprise TAM",
    description: "We will establish Reelin ID as the trust layer for agentic internet traffic — a protocol that enterprises, platforms, and developers will license as AI agent usage continues to scale globally.",
    metric: "Internet-scale B2B",
  },
];

export const FLYWHEEL_STEPS = [
  { step: "01", title: "Swiftdroom utility revenue", body: "Will fund all R&D operations, removing dependency on additional capital raises for operational runway." },
  { step: "02", title: "Brand placement engine", body: "Will stack on top of subscriptions to create a second high-margin revenue stream with no incremental infrastructure cost." },
  { step: "03", title: "Twin behavioral data", body: "Will train physical intelligence models that no competitor can replicate — a compounding proprietary data moat." },
  { step: "04", title: "Spatial VR unlock", body: "Will open the next order of social scale in a category where no incumbent social platform is currently positioned to compete." },
];
