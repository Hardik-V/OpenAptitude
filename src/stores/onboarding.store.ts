import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SpendProfile, RedemptionGoal, CreditCard } from "../lib/cards";
import type { MockTransaction, BankProfileType } from "../lib/mockTransactions";
import type { ScoredCard } from "../lib/scoring";
import type { CardSequence } from "../lib/sequences";

// ─── Step Enum ────────────────────────────────────────────────────────────────

export type OnboardingStep =
  | "welcome"
  | "bank_link"
  | "spend_input"        // shown only if bank link skipped
  | "transaction_review" // shown only if bank link succeeded
  | "card_history"
  | "goal_selection"
  | "analysis"
  | "results"
  | "timeline"
  | "dashboard";

// Full ordered list — navigation walks this
export const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "bank_link",
  "spend_input",
  "transaction_review",
  "card_history",
  "goal_selection",
  "analysis",
  "results",
  "timeline",
  "dashboard",
];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome:            "Welcome",
  bank_link:          "Connect",
  spend_input:        "Spending",
  transaction_review: "Review",
  card_history:       "History",
  goal_selection:     "Goal",
  analysis:           "Analysis",
  results:            "Results",
  timeline:           "Timeline",
  dashboard:          "Dashboard",
};

// Steps shown in the progress bar (utility + transition steps hidden)
export const VISIBLE_STEPS: OnboardingStep[] = [
  "bank_link",
  "card_history",
  "goal_selection",
  "results",
  "timeline",
];

// ─── Bank Link State ──────────────────────────────────────────────────────────

export type BankLinkStatus =
  | "idle"
  | "connecting"
  | "consenting"
  | "ingesting"
  | "done"
  | "skipped";

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

  // Results — both single-card and sequence
  rankedCards: ScoredCard[];
  selectedCard: CreditCard | null;
  rankedSequences: CardSequence[];
  selectedSequence: CardSequence | null;

  // Actions — navigation
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Actions — user data
  setSpend: (spend: Partial<SpendProfile>) => void;
  setSpendCategory: (cat: keyof SpendProfile, value: number) => void;
  toggleCardHistory: (cardId: string) => void;
  setGoal: (goal: RedemptionGoal | null) => void;
  setBankLink: (state: Partial<BankLinkState>) => void;

  // Actions — results
  setRankedCards: (cards: ScoredCard[]) => void;
  setSelectedCard: (card: CreditCard | null) => void;
  setRankedSequences: (sequences: CardSequence[]) => void;
  setSelectedSequence: (sequence: CardSequence | null) => void;

  // Utility
  markStepComplete: (step: OnboardingStep) => void;

  // Skip helpers — so components don't need to know step order details
  skipToSpendInput: () => void;       // bank link skipped → manual spend
  skipToCardHistory: () => void;      // after bank link or spend input done

  reset: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SPEND: SpendProfile = {
  groceries: 800,
  dining:    400,
  travel:    300,
  bills:     600,
  other:     300,
};

const DEFAULT_BANK_LINK: BankLinkState = {
  status:      "idle",
  bankName:    null,
  profileType: null,
  transactions: [],
  linkedAt:    null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // ── Initial state ────────────────────────────────────────────────────
      step:              "welcome",
      completedSteps:    [],
      spend:             DEFAULT_SPEND,
      cardHistory:       [],
      goal:              null,
      bankLink:          DEFAULT_BANK_LINK,
      rankedCards:       [],
      selectedCard:      null,
      rankedSequences:   [],
      selectedSequence:  null,

      // ── Navigation ────────────────────────────────────────────────────────
      setStep: (step) => set({ step }),

      nextStep: () => {
        const { step, completedSteps } = get();
        const idx = STEP_ORDER.indexOf(step);
        const next = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
        set({
          step: next,
          completedSteps: completedSteps.includes(step)
            ? completedSteps
            : [...completedSteps, step],
        });
      },

      prevStep: () => {
        const { step } = get();
        const idx = STEP_ORDER.indexOf(step);
        if (idx > 0) set({ step: STEP_ORDER[idx - 1] });
      },

      // Skip helpers keep routing logic out of components
      skipToSpendInput: () => {
        const { completedSteps } = get();
        set({
          step: "spend_input",
          bankLink: { ...DEFAULT_BANK_LINK, status: "skipped" },
          completedSteps: completedSteps.includes("bank_link")
            ? completedSteps
            : [...completedSteps, "bank_link"],
        });
      },

      skipToCardHistory: () => {
        const { completedSteps, step } = get();
        set({
          step: "card_history",
          completedSteps: completedSteps.includes(step)
            ? completedSteps
            : [...completedSteps, step],
        });
      },

      // ── User data ─────────────────────────────────────────────────────────
      setSpend: (partial) =>
        set((s) => ({ spend: { ...s.spend, ...partial } })),

      setSpendCategory: (cat, value) =>
        set((s) => ({ spend: { ...s.spend, [cat]: value } })),

      toggleCardHistory: (cardId) =>
        set((s) => ({
          cardHistory: s.cardHistory.includes(cardId)
            ? s.cardHistory.filter((id) => id !== cardId)
            : [...s.cardHistory, cardId],
        })),

      setGoal: (goal) => set({ goal }),

      setBankLink: (partial) =>
        set((s) => ({ bankLink: { ...s.bankLink, ...partial } })),

      // ── Results ───────────────────────────────────────────────────────────
      setRankedCards:      (rankedCards)      => set({ rankedCards }),
      setSelectedCard:     (selectedCard)     => set({ selectedCard }),
      setRankedSequences:  (rankedSequences)  => set({ rankedSequences }),
      setSelectedSequence: (selectedSequence) => set({ selectedSequence }),

      // ── Utility ───────────────────────────────────────────────────────────
      markStepComplete: (step) =>
        set((s) => ({
          completedSteps: s.completedSteps.includes(step)
            ? s.completedSteps
            : [...s.completedSteps, step],
        })),

      reset: () =>
        set({
          step:             "welcome",
          completedSteps:   [],
          spend:            DEFAULT_SPEND,
          cardHistory:      [],
          goal:             null,
          bankLink:         DEFAULT_BANK_LINK,
          rankedCards:      [],
          selectedCard:     null,
          rankedSequences:  [],
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
        rankedCards:      s.rankedCards,
        selectedCard:     s.selectedCard,
        rankedSequences:  s.rankedSequences,
        selectedSequence: s.selectedSequence,
        completedSteps:   s.completedSteps,
      }),
    },
  ),
);  