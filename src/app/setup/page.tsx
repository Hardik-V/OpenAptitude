"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import { ShoppingCart, Coffee, Plane, Zap, Tag, Check, ChevronRight, Building2, Lock, Sparkles, Target, ArrowRight } from "lucide-react";
import { useOnboardingStore, VISIBLE_STEPS, STEP_LABELS, type OnboardingStep } from "../../stores/onboarding.store";
import { ALL_CARDS, REDEMPTION_GOALS, SPEND_CATEGORIES, type SpendProfile } from "../../lib/cards";
import { rankCards, generateRationale, projectPointsTimeline } from "../../lib/scoring";
import { generateMockTransactions, aggregateToSpendProfile, PROFILES, type BankProfileType } from "../../lib/mockTransactions";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-bricolage" });
const dmMono    = DM_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono" });
const dmSans    = DM_Sans({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-dm" });

const NAVY   = "#0D1B2A";
const YELLOW = "#F2C94C";

// Max spend per orb — $10k cap
const ORB_MAX = 10000;

const CAT_ICONS = { groceries: ShoppingCart, dining: Coffee, travel: Plane, bills: Zap, other: Tag };

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("en-AU", { hour:"2-digit", minute:"2-digit" }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <nav style={{ position:"sticky", top:0, zIndex:100, height:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", background:"rgba(13,27,42,0.88)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
      <a href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:12 }}>
        <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height:20, filter:"brightness(0) invert(1)", opacity:0.9 }} />
        <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.25)", letterSpacing:"0.1em" }}>/ POINTS HACKER</span>
      </a>
      <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.18)", letterSpacing:"0.08em" }}>
        {time ? `${time} AEST` : ""}
      </div>
    </nav>
  );
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────
function StepBar() {
  const { step, completedSteps } = useOnboardingStore();
  const currentIdx = VISIBLE_STEPS.indexOf(step as OnboardingStep);

  return (
    <div style={{ padding:"0 32px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth:800, margin:"0 auto", display:"flex" }}>
        {VISIBLE_STEPS.map((s, i) => {
          const isDone = completedSteps.includes(s);
          const isCurrentActive = s === step;
          return (
            <div key={s} style={{ flex:1, padding:"14px 0", display:"flex", alignItems:"center", gap:8, borderBottom:`2px solid ${isCurrentActive ? YELLOW : isDone ? "rgba(242,201,76,0.3)" : "transparent"}`, transition:"border-color 0.4s" }}>
              <div style={{ width:20, height:20, borderRadius:4, flexShrink:0, background:isDone ? YELLOW : isCurrentActive ? "rgba(242,201,76,0.15)" : "rgba(255,255,255,0.04)", border:`1px solid ${isCurrentActive ? YELLOW : isDone ? YELLOW : "rgba(255,255,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>
                {isDone
                  ? <Check size={11} color={NAVY} strokeWidth={3} />
                  : <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color: isCurrentActive ? YELLOW : "rgba(255,255,255,0.2)" }}>{String(i+1).padStart(2,"0")}</span>
                }
              </div>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.08em", color: isCurrentActive ? YELLOW : isDone ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.16)", transition:"color 0.3s" }}>
                {STEP_LABELS[s].toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth:800, margin:"0 auto", padding:"52px 32px 80px", animation:"fadeUp 0.45s ease both" }}>
      {children}
    </div>
  );
}

// ─── Heading ──────────────────────────────────────────────────────────────────
function Heading({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom:40 }}>
      <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <div style={{ width:18, height:1, background:YELLOW, opacity:0.7 }} />
        <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:YELLOW, letterSpacing:"0.14em", textTransform:"uppercase", opacity:0.8 }}>{kicker}</span>
      </div>
      <h1 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(28px,5vw,44px)", fontWeight:800, letterSpacing:"-0.035em", lineHeight:1.0, color:"#fff", marginBottom:sub?12:0 }}>{title}</h1>
      {sub && <p style={{ fontSize:15, color:"rgba(255,255,255,0.38)", lineHeight:1.7, maxWidth:560, marginTop:12 }}>{sub}</p>}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background:YELLOW, color:NAVY, border:"none", borderRadius:10, padding:"14px 28px",
  fontFamily:"var(--font-bricolage)", fontSize:15, fontWeight:800, cursor:"pointer",
  letterSpacing:"-0.02em", transition:"all 0.2s", display:"inline-flex", alignItems:"center", gap:8,
};
const ghostBtn: React.CSSProperties = {
  background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.42)", border:"1px solid rgba(255,255,255,0.09)",
  borderRadius:8, padding:"12px 20px", fontFamily:"var(--font-mono)", fontSize:12,
  cursor:"pointer", letterSpacing:"0.06em", transition:"all 0.18s",
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEP: WELCOME
// ═══════════════════════════════════════════════════════════════════════════════
function StepWelcome() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  return (
    <Shell>
      <div style={{ textAlign:"center", paddingTop:32 }}>
        <h1 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(36px,6vw,64px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:0.95, color:"#fff", marginBottom:20 }}>
          Let's find your<br /><span style={{ color:YELLOW }}>next $800.</span>
        </h1>
        <p style={{ fontSize:16, color:"rgba(255,255,255,0.42)", lineHeight:1.75, maxWidth:440, margin:"0 auto 44px" }}>
          Tell us how you spend and we'll find the best card to switch to — showing exactly what you'll earn and when.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
          <button onClick={nextStep} style={{ ...primaryBtn, padding:"18px 52px", fontSize:17 }}>
            Get started <ArrowRight size={18} />
          </button>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.2)", marginTop:6 }}>No credit check · Free · 2 minutes</p>
        </div>

        {/* Social proof stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1, marginTop:56, background:"rgba(255,255,255,0.05)", borderRadius:14, overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)" }}>
          {[
            { val:"$612", label:"avg. bonus missed per year" },
            { val:"47%",  label:"of Australians never switch" },
            { val:"3.2yr",label:"avg. time on one card" },
          ].map((s, i) => (
            <div key={i} style={{ padding:"22px 16px", background:"rgba(255,255,255,0.02)", textAlign:"center" }}>
              <div style={{ fontFamily:"var(--font-bricolage)", fontSize:28, fontWeight:800, color:YELLOW, letterSpacing:"-0.03em" }}>{s.val}</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:5, lineHeight:1.5 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP: SPEND INPUT
// ═══════════════════════════════════════════════════════════════════════════════
function SpendOrb({ catKey, value, onChange }: { catKey: keyof SpendProfile; value: number; onChange: (v: number) => void }) {
  const cat = SPEND_CATEGORIES.find(c => c.key === catKey)!;
  const Icon = CAT_ICONS[catKey];
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);
  // Hard cap at ORB_MAX regardless of cat.max
  const effectiveMax = Math.min(cat.max ?? 10000, ORB_MAX);
  const pct = value / effectiveMax;
  const size = 80 + pct * 110;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const delta = (startY.current - e.clientY) * (effectiveMax / 300);
      onChange(Math.max(0, Math.min(effectiveMax, Math.round((startVal.current + delta) / 50) * 50)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [effectiveMax, onChange]);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, userSelect:"none" }}>
      <div
        className="orb"
        onPointerDown={(e) => { dragging.current=true; startY.current=(e as any).clientY; startVal.current=value; (e.target as Element).setPointerCapture?.((e as any).pointerId); e.preventDefault(); }}
        role="slider" aria-valuenow={value} aria-valuemin={0} aria-valuemax={effectiveMax} tabIndex={0}
        style={{ width:`${size}px`, height:`${size}px`, borderRadius:"50%", background:"linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))", border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"ns-resize", transition:"width 200ms ease,height 200ms ease", boxShadow:`0 8px 32px ${cat.color}20, inset 0 -10px 28px rgba(0,0,0,0.4)`, backdropFilter:"blur(4px)" }}
      >
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"54%", height:"54%", borderRadius:"50%", background:`radial-gradient(circle at 30% 30%, ${cat.color}28, transparent 50%)` }}>
          <Icon color={cat.color} size={size > 130 ? 26 : 18} />
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:13, fontWeight:500, color:"#fff", letterSpacing:"-0.01em" }}>${value.toLocaleString()}</div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.06em", marginTop:2 }}>{cat.label.toUpperCase()}</div>
      </div>
    </div>
  );
}

function StepSpendInput() {
  const { spend, setSpendCategory, nextStep, prevStep } = useOnboardingStore();
  const total = Object.values(spend).reduce((a, b) => a + b, 0);

  return (
    <Shell>
      <Heading kicker="Step 01" title={<>Your monthly<br /><span style={{ color:YELLOW }}>spending profile</span></>} sub="Drag each orb up to increase spend. We use this to find which card earns you the most." />

      <div style={{ display:"flex", justifyContent:"center", gap:"clamp(16px,3vw,36px)", flexWrap:"wrap", alignItems:"flex-end", padding:"24px 0 40px", minHeight:260 }}>
        {SPEND_CATEGORIES.map((cat) => (
          <SpendOrb key={cat.key} catKey={cat.key} value={spend[cat.key]} onChange={(v) => setSpendCategory(cat.key, v)} />
        ))}
      </div>

      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:4 }}>TOTAL MONTHLY SPEND</div>
          <div style={{ fontFamily:"var(--font-bricolage)", fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-0.03em" }}>${total.toLocaleString()}<span style={{ fontSize:14, fontWeight:400, color:"rgba(255,255,255,0.28)", marginLeft:4 }}>/ month</span></div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:4 }}>ANNUAL SPEND</div>
          <div style={{ fontFamily:"var(--font-bricolage)", fontSize:20, fontWeight:700, color:YELLOW }}>${(total * 12).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:12 }}>
        <button onClick={prevStep} style={ghostBtn}>Back</button>
        <button onClick={nextStep} style={{ ...primaryBtn, flex:1, justifyContent:"center" }}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP: BANK LINK
// ═══════════════════════════════════════════════════════════════════════════════
const MOCK_BANKS = [
  { id:"commbank", name:"CommBank", logo:"🟡", color:"#F59E0B" },
  { id:"westpac",  name:"Westpac",  logo:"🔴", color:"#EF4444" },
  { id:"anz",      name:"ANZ",      logo:"🔵", color:"#3B82F6" },
  { id:"nab",      name:"NAB",      logo:"🟠", color:"#F97316" },
  { id:"ing",      name:"ING",      logo:"🟣", color:"#A855F7" },
  { id:"up",       name:"Up Bank",  logo:"🟢", color:"#10B981" },
];

function BankLinkFlow({ onDone, onSkip }: { onDone: (profile: BankProfileType) => void; onSkip: () => void }) {
  const [stage, setStage] = useState<"pick"|"consent"|"connecting"|"done">("pick");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [profileType] = useState<BankProfileType>("young_professional");

  const handleBankSelect = (bankId: string) => { setSelectedBank(bankId); setStage("consent"); };

  const handleConsent = () => {
    setStage("connecting");
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 22 + 8;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(interval);
        setStage("done");
        setTimeout(() => onDone(profileType), 600);
      }
    }, 150);
  };

  if (stage === "pick") {
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
          {MOCK_BANKS.map((bank) => (
            <button key={bank.id} onClick={() => handleBankSelect(bank.id)}
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"18px 12px", cursor:"pointer", transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.14)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.08)"; }}
            >
              <span style={{ fontSize:28 }}>{bank.logo}</span>
              <span style={{ fontFamily:"var(--font-dm)", fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.65)" }}>{bank.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (stage === "consent") {
    const bank = MOCK_BANKS.find(b => b.id === selectedBank);
    return (
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <span style={{ fontSize:32 }}>{bank?.logo}</span>
          <div>
            <div style={{ fontFamily:"var(--font-bricolage)", fontSize:17, fontWeight:700, color:"#fff" }}>{bank?.name} is requesting access</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.35)", marginTop:2 }}>Read-only · 90 days · Revoke anytime</div>
          </div>
        </div>
        <div style={{ marginBottom:20 }}>
          {["Transaction history (90 days)", "Account balances", "Merchant categories"].map((perm) => (
            <div key={perm} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width:18, height:18, borderRadius:4, background:"rgba(242,201,76,0.12)", border:`1px solid rgba(242,201,76,0.28)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Check size={10} color={YELLOW} strokeWidth={3} />
              </div>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.55)" }}>{perm}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setStage("pick")} style={{ ...ghostBtn, flex:"0 0 auto" }}>Change</button>
          <button onClick={handleConsent} style={{ ...primaryBtn, flex:1, justifyContent:"center" }}>
            Authorise Access <Lock size={14} />
          </button>
        </div>
        <p style={{ marginTop:12, fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.16)", lineHeight:1.7, textAlign:"center" }}>
          Demo flow — no real data is requested or stored.
        </p>
      </div>
    );
  }

  if (stage === "connecting") {
    return (
      <div style={{ textAlign:"center", padding:"40px 0" }}>
        <div style={{ width:52, height:52, borderRadius:"50%", border:`2px solid rgba(255,255,255,0.07)`, borderTop:`2px solid ${YELLOW}`, animation:"spin 1s linear infinite", margin:"0 auto 24px" }} />
        <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:20 }}>Connecting...</div>
        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:100, height:3, overflow:"hidden", maxWidth:260, margin:"0 auto" }}>
          <div style={{ height:"100%", background:`linear-gradient(90deg,${YELLOW},rgba(242,201,76,0.6))`, width:`${progress}%`, transition:"width 0.2s ease", borderRadius:100 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign:"center", padding:"28px 0" }}>
      <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.28)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
        <Check size={22} color="#4ade80" strokeWidth={2.5} />
      </div>
      <div style={{ fontFamily:"var(--font-bricolage)", fontSize:17, fontWeight:700, color:"#fff", marginBottom:5 }}>Connected</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.38)" }}>Building your spend profile...</div>
    </div>
  );
}

function StepBankLink() {
  const { nextStep, prevStep, setSpend, setBankLink, markStepComplete } = useOnboardingStore();

  const handleDone = (profileType: BankProfileType) => {
    const txs = generateMockTransactions(profileType, 3);
    const derivedSpend = aggregateToSpendProfile(txs, 3);
    setSpend(derivedSpend);
    setBankLink({ status:"done", profileType, transactions:txs, linkedAt:new Date().toISOString() });
    markStepComplete("bank_link");
    setTimeout(() => nextStep(), 500);
  };

  const handleSkip = () => {
    setBankLink({ status:"skipped" });
    nextStep();
  };

  return (
    <Shell>
      <Heading kicker="Step 02" title={<>Connect your<br /><span style={{ color:YELLOW }}>bank account</span></>} sub="We use Open Banking (CDR) to read your transaction history and auto-populate your spend profile. Read-only, never stored." />
      <BankLinkFlow onDone={handleDone} onSkip={handleSkip} />
      <div style={{ marginTop:20 }}>
        <button onClick={handleSkip} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.26)", fontFamily:"var(--font-mono)", fontSize:11, cursor:"pointer", letterSpacing:"0.06em", padding:0 }}>
          Skip — enter manually instead
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP: TRANSACTION REVIEW
// ═══════════════════════════════════════════════════════════════════════════════
function StepTransactionReview() {
  const { bankLink, spend, nextStep, prevStep } = useOnboardingStore();
  const recent = bankLink.transactions.slice(0, 12);
  const catColor: Record<keyof SpendProfile, string> = {
    groceries:"#4ade80", dining:"#f97316", travel:"#60a5fa", bills:"#a78bfa", other:"#f472b6"
  };

  return (
    <Shell>
      <Heading kicker="Bank connected" title={<>Your spend<br /><span style={{ color:YELLOW }}>at a glance</span></>} sub="We've analysed 90 days of transactions and built your monthly spend profile." />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:28 }}>
        {SPEND_CATEGORIES.map((cat) => (
          <div key={cat.key} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${catColor[cat.key]}22`, borderRadius:10, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.08em", marginBottom:4, textTransform:"uppercase", fontFamily:"var(--font-mono)" }}>{cat.label}</div>
            <div style={{ fontFamily:"var(--font-bricolage)", fontSize:20, fontWeight:800, color:catColor[cat.key] }}>${(spend[cat.key] ?? 0).toLocaleString()}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.2)", marginTop:2, fontFamily:"var(--font-mono)" }}>/ mo</div>
          </div>
        ))}
      </div>

      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, overflow:"hidden", marginBottom:24 }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.08em" }}>RECENT TRANSACTIONS</div>
        {recent.map((tx) => (
          <div key={tx.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:catColor[tx.category], flexShrink:0 }} />
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>{tx.description}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.04)", padding:"2px 7px", borderRadius:4 }}>{tx.category}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"rgba(255,255,255,0.3)" }}>{tx.date}</span>
              <span style={{ fontFamily:"var(--font-bricolage)", fontSize:14, fontWeight:700, color:"#fff" }}>${tx.amount.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:12 }}>
        <button onClick={prevStep} style={ghostBtn}>Back</button>
        <button onClick={nextStep} style={{ ...primaryBtn, flex:1, justifyContent:"center" }}>
          Looks good, continue <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP: CARD HISTORY
// ═══════════════════════════════════════════════════════════════════════════════
function StepCardHistory() {
  const { cardHistory, toggleCardHistory, nextStep, prevStep } = useOnboardingStore();

  return (
    <Shell>
      <Heading kicker="Step 03" title={<>Cards you've<br /><span style={{ color:YELLOW }}>held before</span></>} sub="We won't recommend cards you've recently held — sign-up bonuses are one per customer per 18 months." />

      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28 }}>
        {ALL_CARDS.map((card) => {
          const held = cardHistory.includes(card.id);
          return (
            <button key={card.id} onClick={() => toggleCardHistory(card.id)}
              style={{ background: held ? `${card.accent}10` : "rgba(255,255,255,0.025)", border:`1px solid ${held ? card.accent+"38" : "rgba(255,255,255,0.07)"}`, borderRadius:10, padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all 0.2s", textAlign:"left" }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:22, borderRadius:4, background:`linear-gradient(135deg,${card.bg[0]},${card.bg[1]})`, border:"1px solid rgba(255,255,255,0.09)", flexShrink:0 }} />
                <div>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:14, fontWeight:700, color:"#fff" }}>{card.bank} {card.name}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", marginTop:2 }}>{card.rewardProgram} · {(card.bonus/1000).toFixed(0)}K bonus pts</div>
                </div>
              </div>
              <div style={{ width:22, height:22, borderRadius:5, background: held ? card.accent : "rgba(255,255,255,0.04)", border:`1px solid ${held ? card.accent : "rgba(255,255,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                {held && <Check size={12} color={NAVY} strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      {cardHistory.length > 0 && (
        <div style={{ background:"rgba(242,201,76,0.05)", border:"1px solid rgba(242,201,76,0.14)", borderRadius:8, padding:"10px 14px", marginBottom:20, fontFamily:"var(--font-mono)", fontSize:11, color:"rgba(255,255,255,0.45)" }}>
          {cardHistory.length} card{cardHistory.length > 1 ? "s" : ""} excluded from recommendations
        </div>
      )}

      <div style={{ display:"flex", gap:12 }}>
        <button onClick={prevStep} style={ghostBtn}>Back</button>
        <button onClick={nextStep} style={{ ...primaryBtn, flex:1, justifyContent:"center" }}>
          {cardHistory.length === 0 ? "None of these — continue" : "Continue"} <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP: GOAL SELECTION
// ═══════════════════════════════════════════════════════════════════════════════
function StepGoalSelection() {
  const { goal, setGoal, nextStep, prevStep } = useOnboardingStore();
  const goalIcons: Record<string, string> = { flights:"✈", hotels:"🏨", cashback:"💵", gift_cards:"🎁" };

  return (
    <Shell>
      <Heading kicker="Step 04" title={<>What are you<br /><span style={{ color:YELLOW }}>saving towards?</span></>} sub="We'll optimise your card strategy to reach this goal." />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:28 }}>
        {REDEMPTION_GOALS.map((g) => {
          const selected = goal?.id === g.id;
          return (
            <button key={g.id} onClick={() => setGoal(selected ? null : g)}
              style={{ background: selected ? "rgba(242,201,76,0.07)" : "rgba(255,255,255,0.025)", border:`1px solid ${selected ? "rgba(242,201,76,0.28)" : "rgba(255,255,255,0.07)"}`, borderRadius:12, padding:"18px 16px", cursor:"pointer", textAlign:"left", transition:"all 0.2s", position:"relative" }}
              onMouseEnter={e => { if(!selected) { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.045)"; } }}
              onMouseLeave={e => { if(!selected) { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.025)"; } }}
            >
              {selected && (
                <div style={{ position:"absolute", top:10, right:10, width:18, height:18, borderRadius:4, background:YELLOW, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Check size={11} color={NAVY} strokeWidth={3} />
                </div>
              )}
              <div style={{ fontSize:24, marginBottom:8 }}>{goalIcons[g.category]}</div>
              <div style={{ fontFamily:"var(--font-bricolage)", fontSize:15, fontWeight:700, color:"#fff", marginBottom:4 }}>{g.label}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.38)", marginBottom:12 }}>{g.description}</div>
              <div style={{ display:"flex", gap:12 }}>
                <div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em" }}>POINTS NEEDED</div>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:16, fontWeight:800, color: selected ? YELLOW : "rgba(255,255,255,0.65)" }}>{(g.pointsRequired/1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em" }}>VALUE</div>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:16, fontWeight:800, color: selected ? YELLOW : "rgba(255,255,255,0.65)" }}>${g.estimatedValue.toLocaleString()}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display:"flex", gap:12 }}>
        <button onClick={prevStep} style={ghostBtn}>Back</button>
        <button onClick={nextStep} style={{ ...primaryBtn, flex:1, justifyContent:"center" }}>
          {goal ? `Continue with "${goal.label}"` : "Skip — no specific goal"} <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP: ANALYSIS — instant, brief transition
// ═══════════════════════════════════════════════════════════════════════════════
function StepAnalysis() {
  const { spend, cardHistory, goal, setRankedCards, setSelectedCard, setStep } = useOnboardingStore();

  useEffect(() => {
    // Score immediately
    const ranked = rankCards(ALL_CARDS, spend, cardHistory, goal);
    setRankedCards(ranked);
    setSelectedCard(ranked[0]?.card ?? null);
    // Brief pause so the screen transition doesn't feel jarring, then go to results
    const t = setTimeout(() => setStep("results"), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight:"calc(100vh - 120px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 32px" }}>
      <div style={{ position:"relative", width:64, height:64 }}>
        <div style={{ width:64, height:64, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.06)", borderTop:`2px solid ${YELLOW}`, animation:"spin 1s linear infinite" }} />
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Sparkles size={20} color={YELLOW} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP: RESULTS
// ═══════════════════════════════════════════════════════════════════════════════
function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 100) * 100;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.38)", letterSpacing:"0.06em" }}>{label}</span>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.48)" }}>{Math.round(value)}</span>
      </div>
      <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:100, height:3, overflow:"hidden" }}>
        <div style={{ height:"100%", background:YELLOW, width:`${pct}%`, borderRadius:100, opacity: pct > 60 ? 1 : pct > 30 ? 0.6 : 0.3 }} />
      </div>
    </div>
  );
}

function MiniCard({ card }: { card: typeof ALL_CARDS[0] }) {
  return (
    <div style={{ width:200, height:120, borderRadius:10, background:`linear-gradient(135deg,${card.bg[0]},${card.bg[1]})`, padding:"14px 16px", display:"flex", flexDirection:"column", justifyContent:"space-between", boxShadow:`0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`, flexShrink:0, border:"1px solid rgba(255,255,255,0.07)" }}>
      <div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", fontFamily:"var(--font-mono)", letterSpacing:"0.1em", marginBottom:2 }}>{card.bank.toUpperCase()}</div>
        <div style={{ fontFamily:"var(--font-bricolage)", fontSize:13, fontWeight:700, color:"#fff" }}>{card.name}</div>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div style={{ fontFamily:"monospace", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.15em" }}>•••• 4821</div>
        <div style={{ fontFamily:"var(--font-bricolage)", fontSize:16, fontWeight:800, color:card.accent }}>{(card.bonus/1000).toFixed(0)}K</div>
      </div>
    </div>
  );
}

function StepResults() {
  const { rankedCards, setSelectedCard, setStep, goal } = useOnboardingStore();
  const spend = useOnboardingStore((s) => s.spend);
  const top = rankedCards[0];
  if (!top) return null;
  const bd = top.breakdown;

  return (
    <Shell>
      <Heading kicker="Analysis complete" title={<>Your optimal<br /><span style={{ color:YELLOW }}>first switch</span></>} />

      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:24, marginBottom:24, display:"flex", gap:28, alignItems:"flex-start", flexWrap:"wrap" }}>
        <MiniCard card={top.card} />
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:"inline-block", background:"rgba(242,201,76,0.1)", border:"1px solid rgba(242,201,76,0.22)", borderRadius:6, padding:"3px 10px", fontFamily:"var(--font-mono)", fontSize:10, color:YELLOW, letterSpacing:"0.08em", marginBottom:10 }}>
            MATCH SCORE {bd.total} / 1000
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.26)", marginBottom:4 }}>{top.card.bank.toUpperCase()}</div>
          <div style={{ fontFamily:"var(--font-bricolage)", fontSize:24, fontWeight:800, color:"#fff", letterSpacing:"-0.03em", marginBottom:8 }}>{top.card.name}</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.65, marginBottom:16 }}>
            {generateRationale(top, spend)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {[
              { label:"Bonus points", value:(top.card.bonus/1000).toFixed(0)+"K", sub:"sign-up" },
              { label:"Net value", value:"$"+bd.netBonusValue, sub:"after fee" },
              { label:"Time to bonus", value:bd.feasible ? `${bd.weeksToBonus}wk` : "Tight", sub:"approx." },
            ].map((s) => (
              <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.28)", letterSpacing:"0.08em", marginBottom:4 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:18, fontWeight:800, color:YELLOW }}>{s.value}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.2)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:14 }}>MATCH BREAKDOWN</div>
        <ScoreBar label="REWARD YIELD"          value={bd.rewardYield} />
        <ScoreBar label="VELOCITY FIT"          value={bd.velocityFit} />
        <ScoreBar label="CATEGORY OPTIMISATION" value={bd.categoryOptimization} />
        <ScoreBar label="FEE EFFICIENCY"        value={bd.annualFeeDecay} />
        {goal && <ScoreBar label="GOAL ALIGNMENT" value={bd.goalAlignment} />}
      </div>

      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.22)", letterSpacing:"0.1em", marginBottom:12 }}>OTHER OPTIONS</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {rankedCards.slice(1, 4).map(({ card, breakdown }) => (
            <button key={card.id} onClick={() => setSelectedCard(card)}
              style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"12px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"all 0.2s", textAlign:"left" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.048)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.025)"; }}
            >
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.22)", letterSpacing:"0.08em" }}>{card.bank.toUpperCase()}</div>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.75)" }}>{card.name}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:18, fontWeight:800, color:card.accent }}>{(card.bonus/1000).toFixed(0)}K</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.22)" }}>score {breakdown.total}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:12 }}>
        <button onClick={() => setStep("spend_input")} style={ghostBtn}>Adjust spend</button>
        <button onClick={() => setStep("timeline")} style={{ ...primaryBtn, flex:1, justifyContent:"center" }}>
          See my 12-month timeline <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP: TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════
