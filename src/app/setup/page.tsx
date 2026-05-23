"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import { ShoppingCart, Coffee, Plane, Zap, Tag, ArrowRight } from "lucide-react";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-bricolage" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-dm" });

const NAVY = "#0D1B2A";
const YELLOW = "#F2C94C";
const CREAM = "#F5F0E8";

// ── Card database (unchanged logic) ────────────────────────────────────────
const ALL_CARDS = [
  {
    id: "westpac-altitude",
    bank: "Westpac", name: "Altitude Black", network: "MC",
    bonus: 150000, bonusValue: 750, annualFee: 250,
    minSpend: 4000, spendPeriod: 3,
    accent: "#F97316", bg: ["#2a1a0f", "#1a0f07"],
    earnRate: { groceries: 2, dining: 3, travel: 3, bills: 1, other: 1 },
    bestFor: ["travel", "dining"],
    tag: "Best value overall",
  },
  {
    id: "anz-ff-black",
    bank: "ANZ", name: "Frequent Flyer Black", network: "VISA",
    bonus: 80000, bonusValue: 640, annualFee: 425,
    minSpend: 2500, spendPeriod: 3,
    accent: "#60A5FA", bg: ["#1c2b4a", "#121e35"],
    earnRate: { groceries: 1, dining: 1, travel: 2, bills: 1, other: 1 },
    bestFor: ["travel"],
    tag: "Best for Qantas flyers",
  },
  {
    id: "nab-qantas",
    bank: "NAB", name: "Qantas Rewards Sig.", network: "VISA",
    bonus: 90000, bonusValue: 720, annualFee: 395,
    minSpend: 3000, spendPeriod: 3,
    accent: "#A78BFA", bg: ["#1a1040", "#0d0a28"],
    earnRate: { groceries: 1, dining: 2, travel: 2, bills: 1, other: 1 },
    bestFor: ["dining", "travel"],
    tag: "Best earn rate on dining",
  },
  {
    id: "amex-platinum",
    bank: "American Express", name: "Platinum Edge", network: "AMEX",
    bonus: 100000, bonusValue: 800, annualFee: 195,
    minSpend: 3000, spendPeriod: 3,
    accent: "#F2C94C", bg: ["#1a3350", "#0f2236"],
    earnRate: { groceries: 3, dining: 2, travel: 2, bills: 1, other: 1 },
    bestFor: ["groceries", "everyday"],
    tag: "Lowest fee / highest value",
  },
  {
    id: "citi-premier",
    bank: "Citibank", name: "Premier", network: "VISA",
    bonus: 75000, bonusValue: 600, annualFee: 300,
    minSpend: 3000, spendPeriod: 3,
    accent: "#34D399", bg: ["#0d2d22", "#071a14"],
    earnRate: { groceries: 2, dining: 2, travel: 3, bills: 1, other: 1 },
    bestFor: ["travel", "dining"],
    tag: "Best for international travel",
  },
  {
    id: "commbank-awards",
    bank: "CommBank", name: "Diamond Awards", network: "MC",
    bonus: 120000, bonusValue: 700, annualFee: 350,
    minSpend: 5000, spendPeriod: 4,
    accent: "#FB923C", bg: ["#2a1505", "#1a0d03"],
    earnRate: { groceries: 2, dining: 2, travel: 2, bills: 2, other: 1.5 },
    bestFor: ["bills", "everyday"],
    tag: "Best for high spenders",
  },
];

type SpendProfile = { groceries: number; dining: number; travel: number; bills: number; other: number };
type Phase = "boot" | "spend" | "history" | "analysing" | "results" | "timeline";

function scoreCard(card: typeof ALL_CARDS[0], spend: SpendProfile, history: string[]) {
  const totalSpend = Object.values(spend).reduce((a, b) => a + b, 0);
  const monthlyNeeded = card.minSpend / card.spendPeriod;
  const feasible = totalSpend >= monthlyNeeded;
  const feasibilityScore = feasible ? 100 : (totalSpend / monthlyNeeded) * 60;
  const earnValue = (
    spend.groceries * card.earnRate.groceries +
    spend.dining * card.earnRate.dining +
    spend.travel * card.earnRate.travel +
    spend.bills * card.earnRate.bills +
    spend.other * card.earnRate.other
  ) * 0.01;
  const netBonus = card.bonusValue - card.annualFee;
  const historyPenalty = history.includes(card.id) ? 0.5 : 1;
  const score = (netBonus * 0.5 + earnValue * 12 * 0.3 + feasibilityScore * 0.2) * historyPenalty;
  return { score, netBonus, earnValue: earnValue * 12, feasible, monthlyNeeded };
}

