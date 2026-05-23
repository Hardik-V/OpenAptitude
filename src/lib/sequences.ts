// ─── Sequence Optimisation Engine ─────────────────────────────────────────────
//
// A "sequence" is an ordered list of 3 cards the user will cycle through over
// ~36 months.  Each card slot has:
//   - a start month (when to apply)
//   - a hold duration (typically 12 months — earn bonus, then close)
//   - eligibility constraints (cooldown, bank family, once-in-lifetime)
//
// We enumerate all valid 3-card permutations from the card pool, score each
// sequence by total 36-month net value (bonus + ongoing earn – fees, future-
// discounted), then return the top N sequences grouped by "route archetype"
// (Qantas miles, Velocity, flexible points, cashback).
//
// This is intentionally simple: with ≤6 cards the permutation space is tiny
// (6P3 = 120 sequences before filtering).  No RL needed.

import type { CreditCard, SpendProfile, RedemptionGoal } from "./cards";
import { scoreCard } from "./scoring";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SequenceSlot {
  card: CreditCard;
  startMonth: number;        // month 0, 13, 26 …
  holdMonths: number;        // how long to keep it active
  bonusMonth: number;        // month the bonus lands (startMonth + spendPeriod)
  bonusValue: number;        // AUD net of annual fee
  earnValue: number;         // ongoing earn value over holdMonths
  slotValue: number;         // bonusValue + earnValue
  feasible: boolean;         // can user hit min spend?
  weeksToBonus: number;
}

export interface CardSequence {
  id: string;                // deterministic e.g. "westpac-altitude|amex-platinum|citi-premier"
  slots: SequenceSlot[];     // always 3
  totalValue: number;        // discounted sum of slot values over ~36mo
  totalBonusPoints: number;  // raw point harvest across all 3 cards
  horizon: number;           // months to complete the full sequence
  archetype: SequenceArchetype;
  archetypeLabel: string;
  archetypeColor: string;
  allFeasible: boolean;      // true if user spend hits all 3 min-spend targets
  monthlyValueCurve: { month: number; cumulative: number }[]; // for chart
}

export type SequenceArchetype =
  | "qantas_miles"
  | "velocity_points"
  | "flexible_points"
  | "cashback_hybrid"
  | "high_value";

const ARCHETYPE_META: Record<SequenceArchetype, { label: string; color: string; description: string }> = {
  qantas_miles:     { label: "Qantas Miles Route",    color: "#f97316", description: "Stack Qantas Frequent Flyer points across multiple issuers for maximum flight rewards." },
  velocity_points:  { label: "Velocity Route",        color: "#60a5fa", description: "Accumulate Virgin Velocity points — best for domestic travel and hotel transfers." },
  flexible_points:  { label: "Flexible Points Route", color: "#a78bfa", description: "Earn transferable points that go to multiple airlines — maximum redemption flexibility." },
  cashback_hybrid:  { label: "Cash + Miles Hybrid",   color: "#4ade80", description: "Mix high-value bonuses with low fees to maximise net dollar return." },
  high_value:       { label: "High Value Route",      color: "#F2C94C", description: "Prioritise raw bonus value — best total return for high spenders." },
};

// ─── Constraints ─────────────────────────────────────────────────────────────

const HOLD_MONTHS = 12;          // standard hold period per card
const GAP_MONTHS  = 1;           // 1-month gap between closing one and opening next
const FUTURE_DISCOUNT = 0.90;    // 10% discount per card in sequence (uncertainty)
const POINTS_CPP = 0.008;        // cents per point (conservative)

function slotStartMonth(slotIndex: number): number {
  // Slot 0: month 0, Slot 1: month 13, Slot 2: month 26
  return slotIndex * (HOLD_MONTHS + GAP_MONTHS);
}

/**
 * Check whether a card can occupy a given slot given:
 * - card history (recently held / cooldown not reset)
 * - the cards already placed in earlier slots (same bank family rule)
 */
