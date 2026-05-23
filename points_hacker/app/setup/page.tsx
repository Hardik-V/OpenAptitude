"use client";

import { useState, useEffect, useRef } from "react";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-bricolage" });
const dmSans    = DM_Sans({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-dm" });

const NAVY   = "#0D1B2A";
const YELLOW = "#F2C94C";

// ── Card database ──────────────────────────────────────────────────────────
const ALL_CARDS = [
  {
    id: "westpac-altitude",
    bank: "Westpac", name: "Altitude Black", network: "MC",
    bonus: 150000, bonusValue: 750, annualFee: 250,
    minSpend: 4000, spendPeriod: 3,
    accent: "#F97316", bg: ["#2a1a0f","#1a0f07"],
    earnRate: { groceries:2, dining:3, travel:3, bills:1, other:1 },
    bestFor: ["travel","dining"],
    tag: "Best value overall",
    tagColor: "#F97316",
  },
  {
    id: "anz-ff-black",
    bank: "ANZ", name: "Frequent Flyer Black", network: "VISA",
    bonus: 80000, bonusValue: 640, annualFee: 425,
    minSpend: 2500, spendPeriod: 3,
    accent: "#60A5FA", bg: ["#1c2b4a","#121e35"],
    earnRate: { groceries:1, dining:1, travel:2, bills:1, other:1 },
    bestFor: ["travel"],
    tag: "Best for Qantas flyers",
    tagColor: "#60A5FA",
  },
  {
    id: "nab-qantas",
    bank: "NAB", name: "Qantas Rewards Sig.", network: "VISA",
    bonus: 90000, bonusValue: 720, annualFee: 395,
    minSpend: 3000, spendPeriod: 3,
    accent: "#A78BFA", bg: ["#1a1040","#0d0a28"],
    earnRate: { groceries:1, dining:2, travel:2, bills:1, other:1 },
    bestFor: ["dining","travel"],
    tag: "Best earn rate on dining",
    tagColor: "#A78BFA",
  },
  {
    id: "amex-platinum",
    bank: "American Express", name: "Platinum Edge", network: "AMEX",
    bonus: 100000, bonusValue: 800, annualFee: 195,
    minSpend: 3000, spendPeriod: 3,
    accent: "#F2C94C", bg: ["#1a3350","#0f2236"],
    earnRate: { groceries:3, dining:2, travel:2, bills:1, other:1 },
    bestFor: ["groceries","everyday"],
    tag: "Lowest fee / highest value",
    tagColor: "#F2C94C",
  },
  {
    id: "citi-premier",
    bank: "Citibank", name: "Premier", network: "VISA",
    bonus: 75000, bonusValue: 600, annualFee: 300,
    minSpend: 3000, spendPeriod: 3,
    accent: "#34D399", bg: ["#0d2d22","#071a14"],
    earnRate: { groceries:2, dining:2, travel:3, bills:1, other:1 },
    bestFor: ["travel","dining"],
    tag: "Best for international travel",
    tagColor: "#34D399",
  },
  {
    id: "commbank-awards",
    bank: "CommBank", name: "Diamond Awards", network: "MC",
    bonus: 120000, bonusValue: 700, annualFee: 350,
    minSpend: 5000, spendPeriod: 4,
    accent: "#FB923C", bg: ["#2a1505","#1a0d03"],
    earnRate: { groceries:2, dining:2, travel:2, bills:2, other:1.5 },
    bestFor: ["bills","everyday"],
    tag: "Best for high spenders",
    tagColor: "#FB923C",
  },
];

// ── Scoring engine ──────────────────────────────────────────────────────────
function scoreCard(card: typeof ALL_CARDS[0], spend: SpendProfile, history: string[]) {
  const totalSpend = Object.values(spend).reduce((a,b) => a+b, 0);
  const monthlySpendNeeded = card.minSpend / card.spendPeriod;

  // Feasibility penalty if they can't hit min spend
  const feasible = totalSpend >= monthlySpendNeeded;
  const feasibilityScore = feasible ? 100 : (totalSpend / monthlySpendNeeded) * 60;

  // Annual earn value
  const earnValue =
    spend.groceries * card.earnRate.groceries * 0.01 +
    spend.dining    * card.earnRate.dining    * 0.01 +
    spend.travel    * card.earnRate.travel    * 0.01 +
    spend.bills     * card.earnRate.bills     * 0.01 +
    spend.other     * card.earnRate.other     * 0.01;

  // Net bonus value
  const netBonus = card.bonusValue - card.annualFee;

  // History penalty (already held this type recently)
  const historyPenalty = history.includes(card.id) ? 0.5 : 1;

  // Composite score
  const score = (netBonus * 0.5 + earnValue * 12 * 0.3 + feasibilityScore * 0.2) * historyPenalty;

  return {
    score,
    netBonus,
    earnValue: earnValue * 12,
    feasible,
    monthlySpendNeeded,
    monthsToBonus: card.spendPeriod,
  };
}

// ── Types ──────────────────────────────────────────────────────────────────
type SpendProfile = {
  groceries: number;
  dining:    number;
  travel:    number;
  bills:     number;
  other:     number;
};

type Step = "welcome" | "spend" | "history" | "results" | "timeline";

// ── Mini Card Visual ────────────────────────────────────────────────────────
function MiniCard({ card, selected, onClick }: { card: typeof ALL_CARDS[0]; selected?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      width: "100%", borderRadius: "12px", padding: "16px",
      background: `linear-gradient(135deg, ${card.bg[0]} 0%, ${card.bg[1]} 100%)`,
      border: selected ? `2px solid ${card.accent}` : "2px solid transparent",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.2s",
      boxShadow: selected ? `0 0 0 4px ${card.accent}22` : "none",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg, transparent, ${card.accent}80, transparent)` }} />
      <div style={{ fontSize:"9px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"2px" }}>{card.bank}</div>
      <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"13px", fontWeight:700, color:"#fff", marginBottom:"8px" }}>{card.name}</div>
      <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"20px", fontWeight:800, color:card.accent }}>{card.bonus.toLocaleString()}</div>
      <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.3)", marginTop:"1px" }}>bonus pts ≈ ${card.bonusValue}</div>
    </div>
  );
}

// ── Spend Slider ────────────────────────────────────────────────────────────
function SpendSlider({ label, emoji, value, onChange }: { label:string; emoji:string; value:number; onChange:(v:number)=>void }) {
  return (
    <div style={{ marginBottom:"20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
        <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", gap:"8px" }}>
          <span>{emoji}</span> {label}
        </span>
        <span style={{ fontFamily:"var(--font-bricolage)", fontSize:"16px", fontWeight:700, color:YELLOW }}>${value.toLocaleString()}</span>
      </div>
      <div style={{ position:"relative", height:"6px", background:"rgba(255,255,255,0.08)", borderRadius:"3px" }}>
        <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${(value/5000)*100}%`, background:`linear-gradient(90deg, ${YELLOW}88, ${YELLOW})`, borderRadius:"3px", transition:"width 0.1s" }} />
        <input
          type="range" min={0} max={5000} step={50} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0, cursor:"pointer", margin:0 }}
        />
      </div>
    </div>
  );
}

