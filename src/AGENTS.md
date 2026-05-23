<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI-Native Engineering Log

This document outlines the AI-assisted workflows utilized during the development of the **Open | Points Hacker Assistant**. As per the assessment brief, this project was built using an AI-native approach to accelerate ideation, handle complex mathematical abstractions, and elevate product design.

## 1. GPGPU Shader Extraction & Reverse Engineering
To achieve an ultra-premium, zero-latency visual experience, I wanted a background canvas that rivaled top-tier tech landing pages. 
* **The Process:** I used AI to assist in reverse-engineering minified, 74k-line production WebGL bundles from a reference site. 
* **The Outcome:** Together with the LLM, we isolated the core physics loops, translated the raw GPGPU (General-Purpose Computing on GPUs) ping-pong framebuffers, and injected the necessary GLSL Simplex Noise algorithms to run a 65,000-particle collision matrix natively in Next.js without blocking the main React thread.

## 2. Product Ideation & Feature Expansion
Rather than just building a basic calculator, I used AI as a strategic sounding board to evolve the brief from a functional tool into a complete financial infrastructure product.
* **The Process:** Prompted the AI to evaluate the psychological friction points of "points hacking" (e.g., fear of credit damage, data-entry fatigue, churn after application).
* **The Outcome:** This collaborative brainstorming directly resulted in the architectural planning of the 5 Product Pillars:
  1. *Credit Health Shield* (Addressing credit score anxiety)
  2. *Mock CDR / Open Banking Link* (Removing slider friction)
  3. *Real-World Flight Mapping* (Translating points into tangible luxury goals)
  4. *Active Flight Deck* (Solving user retention)
  5. *Refinancing Funnel* (Establishing a clear monetization path for Open Loans)

## 3. UI/UX Refactoring & Hydration Safety
AI was leveraged to rapidly iterate on the visual hierarchy and enforce Next.js App Router best practices.
* **The Process:** Supplied initial state-machine logic and layout drafts to the LLM with strict design system constraints (glassmorphism, Lucide icons, Bricolage Grotesque typography, and strict color palettes).
* **The Outcome:** The AI accelerated the conversion of primitive conditional blocks into a fluid, animated dashboard layout. When Next.js strict-mode hydration errors occurred due to server/client timestamp mismatches and random UI generators, I utilized the AI to instantly diagnose the VDOM diff errors and implement hydration-safe `useEffect` lifecycle boundaries.

## Summary of AI Utilization
* **Role:** Acted as the Principal Engineer and Product Owner; utilized the LLM as a senior pair-programmer and architectural sounding board.
* **Efficiency:** Reduced the time required to build complex GLSL shaders and fluid CSS transitions from days to hours.
* **Focus:** Allowed me to spend more time on macro-level product thinking, user psychology, and ensuring the final deployment felt like a scalable, venture-ready consumer application.