function StepTimeline() {
  const { rankedCards, setStep } = useOnboardingStore();
  const router = useRouter();
  const spend = useOnboardingStore((s) => s.spend);
  const top = rankedCards[0];
  if (!top) return null;
  const card = top.card;
  const bd = top.breakdown;
  const today = new Date();

  const typeColors: Record<string, string> = {
    apply:"#60a5fa", setup:"#a78bfa", milestone:"#4ade80", bonus:YELLOW, review:"#f97316", close:"#f472b6", pivot:"#4ade80"
  };

  const events = [
    { month:0, title:"Apply for the card", body:`Apply for the ${card.bank} ${card.name} today. Approval typically takes 5–10 business days.`, type:"apply" },
    { month:1, title:"Card arrives + activate", body:"Set as your primary payment method. Set up Apple/Google Pay.", type:"setup" },
    { month: bd.weeksToBonus <= 4 ? 2 : 3, title:"Hit minimum spend target", body:`Reach $${card.minSpend.toLocaleString()} spend — projected in ~${bd.weeksToBonus} weeks based on your profile.`, type:"milestone" },
    { month:card.spendPeriod, title:`${(card.bonus/1000).toFixed(0)}K bonus points land`, body:`${card.bonus.toLocaleString()} bonus points added to your ${card.rewardProgram} account — worth approximately $${card.bonusValue}.`, type:"bonus" },
    { month:10, title:"Review ongoing value", body:`Weigh ongoing earn value vs $${card.annualFee} fee. If it's not earning its keep, prepare to close.`, type:"review" },
    { month:11, title:"Close the card", body:"Close before the 12-month mark to avoid paying the annual fee again. Minimal credit score impact if you hold other cards.", type:"close" },
    { month:12, title:"Return and pivot", body:"Come back to Points Hacker. Your history is saved. We'll find the next optimal switch.", type:"pivot" },
  ];

  const getMonthLabel = (offset: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleDateString("en-AU", { month:"short", year:"numeric" });
  };

  const handleGoToDashboard = () => {
    setStep("dashboard");
    router.push("/dashboard");
  };

  return (
    <Shell>
      <Heading kicker="Your playbook" title={<>{card.bank} {card.name}<br /><span style={{ color:YELLOW }}>12-month harvest</span></>}
        sub={`Follow this timeline to collect $${bd.netBonusValue} net. Every step is timed around your spend profile.`}
      />

      <div style={{ position:"relative", paddingLeft:28 }}>
        <div style={{ position:"absolute", left:10, top:8, bottom:8, width:1, background:"rgba(255,255,255,0.06)" }} />
        {events.map((ev, i) => (
          <div key={i} style={{ position:"relative", marginBottom:24, animation:`fadeUp 0.45s ease ${i*0.07}s both` }}>
            <div style={{ position:"absolute", left:-23, top:4, width:12, height:12, borderRadius:"50%", background:typeColors[ev.type], boxShadow:`0 0 10px ${typeColors[ev.type]}50` }} />
            <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:15, fontWeight:700, color:"#fff" }}>{ev.title}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", flexShrink:0, marginLeft:12 }}>{getMonthLabel(ev.month)}</div>
              </div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.42)", lineHeight:1.65 }}>{ev.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background:`rgba(242,201,76,0.06)`, border:`1px solid rgba(242,201,76,0.16)`, borderRadius:12, padding:"16px 18px", marginBottom:28 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:YELLOW, letterSpacing:"0.1em", marginBottom:6 }}>12-MONTH TOTAL</div>
        <div style={{ fontFamily:"var(--font-bricolage)", fontSize:32, fontWeight:800, color:"#fff", letterSpacing:"-0.03em" }}>
          ${bd.netBonusValue + Math.round(bd.monthlyEarnEstimate * 0.008 * 12)} net value
        </div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.38)", marginTop:4 }}>
          ${bd.netBonusValue} sign-up bonus + ${Math.round(bd.monthlyEarnEstimate * 0.008 * 12)} ongoing earn, after ${card.annualFee} fee
        </div>
      </div>

      <div style={{ display:"flex", gap:12 }}>
        <button onClick={() => setStep("results")} style={ghostBtn}>Results</button>
        <button onClick={handleGoToDashboard} style={{ ...primaryBtn, flex:1, justifyContent:"center" }}>
          Go to my dashboard <ChevronRight size={16} />
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════
export default function SetupPage() {
  const { step, setStep } = useOnboardingStore();
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to top on every step change
    topRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [step]);

  const renderStep = () => {
    switch (step) {
      case "welcome":            return <StepWelcome />;
      case "spend_input":        return <StepSpendInput />;
      case "bank_link":          return <StepBankLink />;
      case "transaction_review": return <StepTransactionReview />;
      case "card_history":       return <StepCardHistory />;
      case "goal_selection":     return <StepGoalSelection />;
      case "analysis":           return <StepAnalysis />;
      case "results":            return <StepResults />;
      case "timeline":           return <StepTimeline />;
      // "dashboard" step: blank screen during router navigation — prevents flash back to welcome
      case "dashboard":          return <div style={{ minHeight:"100vh" }} />;
      default:                   return <StepWelcome />;
    }
  };

  const showStepBar = !["welcome", "analysis", "dashboard"].includes(step);

  return (
    <div
      className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
      style={{
        fontFamily:"var(--font-dm)", background: NAVY, color:"#fff", minHeight:"100vh",
        // Dot grid background matching landing page
        backgroundImage:`radial-gradient(circle, rgba(255,255,255,0.065) 1px, transparent 1px)`,
        backgroundSize:"40px 40px",
        position:"relative",
      }}
    >
      {/* Radial gradient overlay to soften the grid */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, background:`radial-gradient(ellipse 100% 80% at 50% 20%, rgba(13,27,42,0.2) 0%, rgba(13,27,42,0.85) 60%, ${NAVY} 100%)` }} />
      <div style={{ position:"relative", zIndex:1 }}>
        <div ref={topRef} />
        <Nav />
        {showStepBar && <StepBar />}
        {renderStep()}
      </div>
      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
        html { scroll-behavior:smooth }
        body { background:${NAVY}; -webkit-font-smoothing:antialiased }
        @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        .orb { transition:transform 200ms cubic-bezier(.2,.9,.28,1),box-shadow 200ms; will-change:transform }
        .orb:hover { transform:translateY(-8px) scale(1.04); }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background:${NAVY} }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.07); border-radius:2px }
      `}</style>
    </div>
  );
}