// ── Timeline View ────────────────────────────────────────────────────────────
function Timeline({ card, spend }: { card: typeof ALL_CARDS[0]; spend: SpendProfile }) {
  const totalMonthly = Object.values(spend).reduce((a,b)=>a+b,0);
  const today = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const events = [
    { month: 0, label: "Apply & open card", icon: "🎯", color: card.accent, detail: "Takes 5–10 business days to receive." },
    { month: 1, label: "First spend milestone", icon: "💳", color: "#4ade80", detail: `Hit $${(card.minSpend/card.spendPeriod).toLocaleString()}/mo to stay on track.` },
    { month: card.spendPeriod, label: `Harvest ${card.bonus.toLocaleString()} bonus pts`, icon: "🎁", color: YELLOW, detail: `Worth ~$${card.bonusValue} after the $${card.annualFee} annual fee.` },
    { month: card.spendPeriod + 2, label: "Redeem points", icon: "✈️", color: "#60A5FA", detail: "Transfer to airline/hotel partners for max value." },
    { month: 11, label: "Close before renewal", icon: "📅", color: "#f87171", detail: "Close 30 days before annual fee re-bills." },
    { month: 12, label: "Next card rotation", icon: "🔄", color: "rgba(255,255,255,0.5)", detail: "Start the cycle again with a fresh offer." },
  ];

  return (
    <div>
      {/* Summary banner */}
      <div style={{ background:`rgba(255,255,255,0.03)`, border:`1px solid rgba(255,255,255,0.07)`, borderRadius:"16px", padding:"20px 24px", marginBottom:"28px", display:"flex", gap:"24px", flexWrap:"wrap" }}>
        {[
          { label:"Bonus value", val:`$${card.bonusValue}`, color:YELLOW },
          { label:"Annual fee", val:`$${card.annualFee}`, color:"#f87171" },
          { label:"Net gain", val:`$${card.bonusValue-card.annualFee}`, color:"#4ade80" },
          { label:"Monthly spend needed", val:`$${Math.ceil(card.minSpend/card.spendPeriod).toLocaleString()}`, color:card.accent },
          { label:"You spend monthly", val:`$${totalMonthly.toLocaleString()}`, color:"rgba(255,255,255,0.7)" },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"3px" }}>{label}</div>
            <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"22px", fontWeight:800, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Timeline items */}
      <div style={{ position:"relative" }}>
        {/* Vertical line */}
        <div style={{ position:"absolute", left:"19px", top:"20px", bottom:"20px", width:"2px", background:"rgba(255,255,255,0.06)", borderRadius:"1px" }} />

        {events.map((ev, i) => {
          const eventDate = new Date(today.getFullYear(), today.getMonth() + ev.month, 1);
          const monthLabel = `${months[eventDate.getMonth()]} ${eventDate.getFullYear()}`;
          return (
            <div key={i} style={{ display:"flex", gap:"16px", alignItems:"flex-start", marginBottom:"20px", position:"relative" }}>
              {/* Dot */}
              <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:`${ev.color}18`, border:`2px solid ${ev.color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", flexShrink:0, zIndex:1 }}>
                {ev.icon}
              </div>
              <div style={{ flex:1, paddingTop:"6px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"3px", flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"var(--font-bricolage)", fontSize:"15px", fontWeight:700, color:"#fff" }}>{ev.label}</span>
                  <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.28)", background:"rgba(255,255,255,0.05)", borderRadius:"100px", padding:"2px 8px" }}>{monthLabel}</span>
                </div>
                <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.38)", lineHeight:1.5 }}>{ev.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Projection */}
      <div style={{ background:`linear-gradient(135deg, rgba(242,201,76,0.08), rgba(242,201,76,0.03))`, border:`1px solid rgba(242,201,76,0.18)`, borderRadius:"16px", padding:"20px 24px", marginTop:"16px" }}>
        <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"13px", fontWeight:700, color:YELLOW, marginBottom:"6px" }}>3-year projection</div>
        <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"36px", fontWeight:800, color:"#fff", lineHeight:1 }}>
          ${((card.bonusValue - card.annualFee) * 3).toLocaleString()}
        </div>
        <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)", marginTop:"6px" }}>
          Compounding across 3 annual card rotations, same strategy
        </div>
      </div>
    </div>
  );
}

// ── Main Setup Wizard ────────────────────────────────────────────────────────
export default function SetupWizard() {
  const [step, setStep]         = useState<Step>("welcome");
  const [spend, setSpend]       = useState<SpendProfile>({ groceries:800, dining:400, travel:300, bills:600, other:400 });
  const [history, setHistory]   = useState<string[]>([]);
  const [results, setResults]   = useState<Array<{ card: typeof ALL_CARDS[0]; score: ReturnType<typeof scoreCard> }>>([]);
  const [selected, setSelected] = useState<typeof ALL_CARDS[0] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior:"smooth" });

  const runScoring = () => {
    setLoading(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => { if(p >= 95){ clearInterval(interval); return 95; } return p + Math.random()*12; }), 120);
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      const scored = ALL_CARDS
        .map(card => ({ card, score: scoreCard(card, spend, history) }))
        .sort((a,b) => b.score.score - a.score.score);
      setResults(scored);
      setTimeout(() => { setLoading(false); setStep("results"); setSelected(scored[0].card); scrollTop(); }, 400);
    }, 1800);
  };

  const totalSpend = Object.values(spend).reduce((a,b)=>a+b,0);

  const stepMap: Record<Step, number> = { welcome:0, spend:1, history:2, results:3, timeline:4 };
  const currentStepNum = stepMap[step];

  return (
    <div className={`${bricolage.variable} ${dmSans.variable}`} style={{ fontFamily:"var(--font-dm)", background:NAVY, color:"#fff", minHeight:"100vh" }}>
      <div ref={topRef} />

      {/* Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100, padding:"0 24px", height:"60px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(13,27,42,0.96)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <a href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:"10px" }}>
          <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height:"22px", filter:"brightness(0) invert(1)", opacity:0.85 }} />
        </a>
        {/* Step progress pills */}
        {step !== "welcome" && (
          <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
            {(["Spend","History","Results","Timeline"] as const).map((label, i) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                <div style={{
                  borderRadius:"100px", padding:"4px 12px", fontSize:"11px", fontWeight:600,
                  background: i+1 <= currentStepNum ? YELLOW : "rgba(255,255,255,0.07)",
                  color:      i+1 <= currentStepNum ? NAVY   : "rgba(255,255,255,0.3)",
                  transition: "all 0.3s",
                }}>{label}</div>
                {i < 3 && <div style={{ width:"16px", height:"1px", background:"rgba(255,255,255,0.12)" }} />}
              </div>
            ))}
          </div>
        )}
        <div style={{ width:"80px" }} />
      </nav>

      <div style={{ maxWidth:"720px", margin:"0 auto", padding:"40px 24px 80px" }}>

        {/* ── WELCOME ── */}
        {step === "welcome" && (
          <div style={{ textAlign:"center", paddingTop:"32px" }}>
            <div style={{ fontSize:"48px", marginBottom:"20px" }}>💳</div>
            <h1 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(36px,8vw,56px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:0.93, color:"#fff", marginBottom:"20px" }}>
              Find your<br /><span style={{ color:YELLOW }}>perfect next card.</span>
            </h1>
            <p style={{ fontSize:"16px", color:"rgba(255,255,255,0.45)", lineHeight:1.75, maxWidth:"460px", margin:"0 auto 40px" }}>
              Answer 2 quick questions and we'll match you to the best AU credit card for your spending — with a personalised bonus timeline.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", maxWidth:"420px", margin:"0 auto 44px" }}>
              {[["2 min","to complete"],["$0","no cost, ever"],["No","credit check"]] .map(([val,label]) => (
                <div key={label} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"12px", padding:"14px" }}>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"22px", fontWeight:800, color:YELLOW }}>{val}</div>
                  <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", marginTop:"3px" }}>{label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { setStep("spend"); scrollTop(); }}
              style={{ background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"17px 52px", fontFamily:"var(--font-dm)", fontSize:"17px", fontWeight:700, cursor:"pointer", transition:"all 0.25s" }}
              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 16px 48px rgba(242,201,76,0.32)`; }}
              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform=""; (e.currentTarget as HTMLElement).style.boxShadow=""; }}>
              Get started
            </button>
          </div>
        )}

        {/* ── SPEND ── */}
        {step === "spend" && (
          <div>
            <div style={{ marginBottom:"32px" }}>
              <p style={{ fontSize:"10px", fontWeight:700, color:YELLOW, letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:"10px" }}>Step 1 of 2</p>
              <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(30px,6vw,44px)", fontWeight:800, letterSpacing:"-0.036em", lineHeight:0.95, color:"#fff", marginBottom:"10px" }}>
                Monthly spending
              </h2>
              <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)" }}>Drag each slider to match your typical monthly spend.</p>
            </div>

            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"20px", padding:"28px" }}>
              <SpendSlider label="Groceries & supermarket" emoji="🛒" value={spend.groceries} onChange={v=>setSpend(s=>({...s,groceries:v}))} />
              <SpendSlider label="Dining & takeaway"       emoji="🍽️" value={spend.dining}    onChange={v=>setSpend(s=>({...s,dining:v}))} />
              <SpendSlider label="Travel & transport"      emoji="✈️" value={spend.travel}    onChange={v=>setSpend(s=>({...s,travel:v}))} />
              <SpendSlider label="Bills & utilities"       emoji="💡" value={spend.bills}     onChange={v=>setSpend(s=>({...s,bills:v}))} />
              <SpendSlider label="Other spending"          emoji="🏷️" value={spend.other}     onChange={v=>setSpend(s=>({...s,other:v}))} />
            </div>

            {/* Running total */}
            <div style={{ marginTop:"20px", background:"rgba(242,201,76,0.07)", border:"1px solid rgba(242,201,76,0.16)", borderRadius:"14px", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.5)" }}>Total monthly spend</span>
              <span style={{ fontFamily:"var(--font-bricolage)", fontSize:"26px", fontWeight:800, color:YELLOW }}>${totalSpend.toLocaleString()}</span>
            </div>

            <div style={{ display:"flex", gap:"12px", marginTop:"28px" }}>
              <button onClick={() => { setStep("welcome"); scrollTop(); }}
                style={{ flex:"0 0 auto", background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:"100px", padding:"14px 24px", fontFamily:"var(--font-dm)", fontSize:"14px", fontWeight:600, cursor:"pointer" }}>
                Back
              </button>
              <button onClick={() => { setStep("history"); scrollTop(); }}
                style={{ flex:1, background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"14px 32px", fontFamily:"var(--font-dm)", fontSize:"15px", fontWeight:700, cursor:"pointer", transition:"all 0.22s" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.boxShadow=`0 12px 40px rgba(242,201,76,0.3)`; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.boxShadow=""; }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {step === "history" && (
          <div>
            <div style={{ marginBottom:"32px" }}>
              <p style={{ fontSize:"10px", fontWeight:700, color:YELLOW, letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:"10px" }}>Step 2 of 2</p>
              <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(30px,6vw,44px)", fontWeight:800, letterSpacing:"-0.036em", lineHeight:0.95, color:"#fff", marginBottom:"10px" }}>
                Card history
              </h2>
              <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)" }}>
                Select any cards you've held in the last 18 months. We'll deprioritise them — most banks won't give you the bonus again.
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"28px" }}>
              {ALL_CARDS.map(card => (
                <div key={card.id} onClick={() => setHistory(h => h.includes(card.id) ? h.filter(x=>x!==card.id) : [...h,card.id])}
                  style={{ cursor:"pointer", borderRadius:"12px", overflow:"hidden" }}>
                  <MiniCard card={card} selected={history.includes(card.id)} />
                </div>
              ))}
            </div>

            {history.length > 0 && (
              <div style={{ marginBottom:"20px", fontSize:"13px", color:"rgba(255,255,255,0.35)", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"10px", padding:"10px 14px" }}>
                {history.length} card{history.length>1?"s":""} excluded from your top recommendations.
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px", padding:"28px 24px", marginBottom:"20px" }}>
                <div style={{ fontSize:"13px", fontWeight:600, color:"rgba(255,255,255,0.6)", marginBottom:"12px" }}>
                  Matching against {ALL_CARDS.length} live AU cards…
                </div>
                <div style={{ height:"6px", background:"rgba(255,255,255,0.06)", borderRadius:"3px", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg, ${YELLOW}88, ${YELLOW})`, borderRadius:"3px", transition:"width 0.1s" }} />
                </div>
                <div style={{ marginTop:"10px", fontSize:"11px", color:"rgba(255,255,255,0.2)" }}>
                  Analysing spend patterns · Calculating net bonus values · Ranking by ROI
                </div>
              </div>
            )}

            <div style={{ display:"flex", gap:"12px" }}>
              <button onClick={() => { setStep("spend"); scrollTop(); }}
                style={{ flex:"0 0 auto", background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:"100px", padding:"14px 24px", fontFamily:"var(--font-dm)", fontSize:"14px", fontWeight:600, cursor:"pointer" }}>
                Back
              </button>
              <button onClick={runScoring} disabled={loading}
                style={{ flex:1, background:loading?"rgba(242,201,76,0.4)":YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"14px 32px", fontFamily:"var(--font-dm)", fontSize:"15px", fontWeight:700, cursor:loading?"wait":"pointer", transition:"all 0.22s" }}>
                {loading ? "Analysing…" : "Find my best card"}
              </button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {step === "results" && (
          <div>
            <div style={{ marginBottom:"32px" }}>
              <p style={{ fontSize:"10px", fontWeight:700, color:"#4ade80", letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:"10px" }}>Your results</p>
              <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(30px,6vw,44px)", fontWeight:800, letterSpacing:"-0.036em", lineHeight:0.95, color:"#fff", marginBottom:"10px" }}>
                We found your match.
              </h2>
              <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)" }}>
                Based on ${totalSpend.toLocaleString()}/month. Tap a card to see details.
              </p>
            </div>

            {/* Top pick */}
            {results[0] && (
              <div style={{ marginBottom:"28px" }}>
                <div style={{ fontSize:"11px", fontWeight:700, color:YELLOW, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"14px", display:"flex", alignItems:"center", gap:"8px" }}>
                  <span>⭐</span> Top recommendation
                </div>
                <div onClick={() => setSelected(results[0].card)} style={{
                  borderRadius:"18px", overflow:"hidden", cursor:"pointer",
                  background:`linear-gradient(135deg, ${results[0].card.bg[0]}, ${results[0].card.bg[1]})`,
                  border:`2px solid ${selected?.id===results[0].card.id ? results[0].card.accent : "transparent"}`,
                  padding:"24px", transition:"all 0.25s",
                  boxShadow: selected?.id===results[0].card.id ? `0 0 0 4px ${results[0].card.accent}22` : "none",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"12px" }}>
                    <div>
                      <div style={{ display:"inline-block", background:`${results[0].card.accent}22`, border:`1px solid ${results[0].card.accent}44`, borderRadius:"100px", padding:"3px 10px", fontSize:"10px", fontWeight:700, color:results[0].card.accent, marginBottom:"8px", letterSpacing:"0.08em" }}>
                        {results[0].card.tag}
                      </div>
                      <div style={{ fontSize:"11px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"2px" }}>{results[0].card.bank}</div>
                      <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"22px", fontWeight:800, color:"#fff" }}>{results[0].card.name}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"36px", fontWeight:800, color:results[0].card.accent, lineHeight:1 }}>{results[0].card.bonus.toLocaleString()}</div>
                      <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", marginTop:"2px" }}>bonus points</div>
                    </div>
                  </div>
                  <div style={{ marginTop:"20px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px" }}>
                    {[
                      { label:"Bonus value",  val:`$${results[0].card.bonusValue}`,  col:"#4ade80" },
                      { label:"Annual fee",   val:`$${results[0].card.annualFee}`,   col:"#f87171" },
                      { label:"Net gain",     val:`$${results[0].score.netBonus}`,   col:YELLOW },
                    ].map(({ label, val, col }) => (
                      <div key={label} style={{ background:"rgba(0,0,0,0.25)", borderRadius:"10px", padding:"12px" }}>
                        <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"3px" }}>{label}</div>
                        <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"20px", fontWeight:800, color:col }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:"16px", fontSize:"13px", color:"rgba(255,255,255,0.35)" }}>
                    Min. spend <strong style={{ color:"rgba(255,255,255,0.6)" }}>${results[0].card.minSpend.toLocaleString()}</strong> over <strong style={{ color:"rgba(255,255,255,0.6)" }}>{results[0].card.spendPeriod} months</strong> · {results[0].score.feasible ? <span style={{ color:"#4ade80" }}>✓ Within your budget</span> : <span style={{ color:"#f87171" }}>⚠ Tight — spend more to qualify</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Other options */}
            <div style={{ marginBottom:"28px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, color:"rgba(255,255,255,0.28)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"14px" }}>Other strong options</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                {results.slice(1,5).map(({ card, score }) => (
                  <div key={card.id} onClick={() => setSelected(card)} style={{ cursor:"pointer" }}>
                    <MiniCard card={card} selected={selected?.id===card.id} />
                    <div style={{ padding:"8px 4px 0", fontSize:"11px", color:"rgba(255,255,255,0.32)" }}>
                      Net: <strong style={{ color:"#4ade80" }}>${score.netBonus}</strong> · {score.feasible ? "✓ achievable" : "⚠ tight spend"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", gap:"12px" }}>
              <button onClick={() => { setStep("history"); scrollTop(); }}
                style={{ flex:"0 0 auto", background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:"100px", padding:"14px 24px", fontFamily:"var(--font-dm)", fontSize:"14px", fontWeight:600, cursor:"pointer" }}>
                Adjust
              </button>
              <button onClick={() => { setStep("timeline"); scrollTop(); }}
                style={{ flex:1, background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"14px 32px", fontFamily:"var(--font-dm)", fontSize:"15px", fontWeight:700, cursor:"pointer", transition:"all 0.22s" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.boxShadow=`0 12px 40px rgba(242,201,76,0.3)`; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.boxShadow=""; }}>
                See my timeline
              </button>
            </div>
          </div>
        )}

        {/* ── TIMELINE ── */}
        {step === "timeline" && selected && (
          <div>
            <div style={{ marginBottom:"32px" }}>
              <p style={{ fontSize:"10px", fontWeight:700, color:YELLOW, letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:"10px" }}>Your playbook</p>
              <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(28px,5vw,40px)", fontWeight:800, letterSpacing:"-0.036em", lineHeight:0.95, color:"#fff", marginBottom:"8px" }}>
                {selected.bank} {selected.name}
              </h2>
              <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)" }}>
                Your 12-month points harvest plan. Save this and follow each step.
              </p>
            </div>

            <Timeline card={selected} spend={spend} />

            {/* Switch card selector */}
            <div style={{ marginTop:"32px", paddingTop:"24px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)", marginBottom:"14px" }}>Compare timeline for a different card:</div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                {results.map(({ card }) => (
                  <button key={card.id} onClick={() => setSelected(card)}
                    style={{ background:selected.id===card.id ? `${card.accent}22` : "rgba(255,255,255,0.04)", border:`1px solid ${selected.id===card.id ? card.accent+"55" : "rgba(255,255,255,0.07)"}`, borderRadius:"100px", padding:"7px 14px", fontSize:"12px", fontWeight:600, color:selected.id===card.id ? card.accent : "rgba(255,255,255,0.4)", cursor:"pointer", transition:"all 0.2s" }}>
                    {card.bank}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", gap:"12px", marginTop:"32px" }}>
              <button onClick={() => { setStep("results"); scrollTop(); }}
                style={{ flex:"0 0 auto", background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:"100px", padding:"14px 24px", fontFamily:"var(--font-dm)", fontSize:"14px", fontWeight:600, cursor:"pointer" }}>
                Back
              </button>
              <a href="https://openloans.com.au" style={{ flex:1, textDecoration:"none" }}>
                <button style={{ width:"100%", background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"14px 32px", fontFamily:"var(--font-dm)", fontSize:"15px", fontWeight:700, cursor:"pointer", transition:"all 0.22s" }}>
                  Talk to Open about this card
                </button>
              </a>
            </div>

            {/* Disclaimer */}
            <p style={{ marginTop:"24px", fontSize:"11px", color:"rgba(255,255,255,0.18)", lineHeight:1.7, textAlign:"center" }}>
              General information only. Not financial advice. Card offers and bonus thresholds are subject to change — always verify directly with the issuer. Always read the PDS before applying.
            </p>
          </div>
        )}

      </div>

      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
        body { background:#0D1B2A; -webkit-font-smoothing:antialiased }
        input[type=range] { -webkit-appearance:none; appearance:none }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:${YELLOW}; cursor:pointer }
      `}</style>
    </div>
  );
}