// Modern category definitions use Lucide icons (scalable, crisp)
const CATEGORIES = [
  { key: "groceries" as const, label: "Groceries", Icon: ShoppingCart, color: "#4ade80", max: 5000 },
  { key: "dining" as const, label: "Dining", Icon: Coffee, color: "#f97316", max: 3000 },
  { key: "travel" as const, label: "Travel", Icon: Plane, color: "#60a5fa", max: 5000 },
  { key: "bills" as const, label: "Bills", Icon: Zap, color: "#a78bfa", max: 4000 },
  { key: "other" as const, label: "Other", Icon: Tag, color: "#f472b6", max: 3000 },
];

function SpendOrb({ cat, value, onChange }: { cat: typeof CATEGORIES[0]; value: number; onChange: (v: number) => void }) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const pct = value / cat.max;
  const size = 84 + pct * 120; // 84–204px

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = (e as any).clientY ?? 0;
    startVal.current = value;
    (e.target as Element).setPointerCapture?.((e as any).pointerId);
    e.preventDefault();
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const delta = (startY.current - e.clientY) * (cat.max / 360);
      onChange(Math.max(0, Math.min(cat.max, Math.round((startVal.current + delta) / 50) * 50)));
    };
    const onPointerUp = () => { dragging.current = false; };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); };
  }, [cat.max, onChange]);

  const Icon = cat.Icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, userSelect: "none" }}>
      <div
        className="orb"
        onPointerDown={onPointerDown}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={cat.max}
        tabIndex={0}
        style={{
          width: `${size}px`, height: `${size}px`,
          borderRadius: "50%",
          background: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`,
          border: `1px solid rgba(255,255,255,0.06)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "ns-resize",
          transition: "width 220ms ease, height 220ms ease, box-shadow 220ms",
          boxShadow: `0 10px 40px ${cat.color}22, inset 0 -14px 36px rgba(0,0,0,0.45)`,
          backdropFilter: "blur(6px)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "56%", height: "56%", borderRadius: "50%", background: `radial-gradient(circle at 30% 30%, ${cat.color}33, transparent 40%)` }}>
          <Icon color={cat.color} size={size > 140 ? 28 : 20} />
        </div>
        <div style={{ position: "absolute", bottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: cat.color }}>{value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}</div>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.46)", letterSpacing: "0.06em", textAlign: "center" }}>{cat.label}</div>
      <input
        aria-label={`${cat.label} slider`}
        type="range" min={0} max={cat.max} step={50} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: `${Math.max(size, 96)}px`, opacity: 0.001, position: "absolute", height: 1 }}
      />
    </div>
  );
}

