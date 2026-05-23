// ─── Card Types ───────────────────────────────────────────────────────────────

export type Network = "VISA" | "MASTERCARD" | "AMEX";

export type SpendCategory = "groceries" | "dining" | "travel" | "bills" | "other";

export type SpendProfile = Record<SpendCategory, number>;

export interface EarnRate extends Record<SpendCategory, number> {}

export interface CreditCard {
  id: string;
  bank: string;
  name: string;
  network: Network;
  bonus: number;            // raw points
  bonusValue: number;       // AUD equivalent of bonus
  annualFee: number;
  minSpend: number;
  spendPeriod: number;      // months to hit minSpend
  earnRate: EarnRate;
  bestFor: SpendCategory[];
  tag: string;
  accent: string;
  bg: [string, string];
  transferPartners: string[];
  approxAprRange: [number, number];
  rewardProgram: string;

  // ── Sequence planning fields ───────────────────────────────────────────────
  bankFamily: string;        // cards in same family can't be held simultaneously
                             // e.g. "anz", "westpac", "amex", "nab", "citi", "commbank"
  cooldownMonths: number;    // months after closing before bonus is earnable again
  bonusOnceInLifetime: boolean; // true = Amex lifetime language — never eligible again
  canHoldWithBank: string[]; // bankFamilies this card CAN coexist with simultaneously
                             // (empty = any bank is fine, just not same family)
}

// ─── Redemption Goals ─────────────────────────────────────────────────────────

export interface RedemptionGoal {
  id: string;
  label: string;
  description: string;
  pointsRequired: number;
  estimatedValue: number;
  category: "flights" | "hotels" | "cashback" | "gift_cards";
  airline?: string;
  cabin?: "economy" | "business" | "first";
  route?: string;
}

export const REDEMPTION_GOALS: RedemptionGoal[] = [
  {
    id: "syd-tokyo-biz",
    label: "Sydney → Tokyo",
    description: "Business Class return",
    pointsRequired: 180000,
    estimatedValue: 4200,
    category: "flights",
    airline: "Qantas",
    cabin: "business",
    route: "SYD → NRT",
  },
  {
    id: "mel-bali-eco",
    label: "Free Bali Holiday",
    description: "Return economy + 3 nights hotel",
    pointsRequired: 80000,
    estimatedValue: 1800,
    category: "flights",
    airline: "Qantas",
    cabin: "economy",
    route: "MEL → DPS",
  },
  {
    id: "syd-london-biz",
    label: "Sydney → London",
    description: "Business Class one-way",
    pointsRequired: 280000,
    estimatedValue: 7500,
    category: "flights",
    airline: "Qantas",
    cabin: "business",
    route: "SYD → LHR",
  },
  {
    id: "cashback-500",
    label: "$500 Cash Back",
    description: "Statement credit on your account",
    pointsRequired: 75000,
    estimatedValue: 500,
    category: "cashback",
  },
  {
    id: "maldives-pts",
    label: "Maldives Overwater Villa",
    description: "5 nights, points transfer to Marriott",
    pointsRequired: 240000,
    estimatedValue: 6000,
    category: "hotels",
    route: "via Marriott Bonvoy",
  },
  {
    id: "upgrade-domestic",
    label: "Domestic Upgrade",
    description: "Upgrade to Business on any domestic Qantas flight",
    pointsRequired: 18000,
    estimatedValue: 350,
    category: "flights",
    airline: "Qantas",
    cabin: "business",
    route: "Any AU domestic",
  },
];

// ─── Card Database ────────────────────────────────────────────────────────────

