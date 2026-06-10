/** Press outlets for Reelin AI journalist outreach — each maps to Contact.source. */
export const PRESS_OUTLET_IDS = [
  "techcrunch",
  "businessinsider",
  "theverge",
  "wired",
  "arstechnica",
  "venturebeat",
  "fastcompany",
  "fortune",
  "cnbc",
  "axios",
  "semafor",
  "mashable",
  "engadget",
  "gizmodo",
  "vox",
] as const;

export type PressOutletId = (typeof PRESS_OUTLET_IDS)[number];

export interface PressStaffMember {
  name: string;
  title: string;
  slug: string;
}

export interface PressOutletConfig {
  id: PressOutletId;
  label: string;
  company: string;
  staffPageUrl: string;
  baseUrl: string;
  /** Build canonical author profile URL from slug */
  authorProfileUrl: (slug: string) => string;
  /** Preferred email domains for ranking */
  emailDomains: string[];
  /** Term used in Google: `"Name" {googleBrand} email` */
  googleBrand: string;
  /** Firestore doc id prefix */
  docPrefix: string;
  /** Regex to find author links on staff pages (capture group 1 = path segment slug) */
  authorSlugPattern: RegExp;
  /** Known tech/AI/startup reporters — used when staff page blocks scrapers */
  staff: PressStaffMember[];
}

