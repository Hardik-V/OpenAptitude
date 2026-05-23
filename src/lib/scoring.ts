// ─── Scoring Engine ───────────────────────────────────────────────────────────
//
// scoreCard   — single card vs spend profile
// rankCards   — sort all cards
// generateRationale — human summary
// monthlyPoints / projectPointsTimeline — projection helpers

import type { CreditCard, SpendProfile, RedemptionGoal } from "./cards";

export interface ScoreBreakdown {
  total: number;

  // Sub-scores (each 0–100 before weighting)
  rewardYield: number;
  velocityFit: number;
  approvalLikelihood: number;
  categoryOptimization: number;
  annualFeeDecay: number;
  goalAlignment: number;
  transferPartnerValue: number;

  // Derived
  netBonusValue: number;
  monthlyEarnEstimate: number;
  weeksToBonus: number;
  feasible: boolean;
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

export function scoreCard(
  card: CreditCard,
  spend: SpendProfile,
  history: string[],
  goal: RedemptionGoal | null,
): ScoreBreakdown {
  const totalMonthly = Object.values(spend).reduce((a, b) => a + b, 0);

  // 1. Reward Yield
  const monthlyEarn =
    spend.groceries * card.earnRate.groceries +
    spend.dining    * card.earnRate.dining +
    spend.travel    * card.earnRate.travel +
    spend.bills     * card.earnRate.bills +
    spend.other     * card.earnRate.other;
  const annualEarnValue = (monthlyEarn * 12) * 0.008;
  const rewardYieldRaw = Math.min(annualEarnValue / Math.max(card.annualFee, 50), 3);
  const rewardYield = Math.min(100, rewardYieldRaw * 33.3);

  // 2. Velocity Fit
  const monthlyNeeded = card.minSpend / card.spendPeriod;
  const feasible = totalMonthly >= monthlyNeeded * 0.9;
  const velocityRatio = totalMonthly / monthlyNeeded;
  const velocityFit = Math.min(100, velocityRatio * 80 + (feasible ? 20 : 0));
  const weeksToBonus = feasible
    ? Math.ceil((card.minSpend / totalMonthly) * 4.33)
    : 999;

  // 3. Approval Likelihood — penalise recently held AND once-in-lifetime
  const recentlyHeld = history.includes(card.id);
  const approvalLikelihood =
    card.bonusOnceInLifetime && recentlyHeld ? 0
    : recentlyHeld ? 20
    : 85;

  // 4. Category Optimisation
  const sortedCategories = (Object.entries(spend) as [keyof SpendProfile, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k]) => k);
  const topEarnAvg =
    sortedCategories.reduce((sum, cat) => sum + card.earnRate[cat], 0) /
    sortedCategories.length;
  const categoryOptimization = Math.min(100, ((topEarnAvg - 1) / 2) * 100);

  // 5. Annual Fee Decay
  const netBonusValue = card.bonusValue - card.annualFee;
  const feeRatio = card.bonusValue / Math.max(card.annualFee, 1);
  const annualFeeDecay = Math.min(100, (feeRatio / 8) * 100);

  // 6. Goal Alignment
  let goalAlignment = 50;
  if (goal) {
    const cyclesNeeded = goal.pointsRequired / card.bonus;
    goalAlignment = cyclesNeeded <= 1 ? 100
      : cyclesNeeded <= 2 ? 75
      : cyclesNeeded <= 3 ? 45
      : 15;
  }

  // 7. Transfer Partner Value
  const transferPartnerValue = Math.min(100, card.transferPartners.length * 20);

  const total = Math.round(
    rewardYield          * WEIGHTS.rewardYield          * 10 +
    velocityFit          * WEIGHTS.velocityFit          * 10 +
    approvalLikelihood   * WEIGHTS.approvalLikelihood   * 10 +
    categoryOptimization * WEIGHTS.categoryOptimization * 10 +
    annualFeeDecay       * WEIGHTS.annualFeeDecay       * 10 +
    goalAlignment        * WEIGHTS.goalAlignment        * 10 +
    transferPartnerValue * WEIGHTS.transferPartnerValue * 10,
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

export function rankCards(
  cards: CreditCard[],
  spend: SpendProfile,
  history: string[],
  goal: RedemptionGoal | null,
): ScoredCard[] {
  return cards
    .map((card) => ({ card, breakdown: scoreCard(card, spend, history, goal) }))
    .sort((a, b) => b.breakdown.total - a.breakdown.total);
}

export function generateRationale(scored: ScoredCard, spend: SpendProfile): string {
  const { card, breakdown } = scored;
  const topCat = (Object.entries(spend) as [keyof SpendProfile, number][])
    .sort(([, a], [, b]) => b - a)[0][0];
  const parts: string[] = [];
  if (breakdown.netBonusValue > 500) parts.push(`nets you $${breakdown.netBonusValue} after the annual fee`);
  if (breakdown.velocityFit > 70)    parts.push(`your spend hits min target in ~${breakdown.weeksToBonus} weeks`);
  if (card.earnRate[topCat] >= 2)    parts.push(`earns ${card.earnRate[topCat]}x on your top category (${topCat})`);
  if (card.transferPartners.length >= 3) parts.push(`transfers to ${card.transferPartners.slice(0, 2).join(" & ")} and more`);
  return parts.length > 0 ? parts.slice(0, 2).join(" · ") : "strong match across your spend profile";
}

export function monthlyPoints(card: CreditCard, spend: SpendProfile): number {
  return Math.round(
    spend.groceries * card.earnRate.groceries +
    spend.dining    * card.earnRate.dining +
    spend.travel    * card.earnRate.travel +
    spend.bills     * card.earnRate.bills +
    spend.other     * card.earnRate.other,
  );
}

export function projectPointsTimeline(
  card: CreditCard,
  spend: SpendProfile,
  months = 24,
): { month: number; points: number; value: number; event?: string }[] {
  const ongoing = monthlyPoints(card, spend);
  const data = [];
  let cumulative = 0;
  for (let m = 0; m <= months; m++) {
    if (m === card.spendPeriod) cumulative += card.bonus;
    if (m > 0) cumulative += ongoing;
    const cycleYear = Math.floor(m / 12);
    const valueAdjusted = cumulative * 0.008 - cycleYear * card.annualFee;
    data.push({
      month: m,
      points: cumulative,
      value: Math.max(0, Math.round(valueAdjusted)),
      event: m === card.spendPeriod ? "Bonus unlocked" : m === 12 ? "Annual fee due" : undefined,
    });
  }
  return data;
}