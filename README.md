# OpenAptitude - Task for openloans.com.au

A client-side strategy engine designed to help users maximize credit card sign-up bonuses through compounding, multi-year card sequencing. 

Built as a proof-of-concept for the OpenLoans AI-Native Engineering assessment (Brief 1A).

## 🚀 Live Link
[View Live Project](https://openaptitude.vercel.app/)

## 🧠 The Problem & Solution
Most Australians leave hundreds of dollars a year on the table because they treat credit cards as a single, static choice rather than a compounding strategy. 

**OpenPoints** shifts the paradigm from generic optimization to **intent-based routing**. Instead of manually estimating expenses and guessing which card is best, users connect their spend profile and select a specific goal (e.g., Sydney to London Business Class). The engine then generates an optimized, multi-card sequence spanning 36 months, factoring in cooldown periods, annual fee decay, and transfer partner multipliers.

## 🏗 Architecture & Tech Stack
The application is architected as a fully client-side, zero-latency execution layer.
* **Framework:** React / Next.js
* **State Management:** Zustand (Single store persisting entire application state to local storage)
* **Core Logic:** Pure TypeScript (All scoring, sequencing, and constraint logic runs locally in the browser)
* **Animation & UI:** GSAP (Timeline scrubbing) & 60-tick dynamic SVG progress rings
* **Graphics:** Custom WebGL/GPU Particle Field (Offloads visual processing from the CPU to maintain smooth UI performance)

> **Note:** The architecture is deliberately flat. There is no backend, no API server, and no database roundtrips. If you strip away the UI framework, the core TS logic still functions independently.

## ✨ Key Features
* **Behavioral Spend Profiling:** Replaces manual setup fatigue by simulating an open-banking connection to build an accurate spending profile.
* **Eligibility & Constraint Engine:** Treats 12-18 month sign-up bonus cooldowns as first-class constraints, ensuring users aren't recommended cards they can't earn bonuses on.
* **Execution Dashboard:** A real-time tracking interface featuring a dynamic SVG "harvest ring" that pulses and changes state based on weekly spend pacing versus the bonus deadline.

## 🛣 Future Production Roadmap
While this MVP uses a greedy algorithm and hardcoded card data, a production environment would introduce:
1. **LLM Data Extraction Pipeline:** Bank terms and offers change constantly and are buried in unstructured PDFs. The next step is an automated pipeline that ingests bank documents and extracts structured schema data using an LLM.
2. **Global Optimization Solver:** Upgrading the sequence planner from a locally optimal greedy algorithm to a dynamic programming or constraint solver approach to find globally optimal multi-year paths.
3. **Adaptive Scoring:** Implementing feedback loops to adjust recommendation weights dynamically based on user cohort success and churn rates.

## 🛠 Running Locally

1. Clone the repository:
   ```bash
   git clone [https://github.com/Hardik-V/OpenAptitude.git](https://github.com/Hardik-V/OpenAptitude.git)
Install dependencies:

Bash
npm install
Run the development server:

Bash
npm run dev
Open http://localhost:3000 in your browser.
