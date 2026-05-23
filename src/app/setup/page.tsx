"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import {
  ShoppingCart, Coffee, Plane, Zap, Tag,
  Check, ChevronRight, ArrowRight, Lock,
  Sparkles, RefreshCw, TrendingUp, Calendar, CreditCard,
} from "lucide-react";
import { useOnboardingStore } from "../../stores/onboarding.store";
import type { OnboardingStep } from "../../stores/onboarding.store";
import { VISIBLE_STEPS, STEP_LABELS } from "../../stores/onboarding.store";
import { ALL_CARDS, REDEMPTION_GOALS, SPEND_CATEGORIES } from "../../lib/cards";
import type { SpendProfile } from "../../lib/cards";
import { rankCards } from "../../lib/scoring";
import { rankSequences, sequenceTimeline } from "../../lib/sequences";
import type { CardSequence } from "../../lib/sequences";
import {
  generateMockTransactions,
  aggregateToSpendProfile,
} from "../../lib/mockTransactions";
import type { BankProfileType } from "../../lib/mockTransactions";
import { FloatingCardsBackground } from "../components/FloatingCardsBackground";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-bricolage" });
const dmMono    = DM_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono" });
const dmSans    = DM_Sans({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-dm" });

const NAVY   = "#0D1B2A";
const YELLOW = "#F2C94C";

const RESET_IF_LANDED_ON: OnboardingStep[] = ["analysis", "dashboard"];

// ─── Shared primitives ────────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  background: YELLOW, color: NAVY, border: "none", borderRadius: 10,
  padding: "14px 28px", fontFamily: "var(--font-bricolage)", fontSize: 15,
  fontWeight: 800, cursor: "pointer", letterSpacing: "-0.02em",
  transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 8,
};

const ghostBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.42)",
  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8,
  padding: "12px 20px", fontFamily: "var(--font-mono)", fontSize: 12,
  cursor: "pointer", letterSpacing: "0.06em", transition: "all 0.18s",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "52px 32px 80px", animation: "fadeUp 0.4s ease both" }}>
      {children}
    </div>
  );
}