function isEligible(
  card: CreditCard,
  slotIndex: number,
  previousSlots: SequenceSlot[],
  history: string[],
  historyCardMap: Map<string, CreditCard>,
): boolean {
  const startMonth = slotStartMonth(slotIndex);

  // 1. Once-in-lifetime: never eligible if held before
  if (card.bonusOnceInLifetime && history.includes(card.id)) return false;

  // 2. Cooldown from history: check when user last held this card.
  //    We don't know the exact date, so conservatively assume they closed it
  //    at month 0 (i.e. it's been 0 months since closing).
  if (history.includes(card.id)) {
    // They held it — need cooldownMonths before eligible again.
    // Slot 0 starts at month 0, so any card in history fails slot 0.
    // Slot 1 starts at month 13 — eligible if cooldown ≤ 12.
    // Slot 2 starts at month 26 — eligible if cooldown ≤ 24.
    if (startMonth < card.cooldownMonths) return false;
  }

  // 3. Same bank family can't be held simultaneously or back-to-back
  //    (applying for same bank too soon risks rejection).
  //    Enforce a minimum 1-slot gap between same bank family.
  for (const prev of previousSlots) {
    if (prev.card.bankFamily === card.bankFamily) {
      // Same family appeared in a previous slot — need at least 1 slot gap.
      // Since each slot is ~13 months and cooldowns are 12–18 months, this
      // is already satisfied if the previous slot is 2+ slots back.
      const prevSlotIndex = previousSlots.indexOf(prev);
      if (slotIndex - prevSlotIndex < 2) return false;
    }
  }

  // 4. No duplicate cards in a sequence
  if (previousSlots.some(s => s.card.id === card.id)) return false;

  return true;
}

// ─── Slot value calculation ───────────────────────────────────────────────────

function calcSlot(
  card: CreditCard,
  slotIndex: number,
  spend: SpendProfile,
): SequenceSlot {
  const startMonth = slotStartMonth(slotIndex);
  const totalMonthly = Object.values(spend).reduce((a, b) => a + b, 0);
  const monthlyNeeded = card.minSpend / card.spendPeriod;
  const feasible = totalMonthly >= monthlyNeeded * 0.9;
  const weeksToBonus = feasible
    ? Math.ceil((card.minSpend / Math.max(totalMonthly, 1)) * 4.33)
    : 999;

  // Ongoing earn over full hold period
  const monthlyEarn =
    spend.groceries * card.earnRate.groceries +
    spend.dining    * card.earnRate.dining +
    spend.travel    * card.earnRate.travel +
    spend.bills     * card.earnRate.bills +
    spend.other     * card.earnRate.other;
  const earnValue = Math.round(monthlyEarn * HOLD_MONTHS * POINTS_CPP);

  // Net bonus: if not feasible, zero out the bonus (they won't earn it)
  const rawBonus = feasible ? card.bonusValue - card.annualFee : -card.annualFee;
  const bonusValue = rawBonus;

  const slotValue = bonusValue + earnValue;

  return {
    card,
    startMonth,
    holdMonths: HOLD_MONTHS,
    bonusMonth: startMonth + card.spendPeriod,
    bonusValue,
    earnValue,
    slotValue,
    feasible,
    weeksToBonus,
  };
}

// ─── Monthly cumulative value curve for the full sequence ─────────────────────

function buildCurve(slots: SequenceSlot[], spend: SpendProfile): { month: number; cumulative: number }[] {
  const horizon = slotStartMonth(slots.length) + HOLD_MONTHS;
  const curve: { month: number; cumulative: number }[] = [];
  let cumValue = 0;

  for (let m = 0; m <= horizon; m++) {
    for (const slot of slots) {
      if (m === slot.startMonth) {
        // Annual fee charged on open
        cumValue -= slot.card.annualFee;
      }
      if (m === slot.bonusMonth && slot.feasible) {
        // Bonus lands
        cumValue += slot.card.bonusValue;
      }
      if (m > slot.startMonth && m <= slot.startMonth + slot.holdMonths) {
        // Monthly ongoing earn
        const monthlyEarn =
          spend.groceries * slot.card.earnRate.groceries +
          spend.dining    * slot.card.earnRate.dining +
          spend.travel    * slot.card.earnRate.travel +
          spend.bills     * slot.card.earnRate.bills +
          spend.other     * slot.card.earnRate.other;
        cumValue += monthlyEarn * POINTS_CPP;
      }
    }
    curve.push({ month: m, cumulative: Math.round(cumValue) });
  }
  return curve;
}

