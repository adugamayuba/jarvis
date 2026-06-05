import {
  Rocket,
  Users,
  BarChart3,
  Gift,
  FileText,
  Puzzle,
  Search,
  Mail,
  Send,
  TrendingUp,
  Upload,
  BookOpen,
  Zap,
  Star,
  Video,
  type LucideIcon,
} from "lucide-react";

export type ToolStatus = "live" | "coming_soon" | "in_progress";

export interface GrowthTool {
  id: string;
  label: string;
  description: string;
  href?: string;
  externalHref?: string;
  status: ToolStatus;
  icon: LucideIcon;
}

export interface Subsidiary {
  id: string;
  slug: string;
  name: string;
  category: string;
  website: string;
  status: string;
  tagline: string;
  /** Monthly recurring revenue target (USD) */
  mrrGoal?: number;
  /** Current MRR — update manually until Swiftdroom API is wired */
  currentMrr?: number;
  /** Fundraising target for venture subsidiaries */
  raiseGoal?: number;
  raised?: number;
  hasGrowthHub: boolean;
  growthTools: GrowthTool[];
  /** Pipeline tools that live elsewhere in Jarvis (Reelin only today) */
  pipelineTools?: GrowthTool[];
}

export const SWIFTDROOM_MRR_GOAL = 100_000;

export const SUBSIDIARIES: Subsidiary[] = [
  {
    id: "swiftdroom",
    slug: "swiftdroom",
    name: "Swiftdroom",
    category: "Job Search · SaaS",
    website: "swiftdroom.com",
    status: "Chrome Store pending",
    tagline: "Job application co-pilot — autofill ATS forms, AI essay drafts, track applications.",
    mrrGoal: SWIFTDROOM_MRR_GOAL,
    currentMrr: 0,
    hasGrowthHub: true,
    growthTools: [
      {
        id: "launch",
        label: "Launch Engine",
        description: "Chrome Store go-live, Product Hunt, Hacker News, and launch email copy.",
        href: "/subsidiaries/swiftdroom/launch",
        status: "live",
        icon: Rocket,
      },
      {
        id: "creators",
        label: "Creator Outreach",
        description: "Find job-search TikTok, Reddit & LinkedIn creators for partnerships.",
        href: "/influencers-finder",
        status: "live",
        icon: Star,
      },
      {
        id: "growth-dash",
        label: "Growth Dashboard",
        description: "Live MRR, subscribers, and application usage synced from Swiftdroom.",
        href: "/subsidiaries/swiftdroom",
        status: "live",
        icon: BarChart3,
      },
      {
        id: "referral",
        label: "Referral & Affiliate",
        description: "Share Swiftdroom, get a month free — referral links & tracking.",
        status: "coming_soon",
        icon: Gift,
      },
      {
        id: "seo",
        label: "SEO Content Pipeline",
        description: "ATS landing pages — Workday, Greenhouse, Lever autofill guides.",
        status: "coming_soon",
        icon: FileText,
      },
      {
        id: "extension",
        label: "Chrome Extension",
        description: "v1.0.3 submitted to Web Store — listing pending review.",
        externalHref: "https://swiftdroom.com",
        status: "in_progress",
        icon: Puzzle,
      },
    ],
  },
  {
    id: "reelin",
    slug: "reelin",
    name: "Reelin AI",
    category: "AI Social",
    website: "reelin.ai",
    status: "Raising $10M Seed",
    tagline: "World's first autonomous AI social network — Mark Cuban backed at pre-seed.",
    raiseGoal: 10_000_000,
    raised: 100_000,
    hasGrowthHub: true,
    growthTools: [
      {
        id: "jarvis-ai",
        label: "Jarvis AI",
        description: "Research investors, draft pitches, run outreach playbooks.",
        href: "/jarvis",
        status: "live",
        icon: Zap,
      },
      {
        id: "investors",
        label: "Investor CRM",
        description: "Track pipeline, status, and check sizes.",
        href: "/investors",
        status: "live",
        icon: TrendingUp,
      },
      {
        id: "press",
        label: "Press Outreach",
        description: "TechCrunch journalists — scrape & email from Gmail extension.",
        href: "/scraper",
        status: "live",
        icon: Mail,
      },
    ],
    pipelineTools: [
      { id: "scraper", label: "Scraper", description: "Crunchbase, social, TechCrunch", href: "/scraper", status: "live", icon: Search },
      { id: "import", label: "Import & Emails", description: "CSV import, Apollo, email finder", href: "/import", status: "live", icon: Upload },
      { id: "contacts", label: "Contacts", description: "Full outreach pipeline", href: "/contacts", status: "live", icon: Users },
      { id: "bulk", label: "Bulk Send", description: "Gmail outreach at scale", href: "/bulk", status: "live", icon: Send },
      { id: "campaigns", label: "Campaigns", description: "Email campaign history", href: "/campaigns", status: "live", icon: Mail },
      { id: "applications", label: "Applications", description: "Accelerator auto-fill", href: "/applications", status: "live", icon: Send },
      { id: "documents", label: "Documents", description: "Pitch decks & assets", href: "/documents", status: "live", icon: BookOpen },
      { id: "ugc", label: "UGC", description: "Social content pipeline", href: "/ugc", status: "live", icon: Video },
    ],
  },
  {
    id: "softdroom-capital",
    slug: "softdroom-capital",
    name: "Softdroom AI Capital",
    category: "Venture Capital",
    website: "softdroomai.com",
    status: "Active",
    tagline: "Venture capital arm of Softdroom Holdings.",
    hasGrowthHub: false,
    growthTools: [],
  },
  {
    id: "dasdroom",
    slug: "dasdroom",
    name: "Dasdroom",
    category: "Marketing",
    website: "dasdroom.com",
    status: "Active",
    tagline: "Marketing subsidiary.",
    hasGrowthHub: false,
    growthTools: [],
  },
  {
    id: "skydroom",
    slug: "skydroom",
    name: "Skydroom",
    category: "Luxury Travel",
    website: "skydroom.com",
    status: "Active",
    tagline: "Luxury travel.",
    hasGrowthHub: false,
    growthTools: [],
  },
  {
    id: "droomify",
    slug: "droomify",
    name: "Droomify",
    category: "EdTech",
    website: "droomify.com",
    status: "Active",
    tagline: "Education technology.",
    hasGrowthHub: false,
    growthTools: [],
  },
  {
    id: "stardroom",
    slug: "stardroom",
    name: "Stardroom",
    category: "Real Estate",
    website: "stardroom.com",
    status: "New 2026",
    tagline: "Real estate.",
    hasGrowthHub: false,
    growthTools: [],
  },
  {
    id: "terradroom",
    slug: "terradroom",
    name: "Terradroom",
    category: "Agriculture",
    website: "terradroom.com",
    status: "New 2026",
    tagline: "Agriculture.",
    hasGrowthHub: false,
    growthTools: [],
  },
  {
    id: "gigadroom",
    slug: "gigadroom",
    name: "Gigadroom",
    category: "Consulting",
    website: "gigadroom.com",
    status: "New 2026",
    tagline: "Consulting.",
    hasGrowthHub: false,
    growthTools: [],
  },
];

export function getSubsidiary(slug: string): Subsidiary | undefined {
  return SUBSIDIARIES.find(s => s.slug === slug);
}

export function getGrowthHubSubsidiaries(): Subsidiary[] {
  return SUBSIDIARIES.filter(s => s.hasGrowthHub);
}

export function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