function Heading({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 18, height: 1, background: YELLOW, opacity: 0.7 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: YELLOW, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8 }}>{kicker}</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-bricolage)", fontSize: "clamp(28px,5vw,44px)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.0, color: "#fff", marginBottom: sub ? 10 : 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", lineHeight: 1.7, maxWidth: 520, marginTop: 10 }}>{sub}</p>}
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(13,27,42,0.88)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height: 18, filter: "brightness(0) invert(1)", opacity: 0.9 }} />
      </a>
    </nav>
  );
}

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepBar() {
  const { step, completedSteps } = useOnboardingStore();
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 32px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex" }}>
        {VISIBLE_STEPS.map((s, i) => {
          const done = completedSteps.includes(s);
          const active = s === step;
          return (
            <div key={s} style={{ flex: 1, padding: "12px 0", display: "flex", alignItems: "center", gap: 7, borderBottom: `2px solid ${active ? YELLOW : done ? "rgba(242,201,76,0.3)" : "transparent"}`, transition: "border-color 0.4s" }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, background: done ? YELLOW : active ? "rgba(242,201,76,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? YELLOW : done ? YELLOW : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                {done ? <Check size={10} color={NAVY} strokeWidth={3} /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: active ? YELLOW : "rgba(255,255,255,0.2)" }}>{String(i + 1).padStart(2, "0")}</span>}
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", color: active ? YELLOW : done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.16)", transition: "color 0.3s" }}>
                {STEP_LABELS[s].toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP: WELCOME - premium with animated card stack
// ═══════════════════════════════════════════════════════════════════

function WelcomeCardStack() {
  // Three decorative card silhouettes stacked with slight rotation
  const cards = [
    { bg: ["#1a3350","#0f2236"], accent: "#F2C94C", rot: -6, y: 8, bank: "American Express", pts: "100K" },
    { bg: ["#2a1a0f","#1a0f07"], accent: "#F97316", rot: 3, y: 4, bank: "Westpac", pts: "150K" },
    { bg: ["#1c2b4a","#121e35"], accent: "#60A5FA", rot: 0, y: 0, bank: "ANZ", pts: "80K" },
  ];
  return (
    <div style={{ position: "relative", width: 260, height: 160, margin: "0 auto 40px" }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          position: "absolute", inset: 0,
          transform: `rotate(${c.rot}deg) translateY(${c.y}px)`,
          transition: "transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          animation: `cardFloat ${2.4 + i * 0.4}s ease-in-out infinite alternate`,
          animationDelay: `${i * 0.3}s`,
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: 14,
            background: `linear-gradient(135deg, ${c.bg[0]} 0%, ${c.bg[1]} 100%)`,
            boxShadow: `0 ${24 + i * 8}px ${60 + i * 12}px rgba(0,0,0,${0.5 + i * 0.1}), 0 0 0 1px rgba(255,255,255,0.08)`,
            padding: "16px 18px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 1 }}>{c.bank}</div>
              </div>
              <div style={{ width: 28, height: 20, background: "linear-gradient(135deg,#c8982a,#f0c060,#b07820)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.18)" }} />
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)" }}>•••• •••• •••• 4821</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>08/28</div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 5, padding: "3px 7px", border: `1px solid ${c.accent}38` }}>
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 13, fontWeight: 800, color: c.accent, lineHeight: 1 }}>{c.pts}</div>
                <div style={{ fontSize: 6, color: "rgba(255,255,255,0.28)", marginTop: 1 }}>pts</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepWelcome() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  return (
    <Shell>
      <div style={{ textAlign: "center", paddingTop: 24 }}>
        <WelcomeCardStack />
        <h1 style={{ fontFamily: "var(--font-bricolage)", fontSize: "clamp(36px,6vw,60px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#fff", marginBottom: 18 }}>
          Let's find your<br /><span style={{ color: YELLOW }}>next $800.</span>
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, maxWidth: 420, margin: "0 auto 40px" }}>
          Tell us how you spend and we'll build your optimal card switching sequence - showing exactly what you'll earn over the next 3 years.
        </p>
        <button onClick={nextStep}
          style={{ ...primaryBtn, padding: "16px 48px", fontSize: 16 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px rgba(242,201,76,0.3)`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
        >
          Get started <ArrowRight size={17} />
        </button>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>NO CREDIT CHECK · FREE · 3 MINUTES</p>

        {/* Stats row - Airbnb-style horizontal rule separators */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginTop: 52, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { val: "$1,800+", label: "Avg. 3-year\nsequence value", icon: TrendingUp },
            { val: "3 cards", label: "Optimised switching\nsequence", icon: CreditCard },
            { val: "36 mo",  label: "Full harvest\nhorizon", icon: Calendar },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{ padding: "28px 20px", textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", position: "relative" }}>
                <Icon size={14} color="rgba(255,255,255,0.2)" style={{ marginBottom: 10 }} />
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-line" }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP: BANK LINK
// ═══════════════════════════════════════════════════════════════════

const MOCK_BANKS = [
  { id: "commbank", name: "CommBank",  logo: "🟡", profileType: "family"             as BankProfileType },
  { id: "westpac",  name: "Westpac",   logo: "🔴", profileType: "young_professional" as BankProfileType },
  { id: "anz",      name: "ANZ",       logo: "🔵", profileType: "family"             as BankProfileType },
  { id: "nab",      name: "NAB",       logo: "🟠", profileType: "young_professional" as BankProfileType },
  { id: "ing",      name: "ING",       logo: "🟣", profileType: "young_professional" as BankProfileType },
  { id: "up",       name: "Up Bank",   logo: "🟢", profileType: "foodie"             as BankProfileType },
];

function StepBankLink() {
  const { setStep, setSpend, setBankLink, markStepComplete, skipToSpendInput } = useOnboardingStore();
  const [stage, setStage] = useState<"pick" | "consent" | "connecting" | "done">("pick");
  const [selectedBank, setSelectedBank] = useState<typeof MOCK_BANKS[0] | null>(null);
  const [progress, setProgress] = useState(0);

  const handleConsent = () => {
    setStage("connecting");
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 22 + 8;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(interval);
        setStage("done");
        const txs = generateMockTransactions(selectedBank!.profileType, 3);
        const derived = aggregateToSpendProfile(txs, 3);
        setSpend(derived);
        setBankLink({ status: "done", bankName: selectedBank!.name, profileType: selectedBank!.profileType, transactions: txs, linkedAt: new Date().toISOString() });
        markStepComplete("bank_link");
        // Go to transaction review - not card history - so user sees their spend
        setTimeout(() => setStep("transaction_review"), 800);
      }
    }, 140);
  };

  if (stage === "pick") {
    return (
      <Shell>
        <Heading kicker="Step 1 of 3" title={<>Connect your<br /><span style={{ color: YELLOW }}>bank account</span></>} sub="We use Open Banking (CDR) to auto-read your spend. Read-only - we never store your credentials." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
          {MOCK_BANKS.map((bank) => (
            <button key={bank.id} onClick={() => { setSelectedBank(bank); setStage("consent"); }}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <span style={{ fontSize: 28 }}>{bank.logo}</span>
              <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{bank.name}</span>
            </button>
          ))}
        </div>
        <button onClick={skipToSpendInput} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.26)", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer", letterSpacing: "0.06em", padding: 0, marginTop: 4 }}>
          Skip - I'll enter my spend manually
        </button>
      </Shell>
    );
  }

  if (stage === "consent") {
    return (
      <Shell>
        <Heading kicker="Step 1 of 3" title="Confirm access" />
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 30 }}>{selectedBank?.logo}</span>
            <div>
              <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 16, fontWeight: 700, color: "#fff" }}>{selectedBank?.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Read-only · 90 days · Revoke anytime</div>
            </div>
          </div>
          {["Transaction history (90 days)", "Account balances", "Merchant categories"].map((perm) => (
            <div key={perm} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: 17, height: 17, borderRadius: 4, background: "rgba(242,201,76,0.12)", border: "1px solid rgba(242,201,76,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={9} color={YELLOW} strokeWidth={3} />
              </div>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{perm}</span>
            </div>
          ))}
          <p style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.16)", lineHeight: 1.7 }}>Demo flow - no real data is requested or stored.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setStage("pick")} style={ghostBtn}>Change bank</button>
          <button onClick={handleConsent} style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>
            Authorise access <Lock size={14} />
          </button>
        </div>
      </Shell>
    );
  }

  if (stage === "connecting") {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.07)", borderTop: `2px solid ${YELLOW}`, animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>Connecting to {selectedBank?.name}…</div>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 100, height: 3, overflow: "hidden", maxWidth: 240, margin: "0 auto" }}>
            <div style={{ height: "100%", background: `linear-gradient(90deg,${YELLOW},rgba(242,201,76,0.6))`, width: `${progress}%`, transition: "width 0.2s ease", borderRadius: 100 }} />
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.28)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <Check size={22} color="#4ade80" strokeWidth={2.5} />
        </div>
        <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 5 }}>Connected</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)" }}>Building your spend profile…</div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP: SPEND INPUT
// ═══════════════════════════════════════════════════════════════════

const CAT_ICONS = { groceries: ShoppingCart, dining: Coffee, travel: Plane, bills: Zap, other: Tag };

function SpendSlider({ catKey, value, onChange }: { catKey: keyof SpendProfile; value: number; onChange: (v: number) => void }) {
  const cat = SPEND_CATEGORIES.find(c => c.key === catKey)!;
  const Icon = CAT_ICONS[catKey];
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={14} color={cat.color} /> {cat.label}
        </span>
        <span style={{ fontFamily: "var(--font-bricolage)", fontSize: 16, fontWeight: 700, color: YELLOW }}>${value.toLocaleString()}</span>
      </div>
      <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${(value / (cat.max ?? 5000)) * 100}%`, background: `linear-gradient(90deg, ${cat.color}88, ${cat.color})`, borderRadius: 3, transition: "width 0.1s" }} />
        <input type="range" min={0} max={cat.max ?? 5000} step={50} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", margin: 0 }}
        />
      </div>
    </div>
  );
}

function StepSpendInput() {
  const { spend, setSpendCategory, skipToCardHistory, prevStep } = useOnboardingStore();
  const total = Object.values(spend).reduce((a, b) => a + b, 0);
  return (
    <Shell>
      <Heading kicker="Step 1 of 3" title={<>Your monthly<br /><span style={{ color: YELLOW }}>spending</span></>} sub="Adjust sliders to match your typical monthly spend. We use this to score which cards earn you the most." />
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px 24px 16px", marginBottom: 20 }}>
        {(Object.keys(CAT_ICONS) as Array<keyof SpendProfile>).map(key => (
          <SpendSlider key={key} catKey={key} value={spend[key]} onChange={v => setSpendCategory(key, v)} />
        ))}
      </div>
      <div style={{ background: "rgba(242,201,76,0.06)", border: "1px solid rgba(242,201,76,0.15)", borderRadius: 10, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>TOTAL MONTHLY</span>
        <span style={{ fontFamily: "var(--font-bricolage)", fontSize: 24, fontWeight: 800, color: YELLOW }}>${total.toLocaleString()}</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={prevStep} style={ghostBtn}>Back</button>
        <button onClick={skipToCardHistory} style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP: TRANSACTION REVIEW
// ═══════════════════════════════════════════════════════════════════

function StepTransactionReview() {
  const { bankLink, spend, skipToCardHistory, prevStep } = useOnboardingStore();
  const recent = bankLink.transactions.slice(0, 10);
  const catColor: Record<keyof SpendProfile, string> = { groceries: "#4ade80", dining: "#f97316", travel: "#60a5fa", bills: "#a78bfa", other: "#f472b6" };
  return (
    <Shell>
      <Heading kicker="Bank connected" title={<>Your spend<br /><span style={{ color: YELLOW }}>confirmed</span></>} sub="We've analysed 90 days and built your monthly profile. You can adjust this later." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 24 }}>
        {SPEND_CATEGORIES.map(cat => (
          <div key={cat.key} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${catColor[cat.key]}22`, borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.08em", marginBottom: 4 }}>{cat.label.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: catColor[cat.key] }}>${(spend[cat.key] ?? 0).toLocaleString()}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>/mo</div>
          </div>
        ))}
      </div>
      {recent.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.26)", letterSpacing: "0.08em" }}>RECENT TRANSACTIONS</div>
          {recent.map((tx: any) => (
            <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: catColor[tx.category as keyof SpendProfile], flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{tx.description}</span>
              </div>
              <span style={{ fontFamily: "var(--font-bricolage)", fontSize: 13, fontWeight: 700, color: "#fff" }}>${tx.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={prevStep} style={ghostBtn}>Back</button>
        <button onClick={skipToCardHistory} style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>
          Looks good <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP: CARD HISTORY - with mini card visuals
// ═══════════════════════════════════════════════════════════════════

// Mini card with chip, number pattern and network badge
function MiniCard({ card, dimmed }: { card: any; dimmed: boolean }) {
  return (
    <div style={{
      width: 44, height: 28, borderRadius: 5, flexShrink: 0,
      background: `linear-gradient(135deg, ${card.bg[0]}, ${card.bg[1]})`,
      border: "1px solid rgba(255,255,255,0.10)",
      position: "relative", overflow: "hidden",
      opacity: dimmed ? 0.4 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* Accent top line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${card.accent}70, transparent)` }} />
      {/* Chip */}
      <div style={{ position: "absolute", top: 5, left: 6, width: 9, height: 7, borderRadius: 1, background: "linear-gradient(135deg,#c8982a,#f0c060)", border: "0.5px solid rgba(0,0,0,0.2)" }} />
      {/* Dot pattern */}
      <div style={{ position: "absolute", bottom: 4, left: 5, right: 5, display: "flex", gap: 1.5 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width: 3, height: 1.5, borderRadius: 1, background: `${card.accent}55` }} />)}
      </div>
      {/* Shimmer overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)" }} />
    </div>
  );
}

function StepCardHistory() {
  const { cardHistory, toggleCardHistory, nextStep, prevStep } = useOnboardingStore();
  return (
    <Shell>
      <Heading kicker="Step 2 of 3" title={<>Cards you've<br /><span style={{ color: YELLOW }}>held before</span></>} sub="We'll skip these in your sequence - most banks won't give you the sign-up bonus again for 12–18 months." />
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 24 }}>
        {ALL_CARDS.map(card => {
          const held = cardHistory.includes(card.id);
          return (
            <button key={card.id} onClick={() => toggleCardHistory(card.id)}
              style={{
                background: held ? `${card.accent}0a` : "rgba(255,255,255,0.025)",
                border: `1px solid ${held ? card.accent + "30" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 10, padding: "12px 15px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "all 0.2s", textAlign: "left",
              }}
              onMouseEnter={e => {
                if (!held) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.045)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.13)";
                }
              }}
              onMouseLeave={e => {
                if (!held) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <MiniCard card={card} dimmed={held} />
                <div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 700, color: held ? "rgba(255,255,255,0.38)" : "#fff", transition: "color 0.2s" }}>
                    {card.bank} {card.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: held ? "rgba(255,255,255,0.18)" : `${card.accent}99`, transition: "color 0.2s" }}>{card.rewardProgram}</span>
                    <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.26)" }}>{(card.bonus / 1000).toFixed(0)}K pts</span>
                    <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{card.cooldownMonths}mo cooldown</span>
                  </div>
                </div>
              </div>
              {/* Checkbox */}
              <div style={{ width: 20, height: 20, borderRadius: 5, background: held ? card.accent : "rgba(255,255,255,0.04)", border: `1px solid ${held ? card.accent : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                {held && <Check size={11} color={NAVY} strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>
      {cardHistory.length > 0 && (
        <div style={{ background: "rgba(242,201,76,0.05)", border: "1px solid rgba(242,201,76,0.14)", borderRadius: 8, padding: "9px 14px", marginBottom: 18, fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
          {cardHistory.length} card{cardHistory.length > 1 ? "s" : ""} excluded - will reappear in sequence after cooldown clears
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={prevStep} style={ghostBtn}>Back</button>
        <button onClick={nextStep} style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>
          {cardHistory.length === 0 ? "None - continue" : "Continue"} <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP: GOAL SELECTION - Airbnb-style cards, no emoji
// ═══════════════════════════════════════════════════════════════════

// Elegant SVG icons for each goal category - no emoji
function GoalIcon({ category, color, size = 22 }: { category: string; color: string; size?: number }) {
  const s = size;
  if (category === "flights") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
  if (category === "hotels") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22V8l9-6 9 6v14" stroke={color} strokeWidth="1.5"/>
      <path d="M9 22V12h6v10" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
  if (category === "cashback") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <path d="M12 7v1m0 8v1M9.5 9.5C9.5 8.4 10.6 8 12 8s2.5.9 2.5 2c0 2-5 2-5 4 0 1.1 1.1 2 2.5 2s2.5-.4 2.5-1.5" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
  // gift_cards / default
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="14" rx="2" stroke={color} strokeWidth="1.5"/>
      <path d="M21 12H3M12 8V22" stroke={color} strokeWidth="1.5"/>
      <path d="M12 8C12 8 9.5 5 8 5.5S6 8 8 8h4zm0 0C12 8 14.5 5 16 5.5S18 8 16 8h-4z" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

function StepGoalSelection() {
  const { goal, setGoal, nextStep, prevStep } = useOnboardingStore();
  const [hovered, setHovered] = useState<string | null>(null);

  const goalAccent: Record<string, string> = {
    flights: "#60a5fa",
    hotels: "#a78bfa",
    cashback: "#4ade80",
    gift_cards: "#f97316",
  };

  return (
    <Shell>
      <Heading kicker="Step 3 of 3" title={<>What are you<br /><span style={{ color: YELLOW }}>saving for?</span></>} sub="We'll weight your sequence towards cards that get you there fastest." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 24 }}>
        {REDEMPTION_GOALS.map(g => {
          const sel = goal?.id === g.id;
          const accent = goalAccent[g.category] ?? YELLOW;
          const isHov = hovered === g.id && !sel;
          return (
            <button key={g.id} onClick={() => setGoal(sel ? null : g)}
              onMouseEnter={() => setHovered(g.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: sel ? `${accent}0e` : isHov ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${sel ? accent + "50" : isHov ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 14, padding: "20px 18px", cursor: "pointer", textAlign: "left",
                transition: "all 0.22s", position: "relative", overflow: "hidden",
                boxShadow: sel ? `0 0 0 3px ${accent}18` : "none",
              }}
            >
              {/* Subtle top-edge glow when selected */}
              {sel && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${accent}90, transparent)` }} />}

              {/* Checkmark top-right */}
              {sel && (
                <div style={{ position: "absolute", top: 12, right: 12, width: 18, height: 18, borderRadius: 4, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={10} color={NAVY} strokeWidth={3} />
                </div>
              )}

              {/* Icon */}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: sel ? `${accent}18` : `${accent}10`, border: `1px solid ${sel ? accent + "35" : accent + "20"}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, transition: "all 0.22s" }}>
                <GoalIcon category={g.category} color={sel ? accent : `${accent}bb`} size={20} />
              </div>

              <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 15, fontWeight: 700, color: sel ? "#fff" : "rgba(255,255,255,0.82)", marginBottom: 4 }}>{g.label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", marginBottom: 14, lineHeight: 1.5 }}>{g.description}</div>

              {/* Divider */}
              <div style={{ height: 1, background: sel ? `${accent}25` : "rgba(255,255,255,0.05)", marginBottom: 12 }} />

              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.24)", letterSpacing: "0.08em", marginBottom: 3 }}>POINTS NEEDED</div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 17, fontWeight: 800, color: sel ? accent : "rgba(255,255,255,0.6)", letterSpacing: "-0.02em" }}>{(g.pointsRequired / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.24)", letterSpacing: "0.08em", marginBottom: 3 }}>EST. VALUE</div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 17, fontWeight: 800, color: sel ? accent : "rgba(255,255,255,0.6)", letterSpacing: "-0.02em" }}>${g.estimatedValue.toLocaleString()}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={prevStep} style={ghostBtn}>Back</button>
        <button onClick={nextStep} style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>
          {goal ? `Continue with "${goal.label}"` : "No specific goal - continue"} <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP: ANALYSIS
// ═══════════════════════════════════════════════════════════════════

function StepAnalysis() {
  const { spend, cardHistory, goal, setRankedCards, setRankedSequences, setSelectedSequence, setStep } = useOnboardingStore();
  useEffect(() => {
    const ranked = rankCards(ALL_CARDS, spend, cardHistory, goal);
    const sequences = rankSequences(ALL_CARDS, spend, cardHistory, goal);
    setRankedCards(ranked);
    setRankedSequences(sequences);
    setSelectedSequence(sequences[0] ?? null);
    const t = setTimeout(() => setStep("results"), 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "calc(100vh - 120px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 56, height: 56 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)", borderTop: `2px solid ${YELLOW}`, animation: "spin 1s linear infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={18} color={YELLOW} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP: RESULTS - tab-based route selector
// One route shown at a time. Pick from tabs, see full detail below.
// ═══════════════════════════════════════════════════════════════════

function SlotCard({ slot, index, accentColor }: { slot: any; index: number; accentColor: string }) {
  return (
    <div style={{
      flex: 1,
      background: `linear-gradient(160deg, ${slot.card.bg[0]} 0%, ${slot.card.bg[1]} 100%)`,
      borderRadius: 14, padding: "18px 16px",
      border: "1px solid rgba(255,255,255,0.08)",
      position: "relative", overflow: "hidden",
      transition: "transform 0.2s",
    }}>
      {/* Accent top line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${slot.card.accent}80, transparent)` }} />

      {/* Card number */}
      <div style={{ position: "absolute", top: 14, right: 14, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{index + 1}</span>
      </div>

      {/* Month label */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 10 }}>
        MONTH {slot.startMonth}
      </div>

      {/* Mini card visual */}
      <div style={{ width: 40, height: 26, borderRadius: 4, background: `linear-gradient(135deg,${slot.card.bg[0]},${slot.card.bg[1]})`, border: "1px solid rgba(255,255,255,0.12)", marginBottom: 12, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${slot.card.accent}70, transparent)` }} />
        <div style={{ position: "absolute", top: 5, left: 5, width: 8, height: 6, borderRadius: 1, background: "linear-gradient(135deg,#c8982a,#f0c060)", border: "0.5px solid rgba(0,0,0,0.2)" }} />
        <div style={{ position: "absolute", bottom: 3, left: 4, right: 4, display: "flex", gap: 2 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: 1.5, borderRadius: 1, background: `${slot.card.accent}44` }} />)}
        </div>
      </div>

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.28)", marginBottom: 3 }}>{slot.card.bank.toUpperCase()}</div>
      <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 10 }}>{slot.card.name}</div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 10 }} />

      <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 22, fontWeight: 800, color: slot.feasible ? slot.card.accent : "#f87171", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {slot.feasible ? `$${slot.bonusValue}` : "Tight"}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.22)", marginTop: 3 }}>net bonus</div>
    </div>
  );
}

function StepResults() {
  const { rankedSequences, selectedSequence, setSelectedSequence, setStep, spend } = useOnboardingStore();
  const [animKey, setAnimKey] = useState(0);

  const handleTabClick = (seq: CardSequence) => {
    setSelectedSequence(seq);
    setAnimKey(k => k + 1); // re-trigger fade-in
  };

  if (rankedSequences.length === 0) return null;
  const seq = selectedSequence ?? rankedSequences[0];

  return (
    <Shell>
      <Heading kicker="Your sequences" title={<>Pick your<br /><span style={{ color: YELLOW }}>3-card path</ span></>}
        sub="Each sequence is a different 3-year strategy ranked by total net value."
      />

      {/* ── Route tabs ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {rankedSequences.map((s, i) => {
          const active = seq.id === s.id;
          return (
            <button key={s.id} onClick={() => handleTabClick(s)}
              style={{
                background: active ? `${s.archetypeColor}18` : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? s.archetypeColor + "55" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8, padding: "8px 14px", cursor: "pointer",
                transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
                boxShadow: active ? `0 0 0 2px ${s.archetypeColor}18` : "none",
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)"; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; } }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: active ? s.archetypeColor : "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}>
                ROUTE {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontFamily: "var(--font-bricolage)", fontSize: 12, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,0.45)" }}>
                {s.archetypeLabel.replace(" Route", "")}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Featured sequence display ── */}
      <div key={animKey} style={{ animation: "fadeUp 0.3s ease both" }}>
        {/* Header */}
        <div style={{
          background: `${seq.archetypeColor}08`, border: `1px solid ${seq.archetypeColor}28`,
          borderRadius: "16px 16px 0 0", padding: "20px 22px",
          borderBottom: "none", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${seq.archetypeColor}70, transparent)` }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${seq.archetypeColor}18`, border: `1px solid ${seq.archetypeColor}40`, borderRadius: 5, padding: "2px 9px", marginBottom: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: seq.archetypeColor }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: seq.archetypeColor, letterSpacing: "0.08em" }}>{seq.archetypeLabel.toUpperCase()}</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.32)" }}>
                {(seq.totalBonusPoints / 1000).toFixed(0)}K total pts · {seq.horizon} month horizon
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>36-MO NET VALUE</div>
              <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 36, fontWeight: 800, color: seq.archetypeColor, lineHeight: 1, letterSpacing: "-0.04em" }}>
                ${seq.totalValue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Three card slots side by side */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: `1px solid ${seq.archetypeColor}22`,
          borderRadius: "0 0 16px 16px", padding: "16px",
          display: "flex", gap: 10, alignItems: "stretch",
        }}>
          {seq.slots.map((slot, i) => (
            <React.Fragment key={i}>
              <SlotCard slot={slot} index={i} accentColor={seq.archetypeColor} />
              {i < 2 && (
                <div style={{ display: "flex", alignItems: "center", flexShrink: 0, padding: "0 2px" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M10 5l3 3-3 3" stroke={seq.archetypeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {!seq.allFeasible && (
          <div style={{ marginTop: 10, padding: "9px 14px", background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.22)", borderRadius: 8, fontSize: 11, color: "#f97316", fontFamily: "var(--font-mono)" }}>
            One or more cards require higher monthly spend to unlock the sign-up bonus
          </div>
        )}
      </div>

      {/* Spend profile inline */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 16px", margin: "16px 0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}>YOUR MONTHLY SPEND</div>
          <button onClick={() => setStep("spend_input")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-mono)", fontSize: 9, cursor: "pointer", letterSpacing: "0.06em", padding: 0, display: "flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={9} /> Adjust
          </button>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {SPEND_CATEGORIES.map(cat => (
            <div key={cat.key}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.24)" }}>{cat.label.toUpperCase()}</div>
              <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 700, color: cat.color }}>${spend[cat.key].toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setStep("goal_selection")} style={ghostBtn}>Back</button>
        <button onClick={() => setStep("timeline")}
          style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>
          Build my 36-month plan <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP: TIMELINE - no emoji, premium
// ═══════════════════════════════════════════════════════════════════

// Elegant inline icons for timeline events - replaces emoji
function EventTypeIcon({ type, color }: { type: string; color: string }) {
  const s = 13;
  if (type === "apply") return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.4"/>
      <path d="M5.5 8h5M8 5.5v5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  if (type === "bonus") return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M8 2l1.5 3.5L13 6.5l-2.5 2.5.5 3.5L8 11 5 12.5l.5-3.5L3 6.5l3.5-1z" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
  if (type === "close") return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="4.5" width="11" height="8" rx="1.5" stroke={color} strokeWidth="1.4"/>
      <path d="M2.5 7.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  if (type === "pivot") return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M10 5l3 3-3 3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.4"/>
      <path d="M8 5v3.5L10 10" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function StepTimeline() {
  const { selectedSequence, rankedSequences, setSelectedSequence, setStep } = useOnboardingStore();
  const router = useRouter();
  if (!selectedSequence) return null;

  const events = sequenceTimeline(selectedSequence);
  const today = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const getDate = (offset: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + offset);
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleDashboard = () => {
    setStep("dashboard");
    router.push("/dashboard");
  };

  // Group events by card slot for visual grouping
  const eventTypeLabel: Record<string, string> = { apply: "Apply", bonus: "Bonus lands", close: "Close card", pivot: "Switch card", fee: "Fee due" };

  return (
    <Shell>
      <Heading kicker="Your 36-month plan"
        title={<><span style={{ color: selectedSequence.archetypeColor }}>{selectedSequence.archetypeLabel}</span></>}
        sub={`${(selectedSequence.totalBonusPoints / 1000).toFixed(0)}K total bonus points · $${selectedSequence.totalValue.toLocaleString()} estimated net value`}
      />

      {/* Card summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 32 }}>
        {selectedSequence.slots.map((slot, i) => (
          <div key={i} style={{ background: `linear-gradient(135deg, ${slot.card.bg[0]}, ${slot.card.bg[1]})`, borderRadius: 12, padding: "16px", border: "1px solid rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${slot.card.accent}80, transparent)` }} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 3 }}>CARD {i + 1} · {getDate(slot.startMonth)}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.28)", marginBottom: 2 }}>{slot.card.bank.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{slot.card.name}</div>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 22, fontWeight: 800, color: slot.card.accent, letterSpacing: "-0.03em" }}>${slot.bonusValue > 0 ? slot.bonusValue : slot.card.bonusValue - slot.card.annualFee}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.26)", marginTop: 1 }}>net bonus value</div>
          </div>
        ))}
      </div>

      {/* Timeline - no emoji, clean vertical track */}
      <div style={{ position: "relative", paddingLeft: 32, marginBottom: 28 }}>
        {/* Vertical track line */}
        <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 1, background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)" }} />

        {events.map((ev, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 14, animation: `fadeUp 0.4s ease ${i * 0.06}s both` }}>
            {/* Node dot */}
            <div style={{ position: "absolute", left: -27, top: 13, width: 14, height: 14, borderRadius: "50%", background: `${ev.cardAccent}22`, border: `1.5px solid ${ev.cardAccent}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 8px ${ev.cardAccent}30` }}>
              <EventTypeIcon type={ev.type} color={ev.cardAccent} />
            </div>

            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", transition: "border-color 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${ev.cardAccent}28`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Event type pill */}
                  <div style={{ background: `${ev.cardAccent}15`, border: `1px solid ${ev.cardAccent}30`, borderRadius: 4, padding: "1px 7px", fontFamily: "var(--font-mono)", fontSize: 8, color: ev.cardAccent, letterSpacing: "0.08em" }}>
                    {(eventTypeLabel[ev.type] ?? ev.type).toUpperCase()}
                  </div>
                  <span style={{ fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 700, color: "#fff" }}>{ev.label}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.28)", flexShrink: 0, marginLeft: 10 }}>{getDate(ev.month)}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>{ev.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Total value callout */}
      <div style={{ background: `${selectedSequence.archetypeColor}0a`, border: `1px solid ${selectedSequence.archetypeColor}28`, borderRadius: 14, padding: "20px 22px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${selectedSequence.archetypeColor}60, transparent)` }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: selectedSequence.archetypeColor, letterSpacing: "0.1em", marginBottom: 6 }}>36-MONTH TOTAL</div>
        <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
          ${selectedSequence.totalValue.toLocaleString()}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
          {selectedSequence.slots.length} card switches · {(selectedSequence.totalBonusPoints / 1000).toFixed(0)}K bonus points harvested
        </div>
      </div>

      {/* Sequence switcher */}
      {rankedSequences.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.26)", letterSpacing: "0.1em", marginBottom: 10 }}>COMPARE A DIFFERENT SEQUENCE</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {rankedSequences.map(seq => (
              <button key={seq.id} onClick={() => setSelectedSequence(seq)}
                style={{ background: selectedSequence.id === seq.id ? `${seq.archetypeColor}18` : "rgba(255,255,255,0.04)", border: `1px solid ${selectedSequence.id === seq.id ? seq.archetypeColor + "55" : "rgba(255,255,255,0.07)"}`, borderRadius: 100, padding: "6px 13px", fontSize: 11, fontFamily: "var(--font-mono)", color: selectedSequence.id === seq.id ? seq.archetypeColor : "rgba(255,255,255,0.38)", cursor: "pointer", transition: "all 0.18s" }}>
                {seq.archetypeLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setStep("results")} style={ghostBtn}>Change path</button>
        <button onClick={handleDashboard} style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>
          Go to my dashboard <ChevronRight size={16} />
        </button>
      </div>
      <p style={{ marginTop: 20, fontSize: 10, color: "rgba(255,255,255,0.15)", lineHeight: 1.7, textAlign: "center" }}>
        General information only. Not financial advice. Card offers subject to change. Always read the PDS before applying.
      </p>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ROOT CONTROLLER