export const ALL_CARDS: CreditCard[] = [
  {
    id: "westpac-altitude",
    bank: "Westpac",
    name: "Altitude Black",
    network: "MASTERCARD",
    bonus: 150000,
    bonusValue: 750,
    annualFee: 250,
    minSpend: 4000,
    spendPeriod: 3,
    earnRate: { groceries: 2, dining: 3, travel: 3, bills: 1, other: 1 },
    bestFor: ["travel", "dining"],
    tag: "Best value overall",
    accent: "#F97316",
    bg: ["#2a1a0f", "#1a0f07"],
    transferPartners: ["Qantas", "Velocity", "Singapore Airlines"],
    approxAprRange: [19.99, 21.99],
    rewardProgram: "Altitude Rewards",
    bankFamily: "westpac",
    cooldownMonths: 12,
    bonusOnceInLifetime: false,
    canHoldWithBank: [],
  },
  {
    id: "anz-ff-black",
    bank: "ANZ",
    name: "Frequent Flyer Black",
    network: "VISA",
    bonus: 80000,
    bonusValue: 640,
    annualFee: 425,
    minSpend: 2500,
    spendPeriod: 3,
    earnRate: { groceries: 1, dining: 1, travel: 2, bills: 1, other: 1 },
    bestFor: ["travel"],
    tag: "Best for Qantas flyers",
    accent: "#60A5FA",
    bg: ["#1c2b4a", "#121e35"],
    transferPartners: ["Qantas"],
    approxAprRange: [20.24, 20.24],
    rewardProgram: "Qantas Frequent Flyer",
    bankFamily: "anz",
    cooldownMonths: 12,
    bonusOnceInLifetime: false,
    canHoldWithBank: [],
  },
  {
    id: "nab-qantas",
    bank: "NAB",
    name: "Qantas Rewards Signature",
    network: "VISA",
    bonus: 90000,
    bonusValue: 720,
    annualFee: 395,
    minSpend: 3000,
    spendPeriod: 3,
    earnRate: { groceries: 1, dining: 2, travel: 2, bills: 1, other: 1 },
    bestFor: ["dining", "travel"],
    tag: "Best earn rate on dining",
    accent: "#A78BFA",
    bg: ["#1a1040", "#0d0a28"],
    transferPartners: ["Qantas"],
    approxAprRange: [19.99, 19.99],
    rewardProgram: "Qantas Frequent Flyer",
    bankFamily: "nab",
    cooldownMonths: 18,
    bonusOnceInLifetime: false,
    canHoldWithBank: [],
  },
  {
    id: "amex-platinum",
    bank: "American Express",
    name: "Platinum Edge",
    network: "AMEX",
    bonus: 100000,
    bonusValue: 800,
    annualFee: 195,
    minSpend: 3000,
    spendPeriod: 3,
    earnRate: { groceries: 3, dining: 2, travel: 2, bills: 1, other: 1 },
    bestFor: ["groceries", "other"],
    tag: "Lowest fee / highest net value",
    accent: "#F2C94C",
    bg: ["#1a3350", "#0f2236"],
    transferPartners: ["Qantas", "Velocity", "Singapore KrisFlyer", "Marriott"],
    approxAprRange: [23.99, 23.99],
    rewardProgram: "Membership Rewards",
    // Amex: can hold Amex cards simultaneously but bonus is once-in-lifetime
    // for some products. Platinum Edge is NOT once-in-lifetime (it was removed
    // from that list in 2023) — but we flag it conservatively.
    bankFamily: "amex",
    cooldownMonths: 18,
    bonusOnceInLifetime: false,
    canHoldWithBank: [],
  },
  {
    id: "citi-premier",
    bank: "Citibank",
    name: "Premier",
    network: "VISA",
    bonus: 75000,
    bonusValue: 600,
    annualFee: 300,
    minSpend: 3000,
    spendPeriod: 3,
    earnRate: { groceries: 2, dining: 2, travel: 3, bills: 1, other: 1 },
    bestFor: ["travel", "dining"],
    tag: "Best for international travel",
    accent: "#34D399",
    bg: ["#0d2d22", "#071a14"],
    transferPartners: ["Velocity", "Singapore KrisFlyer", "Cathay Pacific"],
    approxAprRange: [21.49, 21.49],
    rewardProgram: "Citi Rewards",
    bankFamily: "citi",
    cooldownMonths: 12,
    bonusOnceInLifetime: false,
    canHoldWithBank: [],
  },
  {
    id: "commbank-awards",
    bank: "CommBank",
    name: "Diamond Awards",
    network: "MASTERCARD",
    bonus: 120000,
    bonusValue: 700,
    annualFee: 350,
    minSpend: 5000,
    spendPeriod: 4,
    earnRate: { groceries: 2, dining: 2, travel: 2, bills: 2, other: 1.5 },
    bestFor: ["bills", "other"],
    tag: "Best for high spenders",
    accent: "#FB923C",
    bg: ["#2a1505", "#1a0d03"],
    transferPartners: ["Qantas", "Velocity"],
    approxAprRange: [20.74, 20.74],
    rewardProgram: "CommBank Awards",
    bankFamily: "commbank",
    cooldownMonths: 12,
    bonusOnceInLifetime: false,
    canHoldWithBank: [],
  },
];

export const SPEND_CATEGORIES: {
  key: SpendCategory; label: string; color: string; max: number; icon: string;
}[] = [
  { key: "groceries", label: "Groceries",  color: "#4ade80", max: 5000, icon: "🛒" },
  { key: "dining",    label: "Dining Out", color: "#f97316", max: 3000, icon: "🍽" },
  { key: "travel",    label: "Travel",     color: "#60a5fa", max: 5000, icon: "✈"  },
  { key: "bills",     label: "Bills",      color: "#a78bfa", max: 4000, icon: "⚡" },
  { key: "other",     label: "Other",      color: "#f472b6", max: 3000, icon: "📦" },
];