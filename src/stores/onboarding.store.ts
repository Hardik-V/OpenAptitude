import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SpendProfile, RedemptionGoal, CreditCard } from "../lib/cards";
import type { MockTransaction, BankProfileType } from "../lib/mockTransactions";
import type { ScoredCard } from "../lib/scoring";
import type { CardSequence } from "../lib/sequences";

// ─── Week key helper (shared by store + components) ───────────────────────────
export function getWeekKey(d = new Date()): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// ─── Check-in ─────────────────────────────────────────────────────────────────
export interface CheckIn {
  week: string;   // ISO week key e.g. "2025-W22"
  amount: number;
}

// ─── Step Enum ────────────────────────────────────────────────────────────────
export type OnboardingStep =
  | "welcome"
  | "bank_link"
  | "spend_input"
  | "transaction_review"
  | "card_history"
  | "goal_selection"
  | "analysis"
  | "results"
  | "timeline"
  | "dashboard";

export const STEP_ORDER: OnboardingStep[] = [
  "welcome", "bank_link", "spend_input", "transaction_review",
  "card_history", "goal_selection", "analysis", "results", "timeline", "dashboard",
];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: "Welcome", bank_link: "Connect", spend_input: "Spending",
  transaction_review: "Review", card_history: "History", goal_selection: "Goal",
  analysis: "Analysis", results: "Results", timeline: "Timeline", dashboard: "Dashboard",
};

export const VISIBLE_STEPS: OnboardingStep[] = [
  "bank_link", "card_history", "goal_selection", "results", "timeline",
];

// ─── Bank Link ────────────────────────────────────────────────────────────────
export type BankLinkStatus = "idle" | "connecting" | "consenting" | "ingesting" | "done" | "skipped";

export interface BankLinkState {
  status: BankLinkStatus;
  bankName: string | null;
  profileType: BankProfileType | null;
  transactions: MockTransaction[];
  linkedAt: string | null;
}

// ─── Store State ──────────────────────────────────────────────────────────────
export interface OnboardingState {
  // Navigation
  step: OnboardingStep;
  completedSteps: OnboardingStep[];

  // User data
  spend: SpendProfile;
  cardHistory: string[];
  goal: RedemptionGoal | null;
  bankLink: BankLinkState;

  // Weekly spend check-ins (persisted in Zustand, not raw localStorage)
  checkIns: CheckIn[];

  // Results
  rankedCards: ScoredCard[];
  selectedCard: CreditCard | null;
  rankedSequences: CardSequence[];
  selectedSequence: CardSequence | null;

  // Navigation actions
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipToSpendInput: () => void;
  skipToCardHistory: () => void;

  // User data actions
  setSpend: (spend: Partial<SpendProfile>) => void;
  setSpendCategory: (cat: keyof SpendProfile, value: number) => void;
  toggleCardHistory: (cardId: string) => void;
  setGoal: (goal: RedemptionGoal | null) => void;
  setBankLink: (state: Partial<BankLinkState>) => void;

  // Check-in actions
  addCheckIn: (amount: number) => void;
  clearCheckIns: () => void;

  // Results actions
  setRankedCards: (cards: ScoredCard[]) => void;
  setSelectedCard: (card: CreditCard | null) => void;
  setRankedSequences: (sequences: CardSequence[]) => void;
  setSelectedSequence: (sequence: CardSequence | null) => void;

  // Utility
  markStepComplete: (step: OnboardingStep) => void;
  reset: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_SPEND: SpendProfile = {
  groceries: 800, dining: 400, travel: 300, bills: 600, other: 300,
};

const DEFAULT_BANK_LINK: BankLinkState = {
  status: "idle", bankName: null, profileType: null, transactions: [], linkedAt: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      step: "welcome",
      completedSteps: [],
      spend: DEFAULT_SPEND,
      cardHistory: [],
      goal: null,
      bankLink: DEFAULT_BANK_LINK,
      checkIns: [],
      rankedCards: [],
      selectedCard: null,
      rankedSequences: [],
      selectedSequence: null,

      // Navigation
      setStep: (step) => set({ step }),

      nextStep: () => {
        const { step, completedSteps } = get();
        const idx = STEP_ORDER.indexOf(step);
        const next = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
        set({
          step: next,
          completedSteps: completedSteps.includes(step) ? completedSteps : [...completedSteps, step],
        });
      },

      prevStep: () => {
        const { step } = get();
        const idx = STEP_ORDER.indexOf(step);
        if (idx > 0) set({ step: STEP_ORDER[idx - 1] });
      },

      skipToSpendInput: () => {
        const { completedSteps } = get();
        set({
          step: "spend_input",
          bankLink: { ...DEFAULT_BANK_LINK, status: "skipped" },
          completedSteps: completedSteps.includes("bank_link") ? completedSteps : [...completedSteps, "bank_link"],
        });
      },

      skipToCardHistory: () => {
        const { completedSteps, step } = get();
        set({
          step: "card_history",
          completedSteps: completedSteps.includes(step) ? completedSteps : [...completedSteps, step],
        });
      },

      // User data
      setSpend: (partial) => set((s) => ({ spend: { ...s.spend, ...partial } })),
      setSpendCategory: (cat, value) => set((s) => ({ spend: { ...s.spend, [cat]: value } })),
      toggleCardHistory: (cardId) =>
        set((s) => ({
          cardHistory: s.cardHistory.includes(cardId)
            ? s.cardHistory.filter((id) => id !== cardId)
            : [...s.cardHistory, cardId],
        })),
      setGoal: (goal) => set({ goal }),
      setBankLink: (partial) => set((s) => ({ bankLink: { ...s.bankLink, ...partial } })),

      // Check-ins — upsert by week so re-logging the same week overwrites
      addCheckIn: (amount) => {
        const week = getWeekKey();
        set((s) => ({
          checkIns: [...s.checkIns.filter((c) => c.week !== week), { week, amount }],
        }));
      },
      clearCheckIns: () => set({ checkIns: [] }),

      // Results
      setRankedCards: (rankedCards) => set({ rankedCards }),
      setSelectedCard: (selectedCard) => set({ selectedCard }),
      setRankedSequences: (rankedSequences) => set({ rankedSequences }),
      setSelectedSequence: (selectedSequence) => set({ selectedSequence }),

      // Utility
      markStepComplete: (step) =>
        set((s) => ({
          completedSteps: s.completedSteps.includes(step) ? s.completedSteps : [...s.completedSteps, step],
        })),

      reset: () =>
        set({
          step: "welcome",
          completedSteps: [],
          spend: DEFAULT_SPEND,
          cardHistory: [],
          goal: null,
          bankLink: DEFAULT_BANK_LINK,
          checkIns: [],
          rankedCards: [],
          selectedCard: null,
          rankedSequences: [],
          selectedSequence: null,
        }),
    }),
    {
      name: "points-hacker-onboarding",
      partialize: (s) => ({
        step:             s.step,
        spend:            s.spend,
        cardHistory:      s.cardHistory,
        goal:             s.goal,
        bankLink:         s.bankLink,
        checkIns:         s.checkIns,          // ← persisted
        rankedCards:      s.rankedCards,
        selectedCard:     s.selectedCard,
        rankedSequences:  s.rankedSequences,
        selectedSequence: s.selectedSequence,
        completedSteps:   s.completedSteps,
      }),
    },
  ),
);