// ═══════════════════════════════════════════════════════════════════

const HIDE_STEPBAR: OnboardingStep[] = ["welcome", "analysis", "dashboard"];

export default function SetupPage() {
  const { step, setStep, bankLink, reset } = useOnboardingStore();
  const topRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const didResetCheck = useRef(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (didResetCheck.current) return;
    didResetCheck.current = true;
    if (RESET_IF_LANDED_ON.includes(step)) setStep("welcome");
  }, [hydrated]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)", borderTop: `2px solid ${YELLOW}`, animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case "welcome":            return <StepWelcome />;
      case "bank_link":          return <StepBankLink />;
      case "spend_input":        return <StepSpendInput />;
      case "transaction_review": return bankLink.status === "done" ? <StepTransactionReview /> : <StepSpendInput />;
      case "card_history":       return <StepCardHistory />;
      case "goal_selection":     return <StepGoalSelection />;
      case "analysis":           return <StepAnalysis />;
      case "results":            return <StepResults />;
      case "timeline":           return <StepTimeline />;
      case "dashboard":          return <div style={{ minHeight: "100vh" }} />;
      default:                   return <StepWelcome />;
    }
  };

  return (
    <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
      style={{ fontFamily: "var(--font-dm)", background: NAVY, color: "#fff", minHeight: "100vh", position: "relative" }}
    >
      {/* Layer 0: floating cards */}
      <FloatingCardsBackground />

      {/* Layer 1: dark vignette - keeps content readable */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: `radial-gradient(ellipse 100% 80% at 50% 20%, rgba(13,27,42,0.55) 0%, rgba(13,27,42,0.88) 55%, ${NAVY} 100%)`,
      }} />

      {/* Layer 2: all page content */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div ref={topRef} />
        <Nav />
        {!HIDE_STEPBAR.includes(step) && <StepBar />}
        {renderStep()}
      </div>

      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
        html { scroll-behavior:smooth }
        body { background:${NAVY}; -webkit-font-smoothing:antialiased }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.8)} }
        @keyframes cardFloat { from{transform:var(--rot) translateY(var(--y))} to{transform:var(--rot) translateY(calc(var(--y) - 6px))} }
        input[type=range]  { -webkit-appearance:none; appearance:none }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:${YELLOW}; cursor:pointer }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background:${NAVY} }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.07); border-radius:2px }
      `}</style>
    </div>
  );
}