// ─── Archetype classification ─────────────────────────────────────────────────

function classifyArchetype(slots: SequenceSlot[]): SequenceArchetype {
  const programs = slots.map(s => s.card.rewardProgram);
  const partners = slots.flatMap(s => s.card.transferPartners);

  // Count by transfer partner presence
  const qantasCount  = partners.filter(p => p === "Qantas").length;
  const velocityCount = partners.filter(p => p === "Velocity").length;

  // Flexible: AMEX MR or Citi Rewards (transfers to many partners)
  const flexibleCount = programs.filter(p =>
    p === "Membership Rewards" || p === "Citi Rewards" || p === "ThankYou Rewards"
  ).length;

  // Cashback: CommBank Awards or low-fee cards
  const cashbackCount = programs.filter(p =>
    p === "CommBank Awards" || p === "CommBank Awards Plus"
  ).length;

  // High value: ALL 3 slots have net bonus > $400 (not just 2)
  const highValueCount = slots.filter(s => s.bonusValue > 400).length;
  if (highValueCount === 3) return "high_value";

  // Dominant partner
  if (qantasCount >= velocityCount && qantasCount >= flexibleCount && qantasCount >= cashbackCount) {
    // Break ties: if flexible is close, prefer flexible (more interesting archetype)
    if (flexibleCount >= 2) return "flexible_points";
    return "qantas_miles";
  }
  if (velocityCount >= qantasCount && velocityCount >= flexibleCount) return "velocity_points";
  if (flexibleCount >= 2) return "flexible_points";
  if (cashbackCount >= 2) return "cashback_hybrid";

  // Fallback: highest bonus total → qantas, otherwise flexible
  const totalBonus = slots.reduce((s, sl) => s + sl.card.bonus, 0);
  return totalBonus > 300000 ? "qantas_miles" : "flexible_points";
}


// ─── Main export: rankSequences ───────────────────────────────────────────────

export function rankSequences(
  cards: CreditCard[],
  spend: SpendProfile,
  history: string[],
  goal: RedemptionGoal | null,
  topN = 4,
): CardSequence[] {
  const historyCardMap = new Map<string, CreditCard>(
    cards.filter(c => history.includes(c.id)).map(c => [c.id, c]),
  );

  const sequences: CardSequence[] = [];

  // Enumerate all valid 3-card permutations
  for (const c0 of cards) {
    if (!isEligible(c0, 0, [], history, historyCardMap)) continue;
    const slot0 = calcSlot(c0, 0, spend);

    for (const c1 of cards) {
      if (!isEligible(c1, 1, [slot0], history, historyCardMap)) continue;
      const slot1 = calcSlot(c1, 1, spend);

      for (const c2 of cards) {
        if (!isEligible(c2, 2, [slot0, slot1], history, historyCardMap)) continue;
        const slot2 = calcSlot(c2, 2, spend);

        const slots = [slot0, slot1, slot2];

        // Discount future slots for uncertainty
        const discountedValue =
          slot0.slotValue * 1.0 +
          slot1.slotValue * FUTURE_DISCOUNT +
          slot2.slotValue * Math.pow(FUTURE_DISCOUNT, 2);

        // Goal alignment bonus: add up-front if goal achievable within sequence
        let goalBonus = 0;
        if (goal) {
          const totalPoints = slots.reduce((s, sl) => s + sl.card.bonus, 0);
          if (totalPoints >= goal.pointsRequired) goalBonus = goal.estimatedValue * 0.08;
        }

        const archetype = classifyArchetype(slots);
        const curve = buildCurve(slots, spend);

        sequences.push({
          id: slots.map(s => s.card.id).join("|"),
          slots,
          totalValue: Math.round(discountedValue + goalBonus),
          totalBonusPoints: slots.reduce((sum, s) => sum + s.card.bonus, 0),
          horizon: slotStartMonth(3) + HOLD_MONTHS,
          archetype,
          archetypeLabel: ARCHETYPE_META[archetype].label,
          archetypeColor: ARCHETYPE_META[archetype].color,
          allFeasible: slots.every(s => s.feasible),
          monthlyValueCurve: curve,
        });
      }
    }
  }

  // Sort by total discounted value
  sequences.sort((a, b) => b.totalValue - a.totalValue);

  // De-duplicate by archetype: keep best sequence per archetype first,
  // then fill remaining slots with next-best overall.
  const seenArchetypes = new Set<SequenceArchetype>();
  const seenIds        = new Set<string>();
  const deduped: CardSequence[] = [];

  // First pass: best of each unique archetype
  for (const seq of sequences) {
    if (!seenArchetypes.has(seq.archetype) && !seenIds.has(seq.id)) {
      seenArchetypes.add(seq.archetype);
      seenIds.add(seq.id);
      deduped.push(seq);
    }
    if (deduped.length >= topN) break;
  }

  // Second pass: if we still need slots, add next-best unique sequences
  // and relabel them so they don't duplicate an existing archetypeLabel
  let altCounter = 1;
  for (const seq of sequences) {
    if (deduped.length >= topN) break;
    if (seenIds.has(seq.id)) continue;
    seenIds.add(seq.id);
    // Relabel to avoid showing same archetype name twice
    const relabelled: CardSequence = {
      ...seq,
      archetypeLabel: seenArchetypes.has(seq.archetype)
        ? `Alt Route ${String(altCounter++).padStart(2, "0")}`
        : seq.archetypeLabel,
      archetypeColor: seenArchetypes.has(seq.archetype)
        ? "#94a3b8"   // slate — visually distinct from the 4 real archetypes
        : seq.archetypeColor,
    };
    if (!seenArchetypes.has(seq.archetype)) seenArchetypes.add(seq.archetype);
    deduped.push(relabelled);
    altCounter++;
  }

  return deduped.slice(0, topN);
}

