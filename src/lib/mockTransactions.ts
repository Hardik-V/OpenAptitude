import type { SpendProfile } from "./cards";

export interface MockTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: keyof SpendProfile;
  merchant?: string;
}

// ─── These are the ONLY valid profile keys ────────────────────────────────────
export type BankProfileType = "young_professional" | "family" | "frequent_flyer" | "foodie";

const PROFILES: Record<BankProfileType, { label: string; description: string; spend: SpendProfile }> = {
  young_professional: {
    label: "Young Professional",
    description: "City living, Uber Eats, subscriptions",
    spend: { groceries: 600, dining: 800, travel: 400, bills: 500, other: 400 },
  },
  family: {
    label: "Family Household",
    description: "School runs, Coles, Bunnings weekends",
    spend: { groceries: 2200, dining: 400, travel: 300, bills: 1800, other: 700 },
  },
  frequent_flyer: {
    label: "Frequent Flyer",
    description: "Business travel, airport lounges, hotels",
    spend: { groceries: 500, dining: 600, travel: 3200, bills: 400, other: 300 },
  },
  foodie: {
    label: "Food & Lifestyle",
    description: "Restaurants, cafes, groceries, delivery",
    spend: { groceries: 1200, dining: 1400, travel: 200, bills: 500, other: 600 },
  },
};

// Fallback for any stale persisted profileType values that no longer exist
const FALLBACK_PROFILE: BankProfileType = "young_professional";

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

const MERCHANTS: Record<keyof SpendProfile, string[]> = {
  groceries: ["Woolworths", "Coles", "Aldi", "Harris Farm", "IGA"],
  dining:    ["Deliveroo", "Uber Eats", "The Grounds", "Grill'd", "Local cafe"],
  travel:    ["Qantas", "Virgin Australia", "Airbnb", "Booking.com", "Uber"],
  bills:     ["AGL Energy", "Origin Energy", "Telstra", "NBN Co", "Optus"],
  other:     ["Amazon AU", "JB Hi-Fi", "Chemist Warehouse", "Kmart", "H&M"],
};

export function generateMockTransactions(profile: BankProfileType, months = 3): MockTransaction[] {
  // Defensive: fall back if a stale/invalid profileType is passed
  const safeProfile = PROFILES[profile] ? profile : FALLBACK_PROFILE;
  const { spend } = PROFILES[safeProfile];
  const transactions: MockTransaction[] = [];
  let txId = 1;

  for (const [cat, monthlyAmount] of Object.entries(spend) as [keyof SpendProfile, number][]) {
    const txPerMonth = cat === "groceries" ? 8 : cat === "dining" ? 10 : cat === "bills" ? 3 : 5;
    const merchants = MERCHANTS[cat];
    const totalTx = txPerMonth * months;
    const avgAmount = monthlyAmount / txPerMonth;

    for (let i = 0; i < totalTx; i++) {
      const daysAgo = Math.floor((i / totalTx) * months * 30);
      const jitter = (Math.random() - 0.5) * 0.4 * avgAmount;
      const amount = Math.round((avgAmount + jitter) * 100) / 100;
      const merchant = merchants[i % merchants.length];

      transactions.push({
        id: `tx-${txId++}`,
        date: isoDate(daysAgo),
        description: merchant,
        amount,
        category: cat,
        merchant,
      });
    }
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function aggregateToSpendProfile(
  transactions: MockTransaction[],
  months = 3,
): SpendProfile {
  const totals: SpendProfile = { groceries: 0, dining: 0, travel: 0, bills: 0, other: 0 };
  for (const tx of transactions) {
    totals[tx.category] += tx.amount;
  }
  return Object.fromEntries(
    Object.entries(totals).map(([k, v]) => [k, Math.round(v / months)])
  ) as SpendProfile;
}

export { PROFILES };
export type { BankProfileType as ProfileType };