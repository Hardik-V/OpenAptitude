// ─── Scoring Engine ───────────────────────────────────────────────────────────

// This is the recommendation moat.

import type { CreditCard, SpendProfile, RedemptionGoal } from "./cards";

export interface ScoreBreakdown {
  total: number;             // 0-1000 composite score

  // Sub-scores (each 0-100, before weighting)
  rewardYield: number;       // ongoing earn value vs. fee
  velocityFit: number;       // can they hit min spend?
  approvalLikelihood: number; // credit history signal
  categoryOptimization: number; // bonus earn alignment
  annualFeeDecay: number;    // fee relative to bonus
  goalAlignment: number;     // how well bonus covers goal
  transferPartnerValue: number; // richness of transfer network

  // Derived
  netBonusValue: number;     // bonusValue - annualFee
  monthlyEarnEstimate: number; // ongoing pts/month
  weeksToBonus: number;      // how long to clear min spend
  feasible: boolean;         // can they hit the min spend
  monthlySpendNeeded: number;
}

export interface ScoredCard {
  card: CreditCard;
  breakdown: ScoreBreakdown;
}

const WEIGHTS = {
  rewardYield:           0.22,
  velocityFit:           0.20,
  approvalLikelihood:    0.12,
  categoryOptimization:  0.18,
  annualFeeDecay:        0.14,
  goalAlignment:         0.10,
  transferPartnerValue:  0.04,
};

/**
 * Score a single card against a spend profile, history, and goal.
 */
export function scoreCard(
  card: CreditCard,
  spend: SpendProfile,
  history: string[],
  goal: RedemptionGoal | null
): ScoreBreakdown {
  const totalMonthly = Object.values(spend).reduce((a, b) => a + b, 0);

  // ── 1. Reward Yield: ongoing earn value per year minus fee
  const monthlyEarn =
    spend.groceries * card.earnRate.groceries +
    spend.dining    * card.earnRate.dining    +
    spend.travel    * card.earnRate.travel    +
    spend.bills     * card.earnRate.bills     +
    spend.other     * card.earnRate.other;
  const annualEarnValue = (monthlyEarn * 12) * 0.008; // ~0.8c per point
  const rewardYieldRaw = Math.min(annualEarnValue / Math.max(card.annualFee, 50), 3);
  const rewardYield = Math.min(100, rewardYieldRaw * 33.3);

  // ── 2. Velocity Fit: can they hit min spend in time?
  const monthlyNeeded = card.minSpend / card.spendPeriod;
  const feasible = totalMonthly >= monthlyNeeded * 0.9;
  const velocityRatio = totalMonthly / monthlyNeeded;
  const velocityFit = Math.min(100, velocityRatio * 80 + (feasible ? 20 : 0));
  const weeksToBonus = feasible
    ? Math.ceil((card.minSpend / totalMonthly) * 4.33)
    : 999;

  // ── 3. Approval Likelihood: penalise recently held cards
  const recentlyHeld = history.includes(card.id);
  const approvalLikelihood = recentlyHeld ? 20 : 85; // simplified — no credit score input

  // ── 4. Category Optimisation: earn rate in user's highest-spend categories
  const sortedCategories = (Object.entries(spend) as [keyof SpendProfile, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k]) => k);
  const topEarnAvg =
    sortedCategories.reduce((sum, cat) => sum + card.earnRate[cat], 0) /
    sortedCategories.length;
  const categoryOptimization = Math.min(100, ((topEarnAvg - 1) / 2) * 100);

  // ── 5. Annual Fee Decay: bonus value relative to fee cost
  const netBonusValue = card.bonusValue - card.annualFee;
  const feeRatio = card.bonusValue / Math.max(card.annualFee, 1);
  const annualFeeDecay = Math.min(100, (feeRatio / 8) * 100);

  // ── 6. Goal Alignment: how many cycles to reach the redemption goal
  let goalAlignment = 50; // neutral if no goal
  if (goal) {
    const cyclesNeeded = goal.pointsRequired / card.bonus;
    // 1 cycle = 100, 2 = 70, 3 = 40, 4+ = 10
    goalAlignment = cyclesNeeded <= 1 ? 100
      : cyclesNeeded <= 2 ? 75
      : cyclesNeeded <= 3 ? 45
      : 15;
  }

  // ── 7. Transfer Partner Value: more partners = more flexibility
  const transferPartnerValue = Math.min(100, card.transferPartners.length * 20);

  // ── Composite
  const total = Math.round(
    rewardYield           * WEIGHTS.rewardYield           * 10 +
    velocityFit           * WEIGHTS.velocityFit           * 10 +
    approvalLikelihood    * WEIGHTS.approvalLikelihood    * 10 +
    categoryOptimization  * WEIGHTS.categoryOptimization  * 10 +
    annualFeeDecay        * WEIGHTS.annualFeeDecay        * 10 +
    goalAlignment         * WEIGHTS.goalAlignment         * 10 +
    transferPartnerValue  * WEIGHTS.transferPartnerValue  * 10
  );

  return {
    total,
    rewardYield,
    velocityFit,
    approvalLikelihood,
    categoryOptimization,
    annualFeeDecay,
    goalAlignment,
    transferPartnerValue,
    netBonusValue,
    monthlyEarnEstimate: Math.round(monthlyEarn),
    weeksToBonus,
    feasible,
    monthlySpendNeeded: Math.round(monthlyNeeded),
  };
}

