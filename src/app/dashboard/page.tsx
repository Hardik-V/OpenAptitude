"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import {
  RefreshCw, ChevronRight, CheckCircle, Circle,
  AlertCircle, TrendingUp, Award, Calendar, Zap,
} from "lucide-react";
import { useOnboardingStore } from "../../stores/onboarding.store";
import { rankSequences, sequenceTimeline } from "../../lib/sequences";
import { SPEND_CATEGORIES } from "../../lib/cards";
import type { CardSequence } from "../../lib/sequences";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-bricolage" });
const dmMono    = DM_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono" });
const dmSans    = DM_Sans({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-dm" });

const NAVY   = "#0D1B2A";
const YELLOW = "#F2C94C";

// ─── Animated number ──────────────────────────────────────────────────────────
function AnimNum({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [disp, setDisp] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current, end = value, dur = 700, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisp(Math.round(start + (end - start) * e));
      if (p < 1) requestAnimationFrame(tick); else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{disp.toLocaleString()}{suffix}</>;
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: "rgba(10,20,32,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>MONTH {label}</div>
      {d?.label && <div style={{ fontSize: 8, color: d.phaseColor ?? YELLOW, marginBottom: 3 }}>● {d.label}</div>}
      <div style={{ fontSize: 13, fontWeight: 700, color: YELLOW }}>${d?.cumValue?.toLocaleString()}</div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", marginTop: 1 }}>{d?.cumPts?.toLocaleString()} pts</div>
    </div>
  );
}

// ─── Build cumulative chart data ──────────────────────────────────────────────
function buildChartData(seq: CardSequence, spend: Record<string, number>) {
  const pts_cpp = 0.008;
  let cumPts = 0;
  return Array.from({ length: seq.horizon + 1 }, (_, m) => {
    let bonusPts = 0;
    let label: string | undefined;
    seq.slots.forEach((s, i) => {
      if (m === s.bonusMonth && s.feasible) { bonusPts += s.card.bonus; label = `${s.card.bank} bonus`; }
      if (m === s.startMonth && m > 0) label = `→ ${s.card.bank}`;
    });
    const phaseIdx = seq.slots.reduce((acc, s, i) => m >= s.startMonth ? i : acc, 0);
    const slot = seq.slots[phaseIdx];
    const earn = slot ? Object.entries(spend).reduce((sum, [k, v]) => sum + v * ((slot.card.earnRate as any)[k] ?? 1) * 0.01, 0) : 0;
    cumPts += earn + bonusPts;
    return { month: m, cumValue: Math.round(cumPts * pts_cpp), cumPts: Math.round(cumPts), phase: phaseIdx, phaseColor: seq.slots[phaseIdx]?.card.accent, label };
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { rankedSequences, selectedSequence, setSelectedSequence, spend, goal, cardHistory, setStep, reset } = useOnboardingStore();
  const [hydrated, setHydrated] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    const u = () => setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));
    u(); const t = setInterval(u, 1000); return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!rankedSequences?.length) router.push("/setup");
  }, [hydrated, rankedSequences, router]);

  const swap = (s: CardSequence) => { setSelectedSequence(s); setActivePhase(0); setAnimKey(k => k + 1); };
  const phase = (i: number) => { setActivePhase(i); setAnimKey(k => k + 1); };

  if (!hydrated || !rankedSequences?.length || !selectedSequence) return <div style={{ minHeight: "100vh", background: NAVY }} />;

  const seq = selectedSequence;
  const slot = seq.slots[activePhase];
  const card = slot?.card;
  const accent = card?.accent ?? YELLOW;
  const chartData = buildChartData(seq, spend);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const getDate = (offset: number) => { const d = new Date(); d.setMonth(d.getMonth() + offset); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

  const totalMonthly = Object.values(spend).reduce((a, b) => a + b, 0);
  const monthlyNeeded = card.minSpend / card.spendPeriod;
  const spendPct = Math.min(100, (totalMonthly / monthlyNeeded) * 100);
  const feasible = totalMonthly >= monthlyNeeded;
  const nextSlot = seq.slots[activePhase + 1];
  const bonusDate = getDate(slot.startMonth + card.spendPeriod);
  const closeDate = getDate(slot.startMonth + 11);

  return (
    <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
      style={{ fontFamily: "var(--font-dm)", background: NAVY, color: "#fff", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── TOPBAR ── 44px ─────────────────────────────────────────────── */}
      <div style={{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(13,27,42,0.96)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.055)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height: 16, filter: "brightness(0) invert(1)", opacity: 0.85 }} />
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 5, height: 5, background: "#4ade80", borderRadius: "50%", animation: "pulse 2s infinite", display: "inline-block" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>PROGRAMME ACTIVE</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.16)" }}>{time}</span>
          <button onClick={() => { reset(); router.push("/setup"); }}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}>
            <RefreshCw size={9} /> RESET
          </button>
        </div>
      </div>

      {/* ── SCENARIO TABS ── 68px ──────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: "8px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, alignItems: "stretch" }}>
        {rankedSequences.map((s, idx) => {
          const active = seq.id === s.id;
          return (
            <button key={s.id} onClick={() => swap(s)}
              style={{ flex: 1, background: active ? `${s.archetypeColor}14` : "rgba(255,255,255,0.025)", border: `1px solid ${active ? s.archetypeColor + "50" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", transition: "all 0.2s", textAlign: "left", position: "relative", overflow: "hidden" }}>
              {active && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${s.archetypeColor}, transparent)` }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: active ? s.archetypeColor : "rgba(255,255,255,0.18)", boxShadow: active ? `0 0 5px ${s.archetypeColor}` : "none", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: active ? s.archetypeColor : "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
                  ROUTE {String(idx + 1).padStart(2, "0")} · {s.archetypeLabel.toUpperCase()}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: active ? "#fff" : "rgba(255,255,255,0.38)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                ${s.totalValue.toLocaleString()}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>
                {(s.totalBonusPoints / 1000).toFixed(0)}K pts · {s.horizon}mo
              </div>
            </button>
          );
        })}
      </div>

      {/* ── MAIN BODY - fills remaining viewport ────────────────────────── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 260px", gap: 0, minHeight: 0, overflow: "hidden" }}>

        {/* ── LEFT: Phases ─────────────────────────────────────────────── */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.055)", padding: "14px 14px", display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", marginBottom: 2 }}>SEQUENCE PHASES</div>

          {seq.slots.map((s, i) => {
            const active = activePhase === i;
            const c = s.card;
            return (
              <React.Fragment key={i}>
                <button onClick={() => phase(i)}
                  style={{ background: active ? `${c.accent}12` : "rgba(255,255,255,0.025)", border: `1.5px solid ${active ? c.accent + "55" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", transition: "all 0.2s", textAlign: "left", position: "relative", overflow: "hidden", flexShrink: 0 }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"; }}>
                  {active && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* mini card */}
                    <div style={{ width: 36, height: 23, borderRadius: 4, flexShrink: 0, background: `linear-gradient(135deg, ${c.bg[0]}, ${c.bg[1]})`, border: "1px solid rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${c.accent}70,transparent)` }} />
                      <div style={{ position: "absolute", top: 4, left: 4, width: 7, height: 5, borderRadius: 1, background: "linear-gradient(135deg,#c8982a,#f0c060)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: active ? c.accent : "rgba(255,255,255,0.22)", letterSpacing: "0.08em", marginBottom: 1 }}>PHASE {i + 1} · {getDate(s.startMonth)}</div>
                      <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 11, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.bank} {c.name}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 800, color: active ? c.accent : "rgba(255,255,255,0.32)", letterSpacing: "-0.02em" }}>${s.bonusValue}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.2)" }}>net</div>
                    </div>
                  </div>
                </button>
                {i < seq.slots.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexShrink: 0 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.15)" }}>THEN</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Programme total */}
          <div style={{ marginTop: "auto", background: `${seq.archetypeColor}0a`, border: `1px solid ${seq.archetypeColor}28`, borderRadius: 9, padding: "10px 12px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${seq.archetypeColor}60,transparent)` }} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: seq.archetypeColor, letterSpacing: "0.1em", marginBottom: 3 }}>TOTAL PROGRAMME</div>
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>${seq.totalValue.toLocaleString()}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.28)", marginTop: 3 }}>{seq.slots.length} switches · {seq.horizon}mo horizon</div>
          </div>
        </div>

        {/* ── CENTRE: Chart + KPI strip ────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.055)", overflow: "hidden" }}>

          {/* KPI strip */}
          <div style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
            {[
              { icon: <TrendingUp size={11} />, label: "36-MO VALUE",     value: <AnimNum prefix="$" value={seq.totalValue} />,       sub: "full sequence",           accent: seq.archetypeColor },
              { icon: <Award size={11} />,      label: "TOTAL PTS",       value: <AnimNum value={seq.totalBonusPoints} />,            sub: "all 3 bonuses",           accent: seq.archetypeColor },
              { icon: <Calendar size={11} />,   label: "NEXT BONUS",      value: bonusDate,                                           sub: `${card.bank} lands`,      accent },
              { icon: <Zap size={11} />,        label: "PHASE",           value: `${activePhase + 1} / ${seq.slots.length}`,          sub: card.name,                 accent },
            ].map(({ icon, label, value, sub, accent: a }) => (
              <div key={label} style={{ padding: "12px 16px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <div style={{ color: a, opacity: 0.7 }}>{icon}</div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em" }}>{label}</span>
                </div>
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.22)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div key={`chart-${seq.id}`} style={{ flex: 1, padding: "14px 16px 10px", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em", marginBottom: 2 }}>CUMULATIVE VALUE - {seq.horizon}MO PROGRAMME</div>
                <div key={animKey} style={{ fontFamily: "var(--font-bricolage)", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, animation: "fadeUp 0.4s ease both" }}>
                  <AnimNum prefix="$" value={seq.totalValue} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {seq.slots.map((s, i) => (
                  <button key={i} onClick={() => phase(i)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", opacity: activePhase === i ? 1 : 0.4, transition: "opacity 0.2s", padding: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: s.card.accent }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.5)" }}>P{i + 1}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    {seq.slots.map((s, i) => (
                      <linearGradient key={i} id={`g${i}${seq.id.slice(0,4)}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.card.accent} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={s.card.accent} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontFamily: "var(--font-mono)", fontSize: 7, fill: "rgba(255,255,255,0.18)" }} axisLine={false} tickLine={false} tickFormatter={v => `M${v}`} interval={7} />
                  <YAxis tick={{ fontFamily: "var(--font-mono)", fontSize: 7, fill: "rgba(255,255,255,0.18)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} width={38} />
                  <Tooltip content={<ChartTooltip />} />
                  {seq.slots.slice(1).map((s, i) => (
                    <ReferenceLine key={i} x={s.startMonth} stroke={s.card.accent} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
                  ))}
                  <ReferenceLine x={slot.startMonth} stroke={accent} strokeWidth={1.5} opacity={0.65} />
                  <Area type="monotone" dataKey="cumValue" stroke={accent} strokeWidth={2}
                    fill={`url(#g${activePhase}${seq.id.slice(0,4)})`}
                    dot={false} activeDot={{ fill: accent, r: 3, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Phase band labels */}
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexShrink: 0 }}>
              {seq.slots.map((s, i) => {
                const endM = i < seq.slots.length - 1 ? seq.slots[i+1].startMonth : seq.horizon;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.03)", border: `1px solid ${s.card.accent}22`, borderRadius: 4, padding: "3px 7px" }}>
                    <div style={{ width: 4, height: 4, borderRadius: 1, background: s.card.accent }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.35)" }}>M{s.startMonth}–M{endM} {s.card.bank}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Active phase panel ────────────────────────────────── */}
        <div key={`panel-${activePhase}-${seq.id}`} style={{ display: "flex", flexDirection: "column", gap: 0, overflow: "hidden", animation: "fadeUp 0.25s ease both" }}>

          {/* Phase header */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.055)", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", marginBottom: 4 }}>PHASE {activePhase + 1} DETAIL</div>
            {/* Card visual */}
            <div style={{ width: "100%", aspectRatio: "1.7/1", borderRadius: 8, background: `linear-gradient(135deg,${card.bg[0]},${card.bg[1]})`, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", boxShadow: `0 10px 32px rgba(0,0,0,0.5)`, marginBottom: 10 }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 20%,rgba(255,255,255,0.04) 50%,transparent 80%)", animation: "shimmer 6s ease-in-out infinite" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${card.accent}80,transparent)` }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                <div>
                  <div style={{ fontSize: 6, color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 1 }}>{card.bank}</div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 11, fontWeight: 700, color: "#fff" }}>{card.name}</div>
                </div>
                <div style={{ width: 22, height: 16, borderRadius: 2, background: "linear-gradient(135deg,#c8982a,#f0c060)", border: "1px solid rgba(255,255,255,0.15)" }} />
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 8, letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", position: "relative", zIndex: 1 }}>•••• •••• •••• 4821</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: 6, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>08/28</div>
                <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 4, padding: "2px 7px", border: `1px solid ${card.accent}38` }}>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 11, fontWeight: 800, color: card.accent, lineHeight: 1 }}>{(card.bonus/1000).toFixed(0)}K</div>
                  <div style={{ fontSize: 5, color: "rgba(255,255,255,0.28)" }}>pts</div>
                </div>
              </div>
            </div>

            {/* 4 metrics 2×2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { l: "Bonus",     v: `$${card.bonusValue}`, c: "#4ade80" },
                { l: "Fee",       v: `$${card.annualFee}`,  c: "#f87171" },
                { l: "Net gain",  v: `$${slot.bonusValue}`, c: YELLOW },
                { l: "Min spend", v: `$${card.minSpend.toLocaleString()}`, c: accent },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "7px 9px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.22)", letterSpacing: "0.08em", marginBottom: 2 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 800, color: c, letterSpacing: "-0.02em" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Spend feasibility */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.055)", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em" }}>SPEND FEASIBILITY</span>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                {feasible ? <CheckCircle size={9} color="#4ade80" /> : <AlertCircle size={9} color="#f97316" />}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: feasible ? "#4ade80" : "#f97316" }}>{feasible ? "ON TRACK" : "TIGHT"}</span>
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.26)", marginBottom: 5 }}>
              ${totalMonthly.toLocaleString()}/mo · need ${Math.ceil(monthlyNeeded).toLocaleString()}
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 2, height: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${spendPct}%`, background: feasible ? "#4ade80" : "#f97316", borderRadius: 2, transition: "width 0.8s ease" }} />
            </div>
          </div>

          {/* Milestones */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.055)", flex: 1, overflow: "hidden" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", marginBottom: 8 }}>PHASE MILESTONES</div>
            {[
              { label: "Apply now",               date: getDate(slot.startMonth), color: accent,    done: true },
              { label: `${(card.bonus/1000).toFixed(0)}K pts bonus lands`, date: bonusDate,         color: YELLOW,   done: false },
              { label: "Close before fee",        date: closeDate,               color: "#f87171", done: false },
              ...(nextSlot ? [{ label: `→ ${nextSlot.card.bank}`, date: getDate(nextSlot.startMonth), color: nextSlot.card.accent, done: false }] : []),
            ].map((ev, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < arr.length - 1 ? 8 : 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: `${ev.color}18`, border: `1.5px solid ${ev.color}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {ev.done ? <div style={{ width: 5, height: 5, borderRadius: "50%", background: ev.color }} /> : <Circle size={5} color={ev.color} />}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 11, fontWeight: 700, color: ev.done ? "#fff" : "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>{ev.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{ev.date}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Spend categories for this card */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.055)", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", marginBottom: 7 }}>EARN RATES THIS CARD</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {SPEND_CATEGORIES.map(cat => {
                const rate = (card.earnRate as any)[cat.key] ?? 1;
                const barPct = Math.min(100, (rate / 3) * 100);
                return (
                  <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.28)", width: 44, flexShrink: 0 }}>{cat.label.slice(0,5).toUpperCase()}</span>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 2, height: 3 }}>
                      <div style={{ height: "100%", width: `${barPct}%`, background: cat.color, borderRadius: 2, opacity: 0.75 }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: cat.color, width: 16, textAlign: "right", flexShrink: 0 }}>{rate}×</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div style={{ padding: "10px 14px", flexShrink: 0, background: `linear-gradient(135deg,${card.bg[0]},${card.bg[1]})`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${card.accent}80,transparent)` }} />
            <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 11, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Ready to start Phase {activePhase + 1}?
            </div>
            <a href="https://openloans.com.au" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", background: YELLOW, color: NAVY, border: "none", borderRadius: 6, padding: "10px 0", fontFamily: "var(--font-bricolage)", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, letterSpacing: "-0.02em" }}>
                Apply via Open <ChevronRight size={12} />
              </button>
            </a>
          </div>
        </div>
      </div>

      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
        html, body { height:100%; overflow:hidden; background:${NAVY}; -webkit-font-smoothing:antialiased }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}