export const PRESS_OUTLETS: Record<PressOutletId, PressOutletConfig> = {
  techcrunch: {
    id: "techcrunch",
    label: "TechCrunch",
    company: "TechCrunch",
    staffPageUrl: "https://techcrunch.com/about-techcrunch/",
    baseUrl: "https://techcrunch.com",
    authorProfileUrl: (slug) => `https://techcrunch.com/author/${slug}/`,
    emailDomains: ["techcrunch.com"],
    googleBrand: "techcrunch",
    docPrefix: "tc",
    authorSlugPattern: /\/author\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Connie Loizos", title: "Editor in Chief", slug: "connie-loizos" },
      { name: "Russell Brandom", title: "AI Editor", slug: "russell-brandom" },
      { name: "Julie Bort", title: "Venture Editor", slug: "julie-bort" },
      { name: "Sarah Perez", title: "Consumer News Editor", slug: "sarah-perez" },
      { name: "Zack Whittaker", title: "Security Editor", slug: "zack-whittaker" },
      { name: "Dominic-Madori Davis", title: "Senior Reporter, Venture", slug: "dominic-madori-davis" },
      { name: "Marina Temkin", title: "Reporter, Venture", slug: "marina-temkin" },
      { name: "Rebecca Bellan", title: "Senior Reporter", slug: "rebecca-bellan" },
      { name: "Amanda Silberling", title: "Senior Writer", slug: "amanda-silberling" },
      { name: "Lucas Ropek", title: "Senior Writer", slug: "lucas-ropek" },
      { name: "Ivan Mehta", title: "Contributor", slug: "ivan-mehta" },
      { name: "Anthony Ha", title: "Contributor", slug: "anthony-ha" },
    ],
  },

  businessinsider: {
    id: "businessinsider",
    label: "Business Insider",
    company: "Business Insider",
    staffPageUrl: "https://www.businessinsider.com/masthead",
    baseUrl: "https://www.businessinsider.com",
    authorProfileUrl: (slug) => `https://www.businessinsider.com/author/${slug}`,
    emailDomains: ["businessinsider.com", "insider.com", "insider-inc.com"],
    googleBrand: "business insider",
    docPrefix: "bi",
    authorSlugPattern: /\/author\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Leena Rao", title: "Executive Editor, Tech", slug: "leena-rao" },
      { name: "Hayley Peterson Herrin", title: "Executive Editor, Innovation", slug: "hayley-peterson" },
      { name: "Zak Jason", title: "Executive Editor, Discourse", slug: "zak-jason" },
      { name: "Cadie Thompson", title: "Executive Editor, Business", slug: "cadie-thompson" },
      { name: "Steve Russolillo", title: "Chief News Editor", slug: "steve-russolillo" },
      { name: "Joe Ciolli", title: "Executive Editor, Money", slug: "joe-ciolli" },
      { name: "Mia de Graaf", title: "Executive Editor, Life", slug: "mia-de-graaf" },
      { name: "Sally Kaplan", title: "Executive Editor, Reviews", slug: "sally-kaplan" },
      { name: "Lina Batarags", title: "Executive Editor, International", slug: "lina-batarags" },
      { name: "Julia Hood", title: "Executive Editor, Strategic Initiatives", slug: "julia-hood" },
    ],
  },

  theverge: {
    id: "theverge",
    label: "The Verge",
    company: "The Verge",
    staffPageUrl: "https://www.theverge.com/pages/about-the-verge",
    baseUrl: "https://www.theverge.com",
    authorProfileUrl: (slug) => `https://www.theverge.com/authors/${slug}`,
    emailDomains: ["theverge.com", "voxmedia.com"],
    googleBrand: "the verge",
    docPrefix: "verge",
    authorSlugPattern: /\/authors?\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Nilay Patel", title: "Editor-in-Chief", slug: "nilay-patel" },
      { name: "Jess Weatherbed", title: "News Writer, AI", slug: "jess-weatherbed" },
      { name: "Victoria Song", title: "Senior Reviewer", slug: "victoria-song" },
      { name: "Mitchell Clark", title: "News Writer", slug: "mitchell-clark" },
      { name: "Antonio G. Di Benedetto", title: "Deals Writer", slug: "antonio-di-benedetto" },
      { name: "Emma Roth", title: "News Writer", slug: "emma-roth" },
      { name: "Terrence O'Brien", title: "Managing Editor", slug: "terrence-obrien" },
      { name: "David Pierce", title: "Editor-at-Large", slug: "david-pierce" },
    ],
  },

  wired: {
    id: "wired",
    label: "Wired",
    company: "Wired",
    staffPageUrl: "https://www.wired.com/about/wired-staff/",
    baseUrl: "https://www.wired.com",
    authorProfileUrl: (slug) => `https://www.wired.com/author/${slug}/`,
    emailDomains: ["wired.com", "condenast.com"],
    googleBrand: "wired",
    docPrefix: "wired",
    authorSlugPattern: /\/author\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Will Knight", title: "Senior Writer, AI", slug: "will-knight" },
      { name: "Kate Knibbs", title: "Senior Writer", slug: "kate-knibbs" },
      { name: "Lauren Goode", title: "Senior Writer", slug: "lauren-goode" },
      { name: "Steven Levy", title: "Editor at Large", slug: "steven-levy" },
      { name: "Paresh Dave", title: "Senior Writer", slug: "paresh-dave" },
      { name: "Reece Rogers", title: "Service Writer", slug: "reece-rogers" },
      { name: "Boone Ashworth", title: "Associate Review Editor", slug: "boone-ashworth" },
    ],
  },

  arstechnica: {
    id: "arstechnica",
    label: "Ars Technica",
    company: "Ars Technica",
    staffPageUrl: "https://arstechnica.com/staff/",
    baseUrl: "https://arstechnica.com",
    authorProfileUrl: (slug) => `https://arstechnica.com/author/${slug}/`,
    emailDomains: ["arstechnica.com", "condenast.com"],
    googleBrand: "ars technica",
    docPrefix: "ars",
    authorSlugPattern: /\/author\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Ron Amadeo", title: "Reviews Editor", slug: "ron-amadeo" },
      { name: "Benj Edwards", title: "AI & ML Reporter", slug: "benj-edwards" },
      { name: "Jonathan M. Gitlin", title: "Automotive Editor", slug: "jonathan-m-gitlin" },
      { name: "Andrew Cunningham", title: "Deputy Editor", slug: "andrew-cunningham" },
      { name: "Kyle Orland", title: "Senior Gaming Editor", slug: "kyle-orland" },
      { name: "Jennifer Ouellette", title: "Senior Writer", slug: "jennifer-ouellette" },
    ],
  },

  venturebeat: {
    id: "venturebeat",
    label: "VentureBeat",
    company: "VentureBeat",
    staffPageUrl: "https://venturebeat.com/team/",
    baseUrl: "https://venturebeat.com",
    authorProfileUrl: (slug) => `https://venturebeat.com/author/${slug}/`,
    emailDomains: ["venturebeat.com"],
    googleBrand: "venturebeat",
    docPrefix: "vb",
    authorSlugPattern: /\/author\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Michael Nuñez", title: "Editorial Director", slug: "michael-nunez" },
      { name: "Dean Takahashi", title: "Lead Writer", slug: "dean-takahashi" },
      { name: "Emilia David", title: "Reporter", slug: "emilia-david" },
      { name: "Kyle Wiggers", title: "AI Reporter", slug: "kyle-wiggers" },
      { name: "Carl Franzen", title: "AI Editor", slug: "carl-franzen" },
      { name: "Sharon Goldman", title: "Senior Writer, AI", slug: "sharon-goldman" },
    ],
  },

  fastcompany: {
    id: "fastcompany",
    label: "Fast Company",
    company: "Fast Company",
    staffPageUrl: "https://www.fastcompany.com/user",
    baseUrl: "https://www.fastcompany.com",
    authorProfileUrl: (slug) => `https://www.fastcompany.com/user/${slug}`,
    emailDomains: ["fastcompany.com"],
    googleBrand: "fast company",
    docPrefix: "fc",
    authorSlugPattern: /\/user\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Harry McCracken", title: "Global Technology Editor", slug: "harry-mccracken" },
      { name: "Mark Sullivan", title: "Senior Writer", slug: "mark-sullivan" },
      { name: "Chris Dannen", title: "Executive Editor, Technology", slug: "chris-dannen" },
      { name: "Ainsley Harris", title: "Senior Writer", slug: "ainsley-harris" },
      { name: "Katharine Schwab", title: "Senior Editor", slug: "katharine-schwab" },
    ],
  },

  fortune: {
    id: "fortune",
    label: "Fortune",
    company: "Fortune",
    staffPageUrl: "https://fortune.com/section/leadership/",
    baseUrl: "https://fortune.com",
    authorProfileUrl: (slug) => `https://fortune.com/author/${slug}/`,
    emailDomains: ["fortune.com"],
    googleBrand: "fortune",
    docPrefix: "fortune",
    authorSlugPattern: /\/author\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Jeremy Kahn", title: "AI Editor", slug: "jeremy-kahn" },
      { name: "Sharon Goldman", title: "Senior Writer, AI", slug: "sharon-goldman" },
      { name: "Jonathan Vanian", title: "Technology Writer", slug: "jonathan-vanian" },
      { name: "Paige McGlauflin", title: "Reporter", slug: "paige-mcglauflin" },
      { name: "Allie Garfinkle", title: "Senior Writer", slug: "allie-garfinkle" },
    ],
  },

  cnbc: {
    id: "cnbc",
    label: "CNBC",
    company: "CNBC",
    staffPageUrl: "https://www.cnbc.com/cnbc-news-team/",
    baseUrl: "https://www.cnbc.com",
    authorProfileUrl: (slug) => `https://www.cnbc.com/${slug}/`,
    emailDomains: ["cnbc.com", "nbcuni.com"],
    googleBrand: "cnbc",
    docPrefix: "cnbc",
    authorSlugPattern: /cnbc\.com\/([a-z0-9-]+)\/?["']/gi,
    staff: [
      { name: "Josh Lipton", title: "Tech Check Co-Anchor", slug: "josh-lipton" },
      { name: "Deirdre Bosa", title: "Technology Reporter", slug: "deirdre-bosa" },
      { name: "Jordan Novet", title: "Technology Reporter", slug: "jordan-novet" },
      { name: "Kif Leswing", title: "Technology Reporter", slug: "kif-leswing" },
      { name: "Lora Kolodny", title: "Technology Reporter", slug: "lora-kolodny" },
      { name: "Ashley Capoot", title: "Technology Reporter", slug: "ashley-capoot" },
    ],
  },

  axios: {
    id: "axios",
    label: "Axios",
    company: "Axios",
    staffPageUrl: "https://www.axios.com/about",
    baseUrl: "https://www.axios.com",
    authorProfileUrl: (slug) => `https://www.axios.com/authors/${slug}`,
    emailDomains: ["axios.com"],
    googleBrand: "axios",
    docPrefix: "axios",
    authorSlugPattern: /\/authors\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Ina Fried", title: "Chief Technology Correspondent", slug: "ina-fried" },
      { name: "Dan Primack", title: "Business Editor", slug: "dan-primack" },
      { name: "Kia Kokalitcheva", title: "Venture Capital Reporter", slug: "kia-kokalitcheva" },
      { name: "Scott Rosenberg", title: "Technology Editor", slug: "scott-rosenberg" },
      { name: "Megan Farokhmanesh", title: "Technology Reporter", slug: "megan-farokhmanesh" },
    ],
  },

  semafor: {
    id: "semafor",
    label: "Semafor",
    company: "Semafor",
    staffPageUrl: "https://www.semafor.com/about",
    baseUrl: "https://www.semafor.com",
    authorProfileUrl: (slug) => `https://www.semafor.com/author/${slug}`,
    emailDomains: ["semafor.com"],
    googleBrand: "semafor",
    docPrefix: "semafor",
    authorSlugPattern: /\/author\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Liz Hoffman", title: "Business & Finance Editor", slug: "liz-hoffman" },
      { name: "Reed Albergotti", title: "Technology Editor", slug: "reed-albergotti" },
      { name: "Jay Solomon", title: "Executive Editor", slug: "jay-solomon" },
      { name: "Tim Higgins", title: "Reporter", slug: "tim-higgins" },
      { name: "Sheila Dang", title: "Technology Reporter", slug: "sheila-dang" },
    ],
  },

  mashable: {
    id: "mashable",
    label: "Mashable",
    company: "Mashable",
    staffPageUrl: "https://mashable.com/about",
    baseUrl: "https://mashable.com",
    authorProfileUrl: (slug) => `https://mashable.com/author/${slug}`,
    emailDomains: ["mashable.com", "ziffmedia.com"],
    googleBrand: "mashable",
    docPrefix: "mash",
    authorSlugPattern: /\/author\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Kimberly Gedeon", title: "Tech Editor", slug: "kimberly-gedeon" },
      { name: "Alex Perry", title: "Senior Tech Writer", slug: "alex-perry" },
      { name: "Cecily Mauran", title: "Tech Reporter", slug: "cecily-mauran" },
      { name: "Matt Binder", title: "Tech Reporter", slug: "matt-binder" },
    ],
  },

  engadget: {
    id: "engadget",
    label: "Engadget",
    company: "Engadget",
    staffPageUrl: "https://www.engadget.com/about/editors/",
    baseUrl: "https://www.engadget.com",
    authorProfileUrl: (slug) => `https://www.engadget.com/about/bio/${slug}/`,
    emailDomains: ["engadget.com", "yahoo-inc.com"],
    googleBrand: "engadget",
    docPrefix: "eng",
    authorSlugPattern: /\/bio\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Devindra Hardawar", title: "Senior Editor", slug: "devindra-hardawar" },
      { name: "Karissa Bell", title: "Senior Editor", slug: "karissa-bell" },
      { name: "Igor Bonifacic", title: "Senior Editor", slug: "igor-bonifacic" },
      { name: "Mat Smith", title: "Bureau Chief, UK", slug: "mat-smith" },
    ],
  },

  gizmodo: {
    id: "gizmodo",
    label: "Gizmodo",
    company: "Gizmodo",
    staffPageUrl: "https://gizmodo.com/about",
    baseUrl: "https://gizmodo.com",
    authorProfileUrl: (slug) => `https://gizmodo.com/author/${slug}`,
    emailDomains: ["gizmodo.com"],
    googleBrand: "gizmodo",
    docPrefix: "giz",
    authorSlugPattern: /\/author\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Thomas Ricker", title: "Deputy Editor", slug: "thomas-ricker" },
      { name: "Kyle Barr", title: "Senior Reporter", slug: "kyle-barr" },
      { name: "Lucas Ropek", title: "Senior Writer", slug: "lucas-ropek" },
      { name: "Andrew Liszewski", title: "Senior Writer", slug: "andrew-liszewski" },
    ],
  },

  vox: {
    id: "vox",
    label: "Vox",
    company: "Vox",
    staffPageUrl: "https://www.vox.com/pages/contact",
    baseUrl: "https://www.vox.com",
    authorProfileUrl: (slug) => `https://www.vox.com/authors/${slug}`,
    emailDomains: ["vox.com", "voxmedia.com"],
    googleBrand: "vox",
    docPrefix: "vox",
    authorSlugPattern: /\/authors\/([a-z0-9-]+)/gi,
    staff: [
      { name: "Nilay Patel", title: "Editor-at-Large", slug: "nilay-patel" },
      { name: "Rebecca Heilweil", title: "Reporter", slug: "rebecca-heilweil" },
      { name: "Emily Stewart", title: "Senior Reporter", slug: "emily-stewart" },
      { name: "Peter Kafka", title: "Media Reporter", slug: "peter-kafka" },
    ],
  },
};

export function isPressOutletId(value: string): value is PressOutletId {
  return (PRESS_OUTLET_IDS as readonly string[]).includes(value);
}

export function isPressSource(source: unknown): source is PressOutletId {
  return typeof source === "string" && isPressOutletId(source);
}

export function getPressOutlet(id: PressOutletId): PressOutletConfig {
  return PRESS_OUTLETS[id];
}

export function listPressOutlets(): Array<{ id: PressOutletId; label: string; company: string }> {
  return PRESS_OUTLET_IDS.map((id) => ({
    id,
    label: PRESS_OUTLETS[id].label,
    company: PRESS_OUTLETS[id].company,
  }));
}

/** Non-press contact sources (investors, social, manual). */
export const NON_PRESS_CONTACT_SOURCES = [
  "crunchbase",
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
  "tiktok",
  "manual",
  "extension",
] as const;

export type NonPressContactSource = (typeof NON_PRESS_CONTACT_SOURCES)[number];

export type ContactSource = NonPressContactSource | PressOutletId;

export const ALL_CONTACT_SOURCES = [
  ...NON_PRESS_CONTACT_SOURCES,
  ...PRESS_OUTLET_IDS,
] as const;

export function isJournalistSource(source: unknown): boolean {
  return isPressSource(source);
}