/**
 * Score and rank all cards. Returns sorted array, best first.
 */
export function rankCards(
  cards: CreditCard[],
  spend: SpendProfile,
  history: string[],
  goal: RedemptionGoal | null
): ScoredCard[] {
  return cards
    .map((card) => ({
      card,
      breakdown: scoreCard(card, spend, history, goal),
    }))
    .sort((a, b) => b.breakdown.total - a.breakdown.total);
}

/**
 * Generate a human-readable summary of why a card was recommended.
 */
export function generateRationale(scored: ScoredCard, spend: SpendProfile): string {
  const { card, breakdown } = scored;
  const topCat = (Object.entries(spend) as [keyof SpendProfile, number][])
    .sort(([, a], [, b]) => b - a)[0][0];

  const parts: string[] = [];

  if (breakdown.netBonusValue > 500) {
    parts.push(`nets you $${breakdown.netBonusValue} after the annual fee`);
  }
  if (breakdown.velocityFit > 70) {
    parts.push(`your spend hits the min target in ~${breakdown.weeksToBonus} weeks`);
  }
  if (card.earnRate[topCat] >= 2) {
    parts.push(`earns ${card.earnRate[topCat]}x on your top category (${topCat})`);
  }
  if (card.transferPartners.length >= 3) {
    parts.push(`transfers to ${card.transferPartners.slice(0, 2).join(" & ")} and more`);
  }

  return parts.length > 0
    ? parts.slice(0, 2).join(" · ")
    : `strong match across your spend profile`;
}

/**
 * Calculate how many points a user earns per month ongoing.
 */
export function monthlyPoints(card: CreditCard, spend: SpendProfile): number {
  return Math.round(
    spend.groceries * card.earnRate.groceries +
    spend.dining    * card.earnRate.dining    +
    spend.travel    * card.earnRate.travel    +
    spend.bills     * card.earnRate.bills     +
    spend.other     * card.earnRate.other
  );
}

/**
 * Project cumulative points and value over N months.
 * Returns array of { month, points, value } data points for Recharts.
 */
export function projectPointsTimeline(
  card: CreditCard,
  spend: SpendProfile,
  months = 24
): { month: number; points: number; value: number; event?: string }[] {
  const ongoing = monthlyPoints(card, spend);
  const data = [];
  let cumulative = 0;

  for (let m = 0; m <= months; m++) {
    if (m === card.spendPeriod) {
      cumulative += card.bonus; // bonus hits after min spend period
    }
    if (m > 0) {
      cumulative += ongoing;
    }
    // Annual fee effect on value
    const cycleYear = Math.floor(m / 12);
    const valueAdjusted = cumulative * 0.008 - (cycleYear * card.annualFee);
    data.push({
      month: m,
      points: cumulative,
      value: Math.max(0, Math.round(valueAdjusted)),
      event: m === card.spendPeriod ? "Bonus unlocked" : m === 12 ? "Annual fee due" : undefined,
    });
  }
  return data;
}