function ScoreBar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 120); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 999, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${width}%`, background: color, borderRadius: 999, transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)", boxShadow: `0 6px 24px ${color}33` }} />
    </div>
  );
}

function CardChip({ card, selected, onClick }: { card: typeof ALL_CARDS[0]; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      borderRadius: 14, padding: "14px 16px", textAlign: "left",
      background: `linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))`,
      border: `1px solid ${selected ? card.accent : "rgba(255,255,255,0.06)"}`,
      cursor: "pointer", transition: "transform 180ms, box-shadow 180ms",
      boxShadow: selected ? `0 10px 40px ${card.accent}22` : "0 6px 20px rgba(0,0,0,0.35)",
      transform: selected ? "translateY(-4px)" : "none",
      position: "relative", overflow: "hidden", width: "100%"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{card.bank}</div>
          <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{card.name}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: card.accent }}>{(card.bonus / 1000).toFixed(0)}K</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>≈ ${card.bonusValue}</div>
          </div>
        </div>
        <div style={{ width: 64, height: 40, borderRadius: 8, background: `linear-gradient(135deg, ${card.bg[0]}, ${card.bg[1]})`, border: `1px solid rgba(255,255,255,0.04)` }} />
      </div>
    </button>
  );
}

function Timeline({ card, spend }: { card: typeof ALL_CARDS[0]; spend: SpendProfile }) {
  const today = new Date();
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const events = [
    { m: 0, label: "Apply & activate", detail: `Takes 5–10 business days.`, color: card.accent },
    { m: 1, label: "First spend check", detail: `Stay above $${Math.ceil(card.minSpend / card.spendPeriod / 100) * 100}/mo.`, color: "#4ade80" },
    { m: card.spendPeriod, label: `Bonus lands: ${card.bonus.toLocaleString()} pts`, detail: `Worth ~$${card.bonusValue}. Transfer to airline partners.`, color: YELLOW },
    { m: card.spendPeriod + 1, label: "Redeem for max value", detail: "Airline/hotel transfer beats cashback.", color: "#60a5fa" },
    { m: 11, label: "Close before renewal", detail: "Close 30 days before annual fee re-bills.", color: "#f87171" },
    { m: 12, label: "Next rotation starts", detail: "Repeat with a fresh offer. Compounding gains.", color: "rgba(255,255,255,0.4)" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { l: "Bonus value", v: `$${card.bonusValue}`, c: "#4ade80" },
          { l: "Annual fee", v: `$${card.annualFee}`, c: "#f87171" },
          { l: "Net first year", v: `$${card.bonusValue - card.annualFee}`, c: YELLOW },
          { l: "3-year return", v: `$${(card.bonusValue - card.annualFee) * 3}`, c: card.accent },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{l}</div>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 26, fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 18, top: 24, bottom: 24, width: 1, background: "linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.03))" }} />
        {events.map((ev, i) => {
          const d = new Date(today.getFullYear(), today.getMonth() + ev.m, 1);
          return (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 18, position: "relative" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${ev.color}14`, border: `1.5px solid ${ev.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }} />
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                  <span style={{ fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 700, color: "#fff" }}>{ev.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.22)" }}>{MONTHS[d.getMonth()]} {d.getFullYear()}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{ev.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SetupWizard() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [spend, setSpend] = useState<SpendProfile>({ groceries: 800, dining: 400, travel: 300, bills: 600, other: 400 });
  const [history, setHistory] = useState<string[]>([]);
  const [results, setResults] = useState<Array<{ card: typeof ALL_CARDS[0]; score: ReturnType<typeof scoreCard> }>>([]);
  const [selected, setSelected] = useState<typeof ALL_CARDS[0] | null>(null);
  const [analyseProgress, setAnalyseProgress] = useState(0);
  const [analyseLabel, setAnalyseLabel] = useState("Initialising...");
  const [hoveredResult, setHoveredResult] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  const totalSpend = Object.values(spend).reduce((a, b) => a + b, 0);
  const maxScore = results[0]?.score.score ?? 1;

  const runAnalysis = () => {
    setPhase("analysing");
    setAnalyseProgress(0);
    scrollTop();
    const labels = [
      "Parsing spend profile...",
      "Cross-referencing live offers...",
      "Calculating net bonus values...",
      "Applying earn rate multipliers...",
      "Ranking by 12-month ROI...",
      "Finalising recommendations...",
    ];
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setAnalyseProgress(Math.min(step * 17, 95));
      setAnalyseLabel(labels[Math.min(step - 1, labels.length - 1)]);
      if (step >= 6) {
        clearInterval(interval);
        setTimeout(() => {
          setAnalyseProgress(100);
          const scored = ALL_CARDS
            .map(card => ({ card, score: scoreCard(card, spend, history) }))
            .sort((a, b) => b.score.score - a.score.score);
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

  // Boot
  if (phase === "boot") {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-dm)", background: NAVY, color: "#fff", minHeight: "100vh" }}>
        <div ref={topRef} />
        <Nav />
        <main style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "72px 28px", minHeight: "72vh" }}>
          <section style={{ maxWidth: 980, width: "100%", padding: 36, borderRadius: 20, background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 18px 60px rgba(2,6,23,0.6)", backdropFilter: "blur(8px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: "clamp(34px,6vw,56px)", fontWeight: 800, lineHeight: 0.9 }}>Personalised card<br />recommendations</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "rgba(255,255,255,0.36)", marginTop: 8 }}>Two quick steps — we match to the best AU sign-up offers and build your 12‑month plan.</div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setPhase("spend")} style={{ background: YELLOW, color: NAVY, border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 800, cursor: "pointer", display: 'inline-flex', gap:8, alignItems:'center' }}>Get started <ArrowRight size={16} /></button>
              </div>
            </div>
          </section>
        </main>

        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // Spend
  if (phase === "spend") {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-dm)", background: NAVY, color: "#fff", minHeight: "100vh" }}>
        <div ref={topRef} />
        <Nav />
        <StepBar current={1} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 120px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: "0.14em", marginBottom: 6 }}>STEP 01</div>
              <h2 style={{ fontFamily: "var(--font-bricolage)", fontSize: "clamp(28px,6vw,48px)", fontWeight: 800, margin: 0 }}>Your monthly spend profile</h2>
              <div style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "rgba(255,255,255,0.36)", marginTop: 8 }}>Drag or tap each orb to express where you spend each month.</div>
            </div>
            <div style={{ textAlign: "right", color: "rgba(255,255,255,0.36)", fontFamily: "var(--font-mono)", fontSize: 13 }}>${totalSpend}/mo</div>
          </div>

          <div style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.01))", borderRadius: 20, padding: 28, border: "1px solid rgba(255,255,255,0.04)", boxShadow: "0 20px 60px rgba(2,6,23,0.6)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 10% 10%, rgba(255,255,255,0.02), transparent), radial-gradient(circle at 90% 90%, rgba(255,255,255,0.01), transparent)", opacity: 0.6, pointerEvents: "none" }} />

            <div className="grid-orbs" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 22, alignItems: "end" }}>
              {CATEGORIES.map(cat => (
                <div key={cat.key} style={{ display: "flex", justifyContent: "center" }}>
                  <SpendOrb cat={cat} value={spend[cat.key]} onChange={(v) => updateSpend(cat.key, v)} />
                </div>
              ))}
            </div>
          </div>

            <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
            <button onClick={() => setPhase("boot")} style={backBtnStyle}>Back</button>
            <button onClick={() => setPhase("history")} style={{ ...primaryBtnStyle, display: 'inline-flex', gap:8, alignItems:'center' }}>Continue <ArrowRight size={14} /></button>
          </div>
        </div>

        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // History
  if (phase === "history") {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-dm)", background: NAVY, color: "#fff", minHeight: "100vh" }}>
        <div ref={topRef} />
        <Nav />
        <StepBar current={2} />

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.14em", marginBottom: 10 }}>02 / CARD HISTORY</div>
            <h2 style={{ fontFamily: "var(--font-bricolage)", fontSize: "clamp(34px,6vw,52px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.93, color: "#fff", marginBottom: 12 }}>
              Held any of these
              <span style={{ color: "rgba(255,255,255,0.28)", display: "block", fontFamily: "var(--font-dm)", fontSize: 14, marginTop: 6 }}>in the last 18 months?</span>
            </h2>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "rgba(255,255,255,0.35)" }}>
              Most banks won't give you the sign-up bonus again. Select all that apply — we'll deprioritise them.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12, marginBottom: 24 }}>
            {ALL_CARDS.map(card => (
              <CardChip key={card.id} card={card}
                selected={history.includes(card.id)}
                onClick={() => setHistory(h => h.includes(card.id) ? h.filter(x => x !== card.id) : [...h, card.id])}
              />
            ))}
          </div>

          <div style={{ marginBottom: 32 }}>
            <button onClick={() => setHistory([])}
              style={{ background: history.length === 0 ? "rgba(255,255,255,0.08)" : "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 20px", fontFamily: "var(--font-dm)", fontSize: 13, color: "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${history.length === 0 ? YELLOW : "rgba(255,255,255,0.25)"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {history.length === 0 && <span style={{ fontSize: 10, color: YELLOW }}>✓</span>}
              </span>
              None of these — I'm a clean slate
            </button>
            {history.length > 0 && (
              <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                {history.length} card{history.length > 1 ? "s" : ""} flagged → will be deprioritised in results
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setPhase("spend")} style={backBtnStyle}>Back</button>
            <button onClick={runAnalysis} style={primaryBtnStyle}>Run analysis</button>
          </div>
        </div>

        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // Analysing
  if (phase === "analysing") {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-mono)", background: NAVY, color: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div ref={topRef} />

        <div style={{ width: "100%", maxWidth: 520 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: YELLOW, animation: "pulse 0.8s infinite" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>SCORING ENGINE ACTIVE</span>
          </div>

          <div style={{ fontFamily: "var(--font-bricolage)", fontSize: "clamp(32px,7vw,56px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", lineHeight: 0.95, marginBottom: 36 }}>
            Crunching<br /><span style={{ color: YELLOW }}>your numbers.</span>
          </div>

          <div style={{ height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 1, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${analyseProgress}%`, background: YELLOW, borderRadius: 1, transition: "width 0.25s ease", boxShadow: `0 0 12px ${YELLOW}88` }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{analyseLabel}</span>
            <span style={{ fontSize: 11, color: YELLOW, fontWeight: 500 }}>{Math.round(analyseProgress)}%</span>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 2 }}>
            {ALL_CARDS.slice(0, Math.ceil(analyseProgress / 17)).map(card => (
              <div key={card.id}>
                {`Processing ${card.bank} ${card.name} — scored ✓`}
              </div>
            ))}
            {analyseProgress < 100 && <div style={{ color: "rgba(255,255,255,0.4)" }}>&gt; ▋</div>}
          </div>
        </div>

        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // Results
  if (phase === "results") {
    const top = results[0];
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-dm)", background: NAVY, color: "#fff", minHeight: "100vh" }}>
        <div ref={topRef} />
        <Nav />
        <StepBar current={3} />

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 80px" }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#4ade80", letterSpacing: "0.14em", marginBottom: 10 }}>// ANALYSIS COMPLETE</div>
            <h2 style={{ fontFamily: "var(--font-bricolage)", fontSize: "clamp(34px,6vw,56px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.9, color: "#fff", marginBottom: 12 }}>
              Your top match.
            </h2>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Based on ${totalSpend.toLocaleString()}/mo. Ranked by net 12-month ROI.</p>
          </div>

          {top && (
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 24, background: `linear-gradient(135deg, ${top.card.bg[0]}, ${top.card.bg[1]})`, border: `1.5px solid ${top.card.accent}55`, boxShadow: `0 0 0 1px ${top.card.accent}22, 0 24px 80px rgba(0,0,0,0.6)`, position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${top.card.accent}, transparent)` }} />
              <div style={{ padding: "28px 28px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
                  <div>
                    <div style={{ display: "inline-block", background: `${top.card.accent}20`, border: `1px solid ${top.card.accent}44`, borderRadius: 4, padding: "3px 10px", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500, color: top.card.accent, marginBottom: 10, letterSpacing: "0.1em" }}>
                      ★ {top.card.tag.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", marginBottom: 3 }}>{top.card.bank.toUpperCase()}</div>
                    <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 26, fontWeight: 800, color: "#fff" }}>{top.card.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 52, fontWeight: 800, color: top.card.accent, lineHeight: 0.85, letterSpacing: "-0.04em" }}>
                      {(top.card.bonus / 1000).toFixed(0)}K
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>BONUS POINTS</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { l: "Bonus value", v: `$${top.card.bonusValue}`, c: "#4ade80" },
                    { l: "Annual fee", v: `$${top.card.annualFee}`, c: "#f87171" },
                    { l: "Net gain", v: `$${top.score.netBonus}`, c: YELLOW },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{l}</div>
                      <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                    Min. spend: <span style={{ color: top.card.accent }}>${top.card.minSpend.toLocaleString()}</span> over <span style={{ color: top.card.accent }}>{top.card.spendPeriod}mo</span>
                    {" "}&nbsp;
                    {top.score.feasible
                      ? <span style={{ color: "#4ade80" }}>✓ within your budget</span>
                      : <span style={{ color: "#f87171" }}>⚠ spend higher than current profile</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em", marginBottom: 16 }}>ALL RESULTS // RANKED BY NET ROI</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map(({ card, score }, i) => (
                <div key={card.id}
                  onMouseEnter={() => setHoveredResult(card.id)}
                  onMouseLeave={() => setHoveredResult(null)}
                  onClick={() => setSelected(card)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: hoveredResult === card.id ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selected?.id === card.id ? card.accent + "55" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s",
                  }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.18)", width: 20, textAlign: "right", flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: 1, background: card.accent, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 700, color: "#fff" }}>{card.bank} {card.name}</span>
                      {i === 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: card.accent, letterSpacing: "0.08em" }}>TOP PICK</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <ScoreBar pct={(score.score / maxScore) * 100} color={card.accent} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>net ${score.netBonus}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: card.accent }}>{(card.bonus / 1000).toFixed(0)}K</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.22)" }}>pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => { setPhase("spend"); scrollTop(); }} style={backBtnStyle}>← Adjust</button>
            <button onClick={() => { setPhase("timeline"); scrollTop(); }} style={primaryBtnStyle}>See my 12-month timeline →</button>
          </div>
        </div>

        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  // Timeline
  if (phase === "timeline" && selected) {
    return (
      <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-dm)", background: NAVY, color: "#fff", minHeight: "100vh" }}>
        <div ref={topRef} />
        <Nav />
        <StepBar current={4} />

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: YELLOW, letterSpacing: "0.14em", marginBottom: 10 }}>// YOUR PLAYBOOK</div>
            <h2 style={{ fontFamily: "var(--font-bricolage)", fontSize: "clamp(30px,5vw,48px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.93, color: "#fff", marginBottom: 8 }}>
              {selected.bank} {selected.name}
            </h2>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              12-month harvest plan. Follow each step and collect ${selected.bonusValue - selected.annualFee} net.
            </p>
          </div>

          <Timeline card={selected} spend={spend} />

          <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em", marginBottom: 12 }}>COMPARE ANOTHER CARD</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {results.map(({ card }) => (
                <button key={card.id} onClick={() => setSelected(card)}
                  style={{
                    background: selected.id === card.id ? `${card.accent}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selected.id === card.id ? card.accent + "55" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 4, padding: "7px 14px",
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500,
                    color: selected.id === card.id ? card.accent : "rgba(255,255,255,0.38)",
                    cursor: "pointer", transition: "all 0.2s",
                  }}>
                  {card.bank}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
            <button onClick={() => { setPhase("results"); scrollTop(); }} style={backBtnStyle}>← Results</button>
            <a href="https://openloans.com.au" style={{ flex: 1, textDecoration: "none" }}>
              <button style={{ ...primaryBtnStyle, width: "100%", display: "block" }}>
                Talk to Open about applying →
              </button>
            </a>
          </div>

          <p style={{ marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.14)", lineHeight: 1.8, textAlign: "center" }}>
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
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, padding: "10px 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(13,27,42,0.68)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
        <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height: 22, filter: "brightness(0) invert(1)", opacity: 0.95 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}>POINTS HACKER</span>
      </a>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em" }}>
        {time ? `${time} AEST` : "--:-- AEST"}
      </div>
    </nav>
  );
}