// ─── Helper: generate timeline events for a sequence ─────────────────────────

export interface SequenceEvent {
  month: number;
  cardName: string;
  cardAccent: string;
  type: "apply" | "bonus" | "fee" | "close" | "pivot";
  label: string;
  detail: string;
}

export function sequenceTimeline(seq: CardSequence): SequenceEvent[] {
  const events: SequenceEvent[] = [];

  seq.slots.forEach((slot, i) => {
    const card = slot.card;

    events.push({
      month: slot.startMonth,
      cardName: `${card.bank} ${card.name}`,
      cardAccent: card.accent,
      type: "apply",
      label: `Apply for ${card.bank} ${card.name}`,
      detail: `Min spend $${card.minSpend.toLocaleString()} over ${card.spendPeriod} months. Allow 5–10 business days for approval.`,
    });

    if (slot.feasible) {
      events.push({
        month: slot.bonusMonth,
        cardName: `${card.bank} ${card.name}`,
        cardAccent: card.accent,
        type: "bonus",
        label: `${(card.bonus / 1000).toFixed(0)}K bonus points land`,
        detail: `${card.bonus.toLocaleString()} pts added to ${card.rewardProgram} — worth ~$${card.bonusValue}.`,
      });
    }

    events.push({
      month: slot.startMonth + slot.holdMonths - 1,
      cardName: `${card.bank} ${card.name}`,
      cardAccent: card.accent,
      type: "close",
      label: `Close ${card.bank} ${card.name}`,
      detail: `Close before month ${slot.startMonth + slot.holdMonths} to avoid the $${card.annualFee} renewal fee.`,
    });

    if (i < seq.slots.length - 1) {
      events.push({
        month: slot.startMonth + slot.holdMonths,
        cardName: seq.slots[i + 1].card.bank + " " + seq.slots[i + 1].card.name,
        cardAccent: seq.slots[i + 1].card.accent,
        type: "pivot",
        label: `Switch to ${seq.slots[i + 1].card.bank} ${seq.slots[i + 1].card.name}`,
        detail: `Cooldown cleared. Apply for next card in your sequence.`,
      });
    }
  });

  return events.sort((a, b) => a.month - b.month);
}

// ─── Helper: describe archetype ───────────────────────────────────────────────

export function archetypeDescription(archetype: SequenceArchetype): string {
  return ARCHETYPE_META[archetype].description;
}