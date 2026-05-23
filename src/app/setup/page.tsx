"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-bricolage" });
const dmMono    = DM_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono" });
const dmSans    = DM_Sans({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-dm" });

const NAVY   = "#0D1B2A";
const YELLOW = "#F2C94C";
const CREAM  = "#F5F0E8";

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
  },
];

type SpendProfile = { groceries:number; dining:number; travel:number; bills:number; other:number };
type Phase = "boot" | "spend" | "history" | "analysing" | "results" | "timeline";

function scoreCard(card: typeof ALL_CARDS[0], spend: SpendProfile, history: string[]) {
  const totalSpend = Object.values(spend).reduce((a,b) => a+b, 0);
  const monthlyNeeded = card.minSpend / card.spendPeriod;
  const feasible = totalSpend >= monthlyNeeded;
  const feasibilityScore = feasible ? 100 : (totalSpend / monthlyNeeded) * 60;
  const earnValue = (spend.groceries*card.earnRate.groceries + spend.dining*card.earnRate.dining + spend.travel*card.earnRate.travel + spend.bills*card.earnRate.bills + spend.other*card.earnRate.other) * 0.01;
  const netBonus = card.bonusValue - card.annualFee;
  const historyPenalty = history.includes(card.id) ? 0.5 : 1;
  const score = (netBonus*0.5 + earnValue*12*0.3 + feasibilityScore*0.2) * historyPenalty;
  return { score, netBonus, earnValue: earnValue*12, feasible, monthlyNeeded };
}

// ── Typewriter ─────────────────────────────────────────────────────────────
function Typewriter({ text, speed=28, onDone }: { text:string; speed?:number; onDone?:()=>void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0,i));
      if (i >= text.length) { clearInterval(id); setDone(true); onDone?.(); }
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return <span>{displayed}{!done && <span style={{ opacity: Math.random() > 0.5 ? 1 : 0, transition:"opacity 0.1s" }}>▋</span>}</span>;
}

// ── Spend Bubble Grid ──────────────────────────────────────────────────────
const CATEGORIES = [
  { key:"groceries" as const, label:"Groceries", emoji:"🛒", color:"#4ade80", max:5000 },
  { key:"dining"    as const, label:"Dining",    emoji:"🍽️", color:"#f97316", max:3000 },
  { key:"travel"    as const, label:"Travel",    emoji:"✈️", color:"#60a5fa", max:5000 },
  { key:"bills"     as const, label:"Bills",     emoji:"💡", color:"#a78bfa", max:4000 },
  { key:"other"     as const, label:"Other",     emoji:"🏷️", color:"#f472b6", max:3000 },
];

function SpendOrb({ cat, value, onChange }: { cat: typeof CATEGORIES[0]; value:number; onChange:(v:number)=>void }) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const pct = value / cat.max;
  const size = 80 + pct * 100; // 80–180px

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = (startY.current - e.clientY) * (cat.max / 300);
      onChange(Math.max(0, Math.min(cat.max, Math.round((startVal.current + delta) / 50) * 50)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [cat.max, onChange]);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"10px", userSelect:"none" }}>
      <div
        onMouseDown={onMouseDown}
        style={{
          width: `${size}px`, height: `${size}px`,
          borderRadius:"50%",
          background:`radial-gradient(circle at 35% 35%, ${cat.color}55, ${cat.color}18)`,
          border:`2px solid ${cat.color}${pct > 0.1 ? "88" : "33"}`,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          cursor:"ns-resize",
          transition:"width 0.15s ease, height 0.15s ease, border-color 0.15s",
          boxShadow: pct > 0.05 ? `0 0 ${size*0.4}px ${cat.color}22` : "none",
          position:"relative",
        }}
      >
        <div style={{ fontSize: size > 120 ? "22px" : "16px", transition:"font-size 0.15s" }}>{cat.emoji}</div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"11px", fontWeight:500, color:cat.color, marginTop:"2px" }}>
          ${value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
        </div>
      </div>
      <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.06em", textAlign:"center" }}>{cat.label}</div>
      {/* Touch slider fallback */}
      <input
        type="range" min={0} max={cat.max} step={50} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:`${Math.max(size, 80)}px`, opacity:0.001, position:"absolute", height:"1px" }}
      />
    </div>
  );
}

