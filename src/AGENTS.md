<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
## 1. Project Overview
You are working on a premium, investor-ready consumer fintech application for the Australian credit card and home loan market. This is NOT a generic dashboard or a "hacker/terminal" themed app. The aesthetic is ultra-premium, institutional, and trust-building (similar to Apple Card, Linear, or Stripe).

## 2. Tech Stack
* **Framework:** Next.js (App Router)
* **UI Library:** React (Functional components, hooks)
* **Styling:** Tailwind CSS (Strictly using utility classes, no custom CSS modules unless for keyframes)
* **Icons:** `lucide-react` (NEVER use emojis)
* **Visual Engine:** Native WebGL / Three.js (Custom GPGPU shaders)
* **Typography:** `next/font/google` 
  * Headings: `Bricolage_Grotesque`
  * Data/Numbers/Tags: `DM_Mono`
  * Body text: `DM_Sans`

## 3. Strict Design System Boundaries
Do NOT deviate from these design rules when generating new components or pages:
* **Background:** Deep midnight navy (`#0D1B2A`).
* **Accents:** Crisp gold/yellow (`#F2C94C`). Use variants like `#ebd074` for hovers.
* **Containers:** Glassmorphism ONLY. Use `bg-white/5` or `bg-white/[0.02]` combined with `backdrop-blur-md` and ultra-subtle borders (`border-white/5` or `border-white/10`).
* **Borders & Shadows:** No harsh solid borders. Use glowing spatial depth profiles (e.g., `shadow-[0_0_12px_#F2C94C]`).
* **Layouts:** Avoid rigid, boxy tables. Use fluid, card-based flex/grid alignments with high padding (`p-6` to `p-8`) and rounded corners (`rounded-2xl` or `rounded-xl`).
* **Icons & Assets:** Do NOT use emojis. Use Lucide React SVG components exclusively.

## 4. Architectural Guardrails
* **Hydration Safety:** This is a Next.js app. Any use of `Math.random()`, `new Date()`, or `window` APIs MUST be wrapped in a `useEffect` hook to prevent server/client hydration mismatches. 
* **The Background Shader:** The app relies on a high-performance `<AntigravityGPGPU />` component. This MUST always remain at `z-0` with `pointer-events-none` and `absolute inset-0`. Do NOT attempt to rewrite, optimize, or alter the math inside `AntigravityGPGPU.tsx` unless explicitly instructed.
* **Component Animations:** Use Tailwind classes for simple hovers (`group-hover:translate-x-1`, `transition-all duration-300`). For mount animations, use CSS keyframe classes like `animate-fade-in`. 

## 5. Current Implementation State
The core funnel (`app/setup/page.tsx`) is a 5-phase interactive wizard:
1. `boot`: Initial hook and intro.
2. `spend`: Range inputs for monthly category spending.
3. `history`: Regulatory exclusion checks (cards held in last 18 months).
4. `analysing`: Simulated GPGPU/AI matrix processing loader.
5. `results` & `timeline`: Card scoring and 12-month tactical playbook.

## 6. Product Roadmap (The 5 Pillars)
When asked to implement new features, refer to these upcoming pillars to understand the strategic context:
1. **Credit Health Shield:** A visual "Credit Velocity Score" module explaining soft-inquiry impacts and tracking 90-day recovery graphs.
2. **Open Banking (CDR) Link:** A mock UI flow to replace manual spend sliders with "Securely Link Bank" auto-ingestion.
3. **Flight Target Mapping:** Translating abstract reward points into tangible progress bars toward luxury goals (e.g., "Business Class to Tokyo").
4. **Active Flight Deck:** A post-onboarding retention dashboard tracking minimum-spend countdowns and action milestones.
5. **The Refinancing Funnel:** A cross-sell hook at Month 9 transitioning clean-credit users into an Open Loans mortgage refinance application.

## 7. Agent Instructions
* Always write clean, production-ready, TypeScript-safe code.
* Do not leave `// TODO` comments or write partial placeholder components. Provide complete, drop-in solutions.
* If a request violates the Design System Boundaries (e.g., asking for a bright red alert box), politely push back and provide a premium, glassmorphic alternative that fits the brand.