function StepBar({ current }: { current: number }) {
  const steps = ["Spend", "History", "Results", "Timeline"];
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", gap: 0 }}>
        {steps.map((s, i) => {
          const num = i + 1;
          const active = num === current;
          const done = num < current;
          return (
            <div key={s} style={{ flex: 1, padding: "12px 0", display: "flex", alignItems: "center", gap: 8, borderBottom: `2px solid ${active ? YELLOW : done ? "rgba(242,201,76,0.3)" : "transparent"}`, transition: "border-color 0.3s" }}>
              <div style={{ width: 18, height: 18, borderRadius: 3, background: done ? YELLOW : active ? "rgba(242,201,76,0.2)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500, color: done ? NAVY : active ? YELLOW : "rgba(255,255,255,0.25)" }}>{done ? "✓" : String(num).padStart(2, "0")}</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: active ? YELLOW : done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)", letterSpacing: "0.08em", display: "block" }}>{s.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  flexShrink: 0, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 20px",
  fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, cursor: "pointer",
  letterSpacing: "0.06em", transition: "all 0.18s",
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 1, background: YELLOW, color: NAVY, border: "none", borderRadius: 10,
  padding: "12px 24px", fontFamily: "var(--font-bricolage)", fontSize: 15,
  fontWeight: 800, cursor: "pointer", transition: "all 0.18s", letterSpacing: "-0.02em",
};

const GLOBAL_CSS = `
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
  html { scroll-behavior:smooth }
  body { background:${NAVY}; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale }
  input[type=range] { -webkit-appearance:none; appearance:none }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:${YELLOW}; cursor:pointer }
  @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 8px currentColor} 50%{opacity:0.4;box-shadow:0 0 3px currentColor} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
  @keyframes floaty { 0% { transform: translateY(0px) } 50% { transform: translateY(-6px) } 100% { transform: translateY(0px) } }
  .orb { transition: transform 240ms cubic-bezier(.2,.9,.28,1), box-shadow 240ms; will-change: transform; }
  .orb:hover { transform: translateY(-6px) scale(1.03); box-shadow: 0 18px 60px rgba(0,0,0,0.5); }
  .orb > div { animation: floaty 6s ease-in-out infinite; }
  .hero-entrance { animation: fadeIn 0.6s ease both; }
  @media (max-width: 640px) {
    .orb { transform: none !important; }
    .grid-orbs { grid-template-columns: 1fr !important; }
    nav { padding: 8px 12px !important }
  }
`;