// ── Animated score bar ─────────────────────────────────────────────────────
function ScoreBar({ pct, color }: { pct:number; color:string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 100); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height:"3px", background:"rgba(255,255,255,0.07)", borderRadius:"2px", overflow:"hidden", flex:1 }}>
      <div style={{ height:"100%", width:`${width}%`, background:color, borderRadius:"2px", transition:"width 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
    </div>
  );
}

// ── Mini credit card ────────────────────────────────────────────────────────
function CardChip({ card, selected, onClick }: { card:typeof ALL_CARDS[0]; selected:boolean; onClick:()=>void }) {
  return (
    <div onClick={onClick} style={{
      borderRadius:"14px", padding:"16px 18px",
      background:`linear-gradient(135deg, ${card.bg[0]}, ${card.bg[1]})`,
      border:`1.5px solid ${selected ? card.accent : "rgba(255,255,255,0.07)"}`,
      cursor:"pointer", transition:"all 0.22s",
      boxShadow: selected ? `0 0 0 3px ${card.accent}22, 0 8px 32px rgba(0,0,0,0.4)` : "0 2px 12px rgba(0,0,0,0.3)",
      transform: selected ? "translateY(-2px)" : "none",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"1.5px", background:`linear-gradient(90deg, transparent, ${card.accent}88, transparent)` }} />
      <div style={{ fontSize:"9px", fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"2px" }}>{card.bank}</div>
      <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"12px", fontWeight:700, color:"#fff", marginBottom:"10px", lineHeight:1.3 }}>{card.name}</div>
      <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"18px", fontWeight:800, color:card.accent }}>{(card.bonus/1000).toFixed(0)}K</div>
      <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.28)" }}>pts ≈ ${card.bonusValue}</div>
      {selected && <div style={{ position:"absolute", top:"10px", right:"10px", width:"8px", height:"8px", borderRadius:"50%", background:card.accent, boxShadow:`0 0 8px ${card.accent}` }} />}
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────
function Timeline({ card, spend }: { card:typeof ALL_CARDS[0]; spend:SpendProfile }) {
  const totalMonthly = Object.values(spend).reduce((a,b)=>a+b,0);
  const today = new Date();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const events = [
    { m:0, label:"Apply & activate", detail:`Takes 5–10 business days.`, icon:"🎯", color:card.accent },
    { m:1, label:"First spend check", detail:`Stay above $${Math.ceil(card.minSpend/card.spendPeriod/100)*100}/mo.`, icon:"💳", color:"#4ade80" },
    { m:card.spendPeriod, label:`Bonus lands: ${card.bonus.toLocaleString()} pts`, detail:`Worth ~$${card.bonusValue}. Transfer to airline partners.`, icon:"🎁", color:YELLOW },
    { m:card.spendPeriod+1, label:"Redeem for max value", detail:"Airline/hotel transfer beats cashback.", icon:"✈️", color:"#60a5fa" },
    { m:11, label:"Close before renewal", detail:"Close 30 days before annual fee re-bills.", icon:"📅", color:"#f87171" },
    { m:12, label:"Next rotation starts", detail:"Repeat with a fresh offer. Compounding gains.", icon:"🔄", color:"rgba(255,255,255,0.4)" },
  ];

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"10px", marginBottom:"28px" }}>
        {[
          { l:"Bonus value",   v:`$${card.bonusValue}`,             c:"#4ade80" },
          { l:"Annual fee",    v:`$${card.annualFee}`,              c:"#f87171" },
          { l:"Net first year",v:`$${card.bonusValue-card.annualFee}`, c:YELLOW },
          { l:"3-year return", v:`$${(card.bonusValue-card.annualFee)*3}`, c:card.accent },
        ].map(({l,v,c}) => (
          <div key={l} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"12px", padding:"14px 16px" }}>
            <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>{l}</div>
            <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"26px", fontWeight:800, color:c, lineHeight:1 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ position:"relative" }}>
        <div style={{ position:"absolute", left:"18px", top:"24px", bottom:"24px", width:"1px", background:"linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.03))" }} />
        {events.map((ev,i) => {
          const d = new Date(today.getFullYear(), today.getMonth()+ev.m, 1);
          return (
            <div key={i} style={{ display:"flex", gap:"16px", marginBottom:"18px", position:"relative" }}>
              <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:`${ev.color}14`, border:`1.5px solid ${ev.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0, zIndex:1 }}>{ev.icon}</div>
              <div style={{ flex:1, paddingTop:"4px" }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:"8px", flexWrap:"wrap", marginBottom:"2px" }}>
                  <span style={{ fontFamily:"var(--font-bricolage)", fontSize:"14px", fontWeight:700, color:"#fff" }}>{ev.label}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.22)" }}>{MONTHS[d.getMonth()]} {d.getFullYear()}</span>
                </div>
                <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)", lineHeight:1.5 }}>{ev.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function SetupWizard() {
  const [phase, setPhase]       = useState<Phase>("boot");
  const [bootDone, setBootDone] = useState(false);
  const [spend, setSpend]       = useState<SpendProfile>({ groceries:800, dining:400, travel:300, bills:600, other:400 });
  const [history, setHistory]   = useState<string[]>([]);
  const [results, setResults]   = useState<Array<{card:typeof ALL_CARDS[0];score:ReturnType<typeof scoreCard>}>>([]);
  const [selected, setSelected] = useState<typeof ALL_CARDS[0]|null>(null);
  const [analyseProgress, setAnalyseProgress] = useState(0);
  const [analyseLabel, setAnalyseLabel] = useState("Initialising...");
  const [hoveredResult, setHoveredResult] = useState<string|null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const scrollTop = () => topRef.current?.scrollIntoView({ behavior:"smooth" });

  const totalSpend = Object.values(spend).reduce((a,b)=>a+b,0);
  const maxScore = results[0]?.score.score ?? 1;

  const runAnalysis = () => {
    setPhase("analysing");
    setAnalyseProgress(0);
    scrollTop();
    const labels = [
      "Parsing spend profile...",
      "Cross-referencing 6 live AU offers...",
      "Calculating net bonus values...",
      "Applying earn rate multipliers...",
      "Ranking by 12-month ROI...",
      "Finalising recommendations...",
    ];
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setAnalyseProgress(Math.min(step * 17, 95));
      setAnalyseLabel(labels[Math.min(step-1, labels.length-1)]);
      if (step >= 6) {
        clearInterval(interval);
        setTimeout(() => {
          setAnalyseProgress(100);
          const scored = ALL_CARDS
            .map(card => ({ card, score: scoreCard(card, spend, history) }))
            .sort((a,b) => b.score.score - a.score.score);
          setResults(scored);
          setSelected(scored[0].card);
          setTimeout(() => { setPhase("results"); scrollTop(); }, 400);
        }, 600);
      }
    }, 280);
  };

  const updateSpend = useCallback((key: keyof SpendProfile, v: number) => {
    setSpend(s => ({ ...s, [key]: v }));
  }, []);

  // ── Boot sequence ──────────────────────────────────────────────────────
  if (phase === "boot") {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
        style={{ fontFamily:"var(--font-mono)", background:NAVY, color:"#fff", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <div ref={topRef} />
        <Nav />
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", maxWidth:"640px", margin:"0 auto", width:"100%" }}>

          {/* System header */}
          <div style={{ width:"100%", marginBottom:"48px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"28px" }}>
              <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 10px #4ade80", animation:"pulse 2s infinite" }} />
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"11px", color:"rgba(255,255,255,0.3)", letterSpacing:"0.12em" }}>POINTS HACKER // SYSTEM v2.4.1</span>
            </div>

            <div style={{ fontFamily:"var(--font-mono)", fontSize:"13px", color:"rgba(255,255,255,0.25)", lineHeight:2, marginBottom:"32px" }}>
              {[
                "> loading card database.............. OK",
                "> connecting to AU bonus feeds....... OK",
                "> scoring engine ready............... OK",
              ].map((line,i) => (
                <div key={i} style={{ animation:`fadeIn 0.4s ${i*0.3}s both` }}>{line}</div>
              ))}
            </div>

            <h1 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(42px,9vw,72px)", fontWeight:800, letterSpacing:"-0.05em", lineHeight:0.88, color:"#fff", marginBottom:"20px" }}>
              What's your<br /><span style={{ color:YELLOW }}>spending<br />profile?</span>
            </h1>
            <p style={{ fontFamily:"var(--font-dm)", fontSize:"16px", color:"rgba(255,255,255,0.4)", lineHeight:1.7, marginBottom:"36px" }}>
              Two questions. We'll match you to the best AU card bonus available right now — and build your personalised 12-month harvest timeline.
            </p>

            <div style={{ display:"flex", gap:"28px", marginBottom:"44px", flexWrap:"wrap" }}>
              {[["$612", "avg AU bonus missed/yr"], ["6", "live AU offers tracked"], ["2 min", "to your result"]].map(([v,l]) => (
                <div key={l}>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"28px", fontWeight:800, color:YELLOW, lineHeight:1 }}>{v}</div>
                  <div style={{ fontFamily:"var(--font-dm)", fontSize:"11px", color:"rgba(255,255,255,0.28)", marginTop:"3px" }}>{l}</div>
                </div>
              ))}
            </div>

            <button onClick={() => { setPhase("spend"); scrollTop(); }}
              style={{ background:YELLOW, color:NAVY, border:"none", borderRadius:"4px", padding:"16px 44px", fontFamily:"var(--font-bricolage)", fontSize:"16px", fontWeight:800, cursor:"pointer", letterSpacing:"-0.02em", transition:"all 0.2s", position:"relative" }}
              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 16px 48px rgba(242,201,76,0.35)`; }}
              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform=""; (e.currentTarget as HTMLElement).style.boxShadow=""; }}>
              INITIALISE PROFILE ›
            </button>
          </div>
        </div>

        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // ── Spend phase ────────────────────────────────────────────────────────
  if (phase === "spend") {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
        style={{ fontFamily:"var(--font-dm)", background:NAVY, color:"#fff", minHeight:"100vh" }}>
        <div ref={topRef} />
        <Nav />
        <StepBar current={1} />

        <div style={{ maxWidth:"760px", margin:"0 auto", padding:"48px 24px 80px" }}>
          <div style={{ marginBottom:"40px" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.25)", letterSpacing:"0.14em", marginBottom:"10px" }}>01 / SPEND PROFILE</div>
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(34px,6vw,52px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:0.93, color:"#fff", marginBottom:"12px" }}>
              Drag each orb<br /><span style={{ color:"rgba(255,255,255,0.28)" }}>to set your monthly spend.</span>
            </h2>
            <p style={{ fontFamily:"var(--font-dm)", fontSize:"14px", color:"rgba(255,255,255,0.35)" }}>Drag up to increase, down to decrease. Or use the hidden slider beneath each one.</p>
          </div>

          {/* Orb stage */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"24px", padding:"40px 24px 32px", marginBottom:"24px", position:"relative", overflow:"hidden" }}>
            {/* grid background */}
            <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize:"40px 40px", borderRadius:"24px" }} />
            <div style={{ position:"relative", zIndex:1, display:"flex", justifyContent:"center", alignItems:"flex-end", gap:"clamp(16px,4vw,40px)", flexWrap:"wrap", minHeight:"200px" }}>
              {CATEGORIES.map(cat => (
                <SpendOrb key={cat.key} cat={cat} value={spend[cat.key]} onChange={v => updateSpend(cat.key, v)} />
              ))}
            </div>
          </div>

          {/* Running total */}
          <div style={{ background:"rgba(242,201,76,0.06)", border:"1px solid rgba(242,201,76,0.14)", borderRadius:"12px", padding:"16px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"32px" }}>
            <div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:"2px" }}>TOTAL MONTHLY</div>
              <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"32px", fontWeight:800, color:YELLOW, lineHeight:1 }}>${totalSpend.toLocaleString()}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              {CATEGORIES.map(cat => (
                <div key={cat.key} style={{ fontFamily:"var(--font-mono)", fontSize:"11px", color:"rgba(255,255,255,0.22)", marginBottom:"2px" }}>
                  <span style={{ color:cat.color }}>■</span> {cat.label}: ${spend[cat.key].toLocaleString()}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:"12px" }}>
            <button onClick={() => { setPhase("boot"); scrollTop(); }} style={backBtnStyle}>← Back</button>
            <button onClick={() => { setPhase("history"); scrollTop(); }} style={primaryBtnStyle}>
              Continue →
            </button>
          </div>
        </div>
        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // ── History phase ──────────────────────────────────────────────────────
  if (phase === "history") {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
        style={{ fontFamily:"var(--font-dm)", background:NAVY, color:"#fff", minHeight:"100vh" }}>
        <div ref={topRef} />
        <Nav />
        <StepBar current={2} />

        <div style={{ maxWidth:"760px", margin:"0 auto", padding:"48px 24px 80px" }}>
          <div style={{ marginBottom:"40px" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.25)", letterSpacing:"0.14em", marginBottom:"10px" }}>02 / CARD HISTORY</div>
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(34px,6vw,52px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:0.93, color:"#fff", marginBottom:"12px" }}>
              Held any of these<br /><span style={{ color:"rgba(255,255,255,0.28)" }}>in the last 18 months?</span>
            </h2>
            <p style={{ fontFamily:"var(--font-dm)", fontSize:"14px", color:"rgba(255,255,255,0.35)" }}>
              Most banks won't give you the sign-up bonus again. Select all that apply — we'll deprioritise them.
            </p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"10px", marginBottom:"24px" }}>
            {ALL_CARDS.map(card => (
              <CardChip key={card.id} card={card}
                selected={history.includes(card.id)}
                onClick={() => setHistory(h => h.includes(card.id) ? h.filter(x=>x!==card.id) : [...h, card.id])}
              />
            ))}
          </div>

          {/* None button */}
          <div style={{ marginBottom:"32px" }}>
            <button onClick={() => setHistory([])}
              style={{ background:history.length===0?"rgba(255,255,255,0.08)":"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", padding:"10px 20px", fontFamily:"var(--font-dm)", fontSize:"13px", color:"rgba(255,255,255,0.5)", cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{ width:"16px", height:"16px", borderRadius:"4px", border:`1.5px solid ${history.length===0 ? YELLOW : "rgba(255,255,255,0.25)"}`, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {history.length===0 && <span style={{ fontSize:"10px", color:YELLOW }}>✓</span>}
              </span>
              None of these — I'm a clean slate
            </button>
            {history.length > 0 && (
              <div style={{ marginTop:"10px", fontFamily:"var(--font-mono)", fontSize:"11px", color:"rgba(255,255,255,0.25)" }}>
                {history.length} card{history.length>1?"s":""} flagged → will be deprioritised in results
              </div>
            )}
          </div>

          <div style={{ display:"flex", gap:"12px" }}>
            <button onClick={() => { setPhase("spend"); scrollTop(); }} style={backBtnStyle}>← Back</button>
            <button onClick={runAnalysis} style={primaryBtnStyle}>Run analysis →</button>
          </div>
        </div>
        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // ── Analysing ──────────────────────────────────────────────────────────
  if (phase === "analysing") {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
        style={{ fontFamily:"var(--font-mono)", background:NAVY, color:"#fff", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
        <div ref={topRef} />

        <div style={{ width:"100%", maxWidth:"520px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"32px" }}>
            <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:YELLOW, animation:"pulse 0.8s infinite" }} />
            <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em" }}>SCORING ENGINE ACTIVE</span>
          </div>

          <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(32px,7vw,56px)", fontWeight:800, letterSpacing:"-0.04em", color:"#fff", lineHeight:0.95, marginBottom:"36px" }}>
            Crunching<br /><span style={{ color:YELLOW }}>your numbers.</span>
          </div>

          {/* Progress bar */}
          <div style={{ height:"2px", background:"rgba(255,255,255,0.07)", borderRadius:"1px", marginBottom:"16px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${analyseProgress}%`, background:YELLOW, borderRadius:"1px", transition:"width 0.25s ease", boxShadow:`0 0 12px ${YELLOW}88` }} />
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"32px" }}>
            <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.35)" }}>{analyseLabel}</span>
            <span style={{ fontSize:"11px", color:YELLOW, fontWeight:500 }}>{Math.round(analyseProgress)}%</span>
          </div>

          {/* Live log */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"8px", padding:"16px", fontFamily:"var(--font-mono)", fontSize:"11px", color:"rgba(255,255,255,0.2)", lineHeight:2 }}>
            {ALL_CARDS.slice(0, Math.ceil(analyseProgress / 17)).map(card => (
              <div key={card.id}>
                &gt; {card.bank} {card.name}... scored{" "}
                <span style={{ color:"#4ade80" }}>✓</span>
              </div>
            ))}
            {analyseProgress < 100 && <div style={{ color:"rgba(255,255,255,0.4)" }}>&gt; ▋</div>}
          </div>
        </div>

        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────
  if (phase === "results") {
    const top = results[0];
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
        style={{ fontFamily:"var(--font-dm)", background:NAVY, color:"#fff", minHeight:"100vh" }}>
        <div ref={topRef} />
        <Nav />
        <StepBar current={3} />

        <div style={{ maxWidth:"800px", margin:"0 auto", padding:"48px 24px 80px" }}>
          <div style={{ marginBottom:"36px" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"#4ade80", letterSpacing:"0.14em", marginBottom:"10px" }}>// ANALYSIS COMPLETE</div>
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(34px,6vw,56px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:0.9, color:"#fff", marginBottom:"12px" }}>
              Your top match.
            </h2>
            <p style={{ fontFamily:"var(--font-dm)", fontSize:"14px", color:"rgba(255,255,255,0.4)" }}>Based on ${totalSpend.toLocaleString()}/mo. Ranked by net 12-month ROI.</p>
          </div>

          {/* Hero result card */}
          {top && (
            <div style={{
              borderRadius:"20px", overflow:"hidden", marginBottom:"24px",
              background:`linear-gradient(135deg, ${top.card.bg[0]}, ${top.card.bg[1]})`,
              border:`1.5px solid ${top.card.accent}55`,
              boxShadow:`0 0 0 1px ${top.card.accent}22, 0 24px 80px rgba(0,0,0,0.6)`,
              position:"relative",
            }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg, transparent, ${top.card.accent}, transparent)` }} />
              <div style={{ padding:"28px 28px 24px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"16px", marginBottom:"24px" }}>
                  <div>
                    <div style={{ display:"inline-block", background:`${top.card.accent}20`, border:`1px solid ${top.card.accent}44`, borderRadius:"4px", padding:"3px 10px", fontFamily:"var(--font-mono)", fontSize:"9px", fontWeight:500, color:top.card.accent, marginBottom:"10px", letterSpacing:"0.1em" }}>
                      ★ {top.card.tag.toUpperCase()}
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.35)", letterSpacing:"0.12em", marginBottom:"3px" }}>{top.card.bank.toUpperCase()}</div>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"26px", fontWeight:800, color:"#fff" }}>{top.card.name}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"52px", fontWeight:800, color:top.card.accent, lineHeight:0.85, letterSpacing:"-0.04em" }}>
                      {(top.card.bonus/1000).toFixed(0)}K
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.28)", marginTop:"4px" }}>BONUS POINTS</div>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"20px" }}>
                  {[
                    { l:"Bonus value",  v:`$${top.card.bonusValue}`,  c:"#4ade80" },
                    { l:"Annual fee",   v:`$${top.card.annualFee}`,   c:"#f87171" },
                    { l:"Net gain",     v:`$${top.score.netBonus}`,   c:YELLOW },
                  ].map(({l,v,c}) => (
                    <div key={l} style={{ background:"rgba(0,0,0,0.3)", borderRadius:"10px", padding:"14px" }}>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:"8px", color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>{l}</div>
                      <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"24px", fontWeight:800, color:c }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"11px", color:"rgba(255,255,255,0.3)" }}>
                    Min. spend: <span style={{ color:top.card.accent }}>${top.card.minSpend.toLocaleString()}</span> over <span style={{ color:top.card.accent }}>{top.card.spendPeriod}mo</span>
                    {" "}&nbsp;
                    {top.score.feasible
                      ? <span style={{ color:"#4ade80" }}>✓ within your budget</span>
                      : <span style={{ color:"#f87171" }}>⚠ spend higher than current profile</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ranked list */}
          <div style={{ marginBottom:"32px" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.22)", letterSpacing:"0.12em", marginBottom:"16px" }}>ALL RESULTS // RANKED BY NET ROI</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {results.map(({ card, score }, i) => (
                <div key={card.id}
                  onMouseEnter={() => setHoveredResult(card.id)}
                  onMouseLeave={() => setHoveredResult(null)}
                  onClick={() => setSelected(card)}
                  style={{
                    display:"flex", alignItems:"center", gap:"14px",
                    background: hoveredResult===card.id ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                    border:`1px solid ${selected?.id===card.id ? card.accent+"55" : "rgba(255,255,255,0.06)"}`,
                    borderRadius:"12px", padding:"14px 16px", cursor:"pointer", transition:"all 0.2s",
                  }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"11px", color:"rgba(255,255,255,0.18)", width:"20px", textAlign:"right", flexShrink:0 }}>
                    {String(i+1).padStart(2,"0")}
                  </div>
                  <div style={{ width:"6px", height:"6px", borderRadius:"1px", background:card.accent, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"baseline", gap:"8px", flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"var(--font-bricolage)", fontSize:"14px", fontWeight:700, color:"#fff" }}>{card.bank} {card.name}</span>
                      {i===0 && <span style={{ fontFamily:"var(--font-mono)", fontSize:"9px", color:card.accent, letterSpacing:"0.08em" }}>TOP PICK</span>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"6px" }}>
                      <ScoreBar pct={(score.score/maxScore)*100} color={card.accent} />
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.3)", flexShrink:0 }}>net ${score.netBonus}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"18px", fontWeight:800, color:card.accent }}>{(card.bonus/1000).toFixed(0)}K</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"9px", color:"rgba(255,255,255,0.22)" }}>pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:"12px" }}>
            <button onClick={() => { setPhase("spend"); scrollTop(); }} style={backBtnStyle}>← Adjust</button>
            <button onClick={() => { setPhase("timeline"); scrollTop(); }} style={primaryBtnStyle}>
              See my 12-month timeline →
            </button>
          </div>
        </div>
        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // ── Timeline ───────────────────────────────────────────────────────────
  if (phase === "timeline" && selected) {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
        style={{ fontFamily:"var(--font-dm)", background:NAVY, color:"#fff", minHeight:"100vh" }}>
        <div ref={topRef} />
        <Nav />
        <StepBar current={4} />

        <div style={{ maxWidth:"760px", margin:"0 auto", padding:"48px 24px 80px" }}>
          <div style={{ marginBottom:"36px" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:YELLOW, letterSpacing:"0.14em", marginBottom:"10px" }}>// YOUR PLAYBOOK</div>
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(30px,5vw,48px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:0.93, color:"#fff", marginBottom:"8px" }}>
              {selected.bank} {selected.name}
            </h2>
            <p style={{ fontFamily:"var(--font-dm)", fontSize:"14px", color:"rgba(255,255,255,0.4)" }}>
              12-month harvest plan. Follow each step and collect ${selected.bonusValue - selected.annualFee} net.
            </p>
          </div>

          <Timeline card={selected} spend={spend} />

          {/* Card switcher */}
          <div style={{ marginTop:"36px", paddingTop:"24px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.22)", letterSpacing:"0.1em", marginBottom:"12px" }}>COMPARE ANOTHER CARD</div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {results.map(({ card }) => (
                <button key={card.id} onClick={() => setSelected(card)}
                  style={{
                    background: selected.id===card.id ? `${card.accent}18` : "rgba(255,255,255,0.04)",
                    border:`1px solid ${selected.id===card.id ? card.accent+"55" : "rgba(255,255,255,0.08)"}`,
                    borderRadius:"4px", padding:"7px 14px",
                    fontFamily:"var(--font-mono)", fontSize:"11px", fontWeight:500,
                    color: selected.id===card.id ? card.accent : "rgba(255,255,255,0.38)",
                    cursor:"pointer", transition:"all 0.2s",
                  }}>
                  {card.bank}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:"12px", marginTop:"36px" }}>
            <button onClick={() => { setPhase("results"); scrollTop(); }} style={backBtnStyle}>← Results</button>
            <a href="https://openloans.com.au" style={{ flex:1, textDecoration:"none" }}>
              <button style={{ ...primaryBtnStyle, width:"100%", display:"block" }}>
                Talk to Open about applying →
              </button>
            </a>
          </div>

          <p style={{ marginTop:"20px", fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.14)", lineHeight:1.8, textAlign:"center" }}>
            General information only. Not financial advice. Card offers subject to change — verify with issuer. Read the PDS before applying.
          </p>
        </div>
        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  return null;
}

// ── Shared components ──────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{ position:"sticky", top:0, zIndex:100, padding:"0 24px", height:"58px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(13,27,42,0.97)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
      <a href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:"8px" }}>
        <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height:"20px", filter:"brightness(0) invert(1)", opacity:0.85 }} />
        <span style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.25)", letterSpacing:"0.1em", paddingLeft:"10px", borderLeft:"1px solid rgba(255,255,255,0.1)" }}>POINTS HACKER</span>
      </a>
      <div style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color:"rgba(255,255,255,0.18)", letterSpacing:"0.08em" }}>
        {new Date().toLocaleTimeString("en-AU", { hour:"2-digit", minute:"2-digit" })} AEST
      </div>
    </nav>
  );
}

function StepBar({ current }: { current: number }) {
  const steps = ["Spend", "History", "Results", "Timeline"];
  return (
    <div style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", padding:"0 24px" }}>
      <div style={{ maxWidth:"800px", margin:"0 auto", display:"flex", gap:"0" }}>
        {steps.map((s, i) => {
          const num = i + 1;
          const active = num === current;
          const done = num < current;
          return (
            <div key={s} style={{ flex:1, padding:"12px 0", display:"flex", alignItems:"center", gap:"8px", borderBottom:`2px solid ${active ? YELLOW : done ? "rgba(242,201,76,0.3)" : "transparent"}`, transition:"border-color 0.3s" }}>
              <div style={{ width:"18px", height:"18px", borderRadius:"3px", background: done ? YELLOW : active ? "rgba(242,201,76,0.2)" : "rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"9px", fontWeight:500, color: done ? NAVY : active ? YELLOW : "rgba(255,255,255,0.25)" }}>
                  {done ? "✓" : String(num).padStart(2,"0")}
                </span>
              </div>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"10px", color: active ? YELLOW : done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)", letterSpacing:"0.08em", display:"block" }}>{s.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  flexShrink:0, background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.45)",
  border:"1px solid rgba(255,255,255,0.1)", borderRadius:"4px", padding:"14px 22px",
  fontFamily:"var(--font-mono)", fontSize:"12px", fontWeight:500, cursor:"pointer",
  letterSpacing:"0.06em", transition:"all 0.2s",
};

const primaryBtnStyle: React.CSSProperties = {
  flex:1, background:YELLOW, color:NAVY, border:"none", borderRadius:"4px",
  padding:"14px 32px", fontFamily:"var(--font-bricolage)", fontSize:"15px",
  fontWeight:800, cursor:"pointer", transition:"all 0.2s", letterSpacing:"-0.02em",
};

const GLOBAL_CSS = `
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
  html { scroll-behavior:smooth }
  body { background:#0D1B2A; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale }
  input[type=range] { -webkit-appearance:none; appearance:none }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:${YELLOW}; cursor:pointer }
  @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 8px currentColor} 50%{opacity:0.4;box-shadow:0 0 3px currentColor} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
`;