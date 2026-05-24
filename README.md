# OpenAptitude - Task for openloans.com.au

Most Australians stay on the same credit card for years, quietly missing $300–$800 in sign-up bonuses every cycle. The strategy for capturing that value, switching cards every 6–12 months, is well known. The execution is what stops people.

Open Points Assistant turns that execution into a system. It builds a personalised 36-month card switching sequence, maps every apply/bonus/close event to a real date, and tracks weekly spend progress so users know exactly whether they're on pace to earn the bonus.

Built for the Open Home Loans AI-Native Engineer take-home assessment - Brief 1A: Points Hacking Assistant.

---

## What it does

- Connects to a mock CDR Open Banking flow to auto-populate a spend profile from transaction history
- Scores every card in the database across 7 weighted factors against the user's actual spend pattern
- Generates multiple 3-card switching sequences ranked by total 36-month net value
- Weights the sequence toward cards that match the user's specific redemption goal (e.g. Sydney → London business class)
- Tracks issuer cooldown windows and re-inserts previously held cards back into the sequence once eligible
- Produces a dated execution timeline: apply, hit spend, bonus lands, close before the fee
- Tracks weekly spend check-ins against the minimum spend target with a paced projection

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| State | Zustand with `persist` middleware |
| Animation | GSAP + ScrollTrigger, Lenis |
| Charts | Recharts |
| Deployment | Vercel |

No backend. No API server. All logic runs client-side, the scoring engine, sequence planner, and state persistence are pure TypeScript functions in the browser.

---

## Structure

```
src/
├── app/
│   ├── page.tsx                      # Landing page — scroll-driven narrative
│   ├── components/
│   │   ├── AntigravityGPGPU.tsx      # GPU particle field (adapted from google/antigravity)
│   │   └── FloatingCardsBackground.tsx  # Animated 3D card background
│   ├── setup/
│   │   └── page.tsx                  # 3-step onboarding + sequence picker + timeline
│   └── dashboard/
│       └── page.tsx                  # Harvest tracking dashboard
├── lib/
│   ├── cards.ts                      # Card database, types, spend categories
│   ├── scoring.ts                    # 7-factor weighted scoring engine
│   ├── sequences.ts                  # Multi-card sequence planner
│   └── mockTransactions.ts           # Mock CDR transaction data generator
└── stores/
    └── onboarding.store.ts           # Zustand persisted store
```

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables required. Everything runs locally.

---

## How the scoring works

Each card is scored out of 1000 across seven factors:

```ts
const WEIGHTS = {
  rewardYield:          0.22,  // points per $ against actual spend breakdown
  velocityFit:          0.20,  // projected ability to hit min spend in time
  categoryOptimization: 0.18,  // earn rate match per spend category
  annualFeeDecay:       0.14,  // bonus value vs fee in year one
  approvalLikelihood:   0.12,  // estimated approval probability
  goalAlignment:        0.10,  // match to selected redemption goal
  transferPartnerValue: 0.04,  // quality of transfer partner network
};
```

Goal selection shifts these weights before the scoring run — picking Sydney → London boosts `goalAlignment` and `transferPartnerValue`, producing a materially different ranked list.

---

## How the sequence planner works

1. Score all cards against current eligibility state
2. Slot the highest-scoring eligible card into position one
3. Calculate the close date for that card (month 11, before annual fee renewal)
4. Re-score remaining cards against updated eligibility state for position two
5. Re-insert previously held cards once their cooldown window clears

The result is a greedy-optimal sequence with cooldown-aware re-insertion. Multiple sequences are generated across different reward program orientations (Qantas, Velocity, flexible points) and ranked by total net value.

---

## Architecture decisions

**Thick client, no backend** — The scoring engine and sequence planner are pure functions. Running them in the browser means zero latency during the onboarding flow and no infrastructure to maintain for a demo.

**Zustand with persist** — Full application state survives refresh, back navigation, and tab close. The 36-month sequence and all spend check-ins are recoverable without re-entering data.

**Eligibility as a first-class concept** — Cards aren't permanently filtered out when a user marks them as previously held. The engine stores the cooldown expiry and re-inserts them into later sequence slots the moment they clear.

**Scroll-driven narrative** — The landing page uses a single GSAP ScrollTrigger timeline scrubbed across 750vh. The credit card's position, rotation, scale, and face are entirely controlled by scroll position — no click events.

---

## Future prospcts

**LLM card data pipeline** — Card offers are unstructured, change frequently, and the T&Cs that matter are buried in PDFs. The right architecture is an LLM extraction pipeline that ingests bank documents, pulls structured fields into a versioned schema, and diffs changes. Temporal versioning on card records means historical sequences can be replayed against the terms that were live when the user applied.

**Constraint satisfaction for sequence optimisation** — The current greedy algorithm is locally optimal. A proper CSP solver (OR-Tools) would find globally optimal sequences — cases where accepting a lower-value card early unlocks a significantly higher-value card later that the greedy approach would miss.

**Durable execution for notifications** — The highest-leverage feature is a message saying "your bonus window closes in 21 days." That's not a cron job — it's a durable workflow problem. Each sequence slot needs a workflow instance (Temporal / Inngest) with states: apply → spend tracking → bonus received → close reminder. Cancellable and reschedulable when the user updates their sequence.

**Adaptive scoring weights** — The weights are currently hardcoded priors. With outcomes data (did users hit the bonus they were projected to earn), a contextual bandit over the weight vector could learn per-cohort adjustments. Over time the engine reflects what actually predicts success rather than what I estimated at build time.

---

## Disclaimer

General information only. Not financial advice. Card offers subject to change — verify directly with the issuer before applying. Always read the PDS.

---

Built by Hardik for Open Home Loans · May 2026
