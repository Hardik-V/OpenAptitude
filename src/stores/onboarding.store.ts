import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SpendProfile, RedemptionGoal, CreditCard } from "../lib/cards";
import type { MockTransaction, BankProfileType } from "../lib/mockTransactions";
import type { ScoredCard } from "../lib/scoring";

// ─── Step Enum ────────────────────────────────────────────────────────────────

export type OnboardingStep =
  | "welcome"
  | "spend_input"
  | "bank_link"
  | "transaction_review"
  | "card_history"
  | "goal_selection"
  | "analysis"
  | "results"
  | "timeline"
  | "dashboard";

export const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "spend_input",
  "bank_link",
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
  spend_input:        "Spending",
  bank_link:          "Connect Bank",
  transaction_review: "Review",
  card_history:       "Card History",
  goal_selection:     "Your Goal",
  analysis:           "Analysis",
  results:            "Results",
  timeline:           "Timeline",
  dashboard:          "Dashboard",
};

// Visible progress steps (exclude utility steps)
export const VISIBLE_STEPS: OnboardingStep[] = [
  "spend_input",
  "bank_link",
  "card_history",
  "goal_selection",
  "results",
];

// ─── Bank Link State ──────────────────────────────────────────────────────────

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
  cardHistory: string[];        // card IDs previously held
  goal: RedemptionGoal | null;
  bankLink: BankLinkState;

  // Results
  rankedCards: ScoredCard[];
  selectedCard: CreditCard | null;

  // Actions
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSpend: (spend: Partial<SpendProfile>) => void;
  setSpendCategory: (cat: keyof SpendProfile, value: number) => void;
  toggleCardHistory: (cardId: string) => void;
  setGoal: (goal: RedemptionGoal | null) => void;
  setBankLink: (state: Partial<BankLinkState>) => void;
  setRankedCards: (cards: ScoredCard[]) => void;
  setSelectedCard: (card: CreditCard | null) => void;
  markStepComplete: (step: OnboardingStep) => void;
  reset: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SPEND: SpendProfile = {
  groceries: 800,
  dining: 400,
  travel: 300,
  bills: 600,
  other: 300,
};

const DEFAULT_BANK_LINK: BankLinkState = {
  status: "idle",
  bankName: null,
  profileType: null,
  transactions: [],
  linkedAt: null,
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
      rankedCards: [],
      selectedCard: null,

      // Navigation
      setStep: (step) => set({ step }),

      nextStep: () => {
        const { step, completedSteps } = get();
        const idx = STEP_ORDER.indexOf(step);
        const nextIdx = Math.min(idx + 1, STEP_ORDER.length - 1);
        const nextStep = STEP_ORDER[nextIdx];
        set({
          step: nextStep,
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

      // Spend
      setSpend: (partial) =>
        set((state) => ({ spend: { ...state.spend, ...partial } })),

      setSpendCategory: (cat, value) =>
        set((state) => ({ spend: { ...state.spend, [cat]: value } })),

      // History
      toggleCardHistory: (cardId) =>
        set((state) => ({
          cardHistory: state.cardHistory.includes(cardId)
            ? state.cardHistory.filter((id) => id !== cardId)
            : [...state.cardHistory, cardId],
        })),

      // Goal
      setGoal: (goal) => set({ goal }),

      // Bank link
      setBankLink: (partial) =>
        set((state) => ({ bankLink: { ...state.bankLink, ...partial } })),

      // Results
      setRankedCards: (rankedCards) => set({ rankedCards }),
      setSelectedCard: (selectedCard) => set({ selectedCard }),

      // Completion tracking
      markStepComplete: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),

      reset: () =>
        set({
          step: "welcome",
          completedSteps: [],
          spend: DEFAULT_SPEND,
          cardHistory: [],
          goal: null,
          bankLink: DEFAULT_BANK_LINK,
          rankedCards: [],
          selectedCard: null,
        }),
    }),
    {
      name: "points-hacker-onboarding",
      partialize: (state) => ({
        step: state.step,
        spend: state.spend,
        cardHistory: state.cardHistory,
        goal: state.goal,
        bankLink: state.bankLink,
        rankedCards: state.rankedCards,
        selectedCard: state.selectedCard,
        completedSteps: state.completedSteps,
      }),
    }
  )
);