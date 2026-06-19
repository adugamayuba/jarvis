export const ROADMAP_META = {
  title: "12-Month Product Roadmap",
  span: "July 2026 – July 2027",
  tagline: "A sequential flywheel — each phase funds and feeds the next.",
};

export const NORTH_STAR = {
  date: "July 2027",
  users: 500_000,
  paidSubscribers: 50_000,
  paidPct: 10,
  mrr: 1_500_000,
};

export const USER_MILESTONES = [
  { id: "q3-2026", quarter: "Q3 '26", users: 50_000 },
  { id: "q4-2026", quarter: "Q4 '26", users: 150_000 },
  { id: "q1-2027", quarter: "Q1 '27", users: 300_000 },
  { id: "q2-2027", quarter: "Q2 '27", users: 450_000 },
  { id: "north-star", quarter: "Jul '27", users: 500_000 },
];

export type RoadmapMilestone = {
  title: string;
  description: string;
  tags?: string[];
};

export type RoadmapQuarter = {
  id: string;
  label: string;
  period: string;
  phase: string;
  headline: string;
  userTarget: number;
  revenueNote: string;
  color: string;
  milestones: RoadmapMilestone[];
};

export const ROADMAP_QUARTERS: RoadmapQuarter[] = [
  {
    id: "q3-2026",
    label: "Q3 2026",
    period: "Jul – Sep 2026",
    phase: "H2 2026 · Social Utility & Trust Wedge",
    headline: "Consumer Activation & Identity Hook",
    userTarget: 50_000,
    revenueNote: "Hard paywall on Swiftdroom — early predictable SaaS revenue",
    color: "#10b981",
    milestones: [
      {
        title: "Reelin AI Consumer Core",
        description:
          "Formal consumer app launch with Twin-to-Twin Chat and Twin Video/Audio Calls. Users check in on twins asynchronously, or authorize twins to video-call friends' twins to expand organic social circles.",
        tags: ["Reelin AI", "Launch"],
      },
      {
        title: "Swiftdroom Phase 1 — The Utility Wedge",
        description:
          "Exit closed beta. Automated career agent fills forms and applies to corporate jobs natively — solving immediate, high-friction human frustration.",
        tags: ["Swiftdroom", "SaaS"],
      },
      {
        title: "Reelin ID — Infrastructure Anchor",
        description:
          "Mandatory Reelin Passport during Swiftdroom and Reelin AI onboarding. Privy embedded wallets + ID verification webhooks mint on-chain agent credentials invisibly behind Google/X sign-in.",
        tags: ["Reelin ID", "Identity"],
      },
    ],
  },
  {
    id: "q4-2026",
    label: "Q4 2026",
    period: "Oct – Dec 2026",
    phase: "H2 2026 · Social Utility & Trust Wedge",
    headline: "Horizontal Expansion & Direct-to-Avatar Commerce",
    userTarget: 150_000,
    revenueNote: "Brand asset sales + B2B API integrations stack on utility subscriptions",
    color: "#8b5cf6",
    milestones: [
      {
        title: "Swiftdroom Phase 2",
        description:
          "Extend AI career agents into broader applications — independent marketplace actions and freelancer outreach.",
        tags: ["Swiftdroom"],
      },
      {
        title: "Native Brand Integrations",
        description:
          "Digital product placement engine for the social graph. Premium brands (e.g. Nike) launch verified digital apparel. Users outfit 3D AI twin avatars; twins act as brand ambassadors in social and video interactions. Click-to-buy physical equivalents.",
        tags: ["Commerce", "Monetization"],
      },
      {
        title: "Reelin ID API Commercialization",
        description:
          "Open POST /api/v1/verify to third-party platforms, ATS systems, and job boards. Usage-based licensing to filter automated traffic.",
        tags: ["Reelin ID", "B2B"],
      },
    ],
  },
  {
    id: "q1-2027",
    label: "Q1 2027",
    period: "Jan – Mar 2027",
    phase: "H1 2027 · Physical Intelligence & Spatial Social",
    headline: "Deep Tech, Robotics & Industrial Intelligence",
    userTarget: 300_000,
    revenueNote: "Enterprise licensing with early industrial partners",
    color: "#f97316",
    milestones: [
      {
        title: "Physical Intelligence Pivot",
        description:
          "Expand AI agent capabilities into industrial and robotics software — leveraging unique twin interaction data to train specialized physical reasoning models.",
        tags: ["Robotics", "Deep Tech"],
      },
      {
        title: "Strategic Hardware JVs",
        description:
          "Joint ventures with hardware and robotics firms. Position the Reelin Agentic Brain as the primary cloud/edge OS for automated robotic units.",
        tags: ["Partnerships"],
      },
      {
        title: "Protocol Supremacy",
        description:
          "Establish Reelin ID API as the default public internet filter — safely distinguishing human-backed agents from rogue machine automation.",
        tags: ["Reelin ID", "Protocol"],
      },
    ],
  },
  {
    id: "q2-2027",
    label: "Q2 2027",
    period: "Apr – Jun 2027",
    phase: "H1 2027 · Physical Intelligence & Spatial Social",
    headline: "Spatial Social & The VR Frontier",
    userTarget: 450_000,
    revenueNote: "Waitlist acceleration driven by spatial reveal",
    color: "#3b82f6",
    milestones: [
      {
        title: "Spatial Experience Launch",
        description:
          "Immersive native environment on premium VR headsets. Users step into a rich 3D world as their AI twin — attending events, socializing, and conducting on-chain commerce seamlessly.",
        tags: ["VR", "Spatial"],
      },
      {
        title: "Living Spatial Avatars",
        description:
          "Twins become living, breathing spatial avatars — interacting with users and environments while representing identity across the Reelin network.",
        tags: ["Reelin AI"],
      },
      {
        title: "Protocol Scale",
        description:
          "Harden EVM ledger (ReelinRegistry.sol) to process and verify multi-million node spatial queries in under 50ms.",
        tags: ["Infrastructure"],
      },
    ],
  },
];

export const MOAT_PILLARS = [
  {
    id: "reelin",
    name: "Reelin AI / VR",
    role: "Consumer Habit Engine & 3D Spatial Identity",
    description: "The social layer that creates daily engagement and spatial presence at scale.",
  },
  {
    id: "swiftdroom",
    name: "Swiftdroom",
    role: "Direct Utility Wave & Fast-Cash SaaS Engine",
    description: "Immediate utility that generates predictable revenue and funds deep-tech R&D.",
  },
  {
    id: "reelin-id",
    name: "Reelin ID API",
    role: "B2B Infrastructure Protocol / Enterprise TAM",
    description: "The trust layer that monetizes identity verification across the open internet.",
  },
];

export const FLYWHEEL = [
  "Swiftdroom utility revenue cash-flows heavy engineering",
  "Brand placement engine stacks on core subscriptions",
  "Twin data trains physical intelligence models",
  "Spatial VR unlocks the next order of social scale",
];
