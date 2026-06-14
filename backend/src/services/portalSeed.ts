/** Cap table + portal seed data for known investors. */
import { getDb, COLLECTIONS } from "./firebase";

const SEED_IDS = {
  softdroom: "cap-softdroom-holdings",
  markCuban: "cap-mark-cuban",
  chrisMullaly: "cap-chris-mullaly",
  lvlupVentures: "cap-lvlup-ventures",
  tenSquared: "cap-tensquared-venture",
} as const;

const AUTHORIZED_SHARES = 10_000_000;

function sharesFromPct(pct: number): number {
  return Math.round((pct / 100) * AUTHORIZED_SHARES);
}

export async function seedPortalCapTable(): Promise<void> {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const col = db.collection(COLLECTIONS.CAP_TABLE);

    const entries = [
      {
        id: SEED_IDS.softdroom,
        holderName: "Softdroom Holdings",
        holderType: "parent",
        company: "Softdroom Holdings",
        websiteUrl: "https://softdroom.com",
        profileImageUrl:
          "https://ui-avatars.com/api/?name=Softdroom&size=256&background=0f172a&color=ffffff&bold=true",
        investmentAmount: 0,
        ownershipPct: 84,
        shares: sharesFromPct(84),
        instrument: "common",
        status: "active",
        visible: true,
        description:
          "Softdroom Holdings is the parent company of Reelin AI and portfolio subsidiaries including Swiftdroom. As the majority shareholder, Softdroom Holdings holds 84% ownership and provides strategic oversight, capital allocation, and shared infrastructure across the group.",
        notes: "Parent company · softdroom.com",
        sortOrder: 0,
      },
      {
        id: SEED_IDS.markCuban,
        holderName: "Mark Cuban",
        holderType: "investor",
        company: "Mark Cuban Companies",
        profileImageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mark_Cuban_by_Gage_Skidmore.jpg/440px-Mark_Cuban_by_Gage_Skidmore.jpg",
        investmentAmount: 100_000,
        valuationAtInvestment: 1_000_000,
        ownershipPct: 10,
        shares: sharesFromPct(10),
        instrument: "safe",
        status: "active",
        visible: true,
        description:
          "Billionaire entrepreneur, investor on Shark Tank, and owner of the Dallas Mavericks. Mark led Reelin AI's pre-seed round with a $100K investment, providing early validation for our autonomous AI social network and identity forking platform.",
        notes: "Pre-seed SAFE · Closed",
        sortOrder: 1,
      },
      {
        id: SEED_IDS.chrisMullaly,
        holderName: "Chris Mullaly",
        holderType: "investor",
        company: "Quantum Angel Network",
        profileImageUrl:
          "https://ui-avatars.com/api/?name=Chris+Mullaly&size=256&background=171717&color=ffffff&bold=true",
        investmentAmount: 10_000,
        valuationAtInvestment: 500_000,
        ownershipPct: 2,
        shares: sharesFromPct(2),
        instrument: "safe",
        status: "active",
        visible: true,
        description:
          "Angel investor through Quantum Angel Network with a track record of backing category-defining robotics and AI companies, including early participation in Figure AI. Chris invested $10K at a $500K valuation.",
        notes: "Pre-seed SAFE · Closed",
        sortOrder: 2,
      },
      {
        id: SEED_IDS.lvlupVentures,
        holderName: "Lvlup Ventures",
        holderType: "investor",
        company: "Lvlup Ventures",
        profileImageUrl:
          "https://ui-avatars.com/api/?name=Lvlup+Ventures&size=256&background=312e81&color=ffffff&bold=true",
        investmentAmount: 2_000_000,
        ownershipPct: 0,
        shares: 0,
        sharesLabel: "Negotiations in progress",
        instrument: "safe",
        status: "discussing",
        visible: true,
        description:
          "Lvlup Ventures is evaluating a lead investment of up to $2M in Reelin AI's seed round. Terms, valuation, and ownership allocation remain subject to active negotiation.",
        notes: "Term sheet in progress",
        sortOrder: 3,
      },
      {
        id: SEED_IDS.tenSquared,
        holderName: "TenSquared Venture",
        holderType: "investor",
        company: "TenSquared Venture",
        profileImageUrl:
          "https://ui-avatars.com/api/?name=TenSquared&size=256&background=0f766e&color=ffffff&bold=true",
        investmentAmount: 500_000,
        ownershipPct: 0,
        shares: 0,
        sharesLabel: "Term negotiation in progress",
        instrument: "safe",
        status: "discussing",
        visible: true,
        description:
          "TenSquared Venture is in active discussions for a $500K allocation in Reelin AI's seed round. Final terms and share count will be confirmed upon completion of the term sheet.",
        notes: "Term negotiation in progress",
        sortOrder: 4,
      },
    ];

    for (const entry of entries) {
      const { id, ...data } = entry;
      const ref = col.doc(id);
      const existing = await ref.get();
      await ref.set(
        {
          ...data,
          createdAt: existing.exists ? existing.data()?.createdAt || now : now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    console.log("✅ Portal cap table seeded");
  } catch (err) {
    console.warn("⚠️  Could not seed portal cap table:", (err as Error).message);
  }
}
