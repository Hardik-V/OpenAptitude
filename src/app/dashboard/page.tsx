"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import { useOnboardingStore } from "../../stores/onboarding.store";
import { SPEND_CATEGORIES } from "../../lib/cards";
import type { CardSequence, SequenceSlot } from "../../lib/sequences";
import { RefreshCw, ChevronRight, ExternalLink, AlertTriangle } from "lucide-react";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-bricolage",
});
const dmMono = DM_Mono({
  subsets: ["latin"], weight: ["400","500"], variable: "--font-mono",
});
const dmSans = DM_Sans({
  subsets: ["latin"], weight: ["400","500","600"], variable: "--font-dm",
});

const NAVY   = "#0D1B2A";
const YELLOW = "#F2C94C";

// ─── Weekly check-in store (local state, not persisted to Zustand) ────────────
// In production this would live in the store + backend.
// Here we use localStorage for persistence across reloads.

interface CheckIn {
  week: string;   // ISO week key e.g. "2025-W22"
  amount: number;
}

function getWeekKey(d = new Date()): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function useCheckIns() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ph-checkins");
      if (raw) setCheckIns(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  const addCheckIn = useCallback((amount: number) => {
    const week = getWeekKey();
    setCheckIns(prev => {
      const next = [...prev.filter(c => c.week !== week), { week, amount }];
      try { localStorage.setItem("ph-checkins", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const totalLogged = checkIns.reduce((s, c) => s + c.amount, 0);
  const thisWeek = checkIns.find(c => c.week === getWeekKey())?.amount ?? null;

  return { checkIns, addCheckIn, totalLogged, thisWeek, loaded };
}

// ─── SVG Harvest Ring ─────────────────────────────────────────────────────────

function HarvestRing({
  pct, accent, daysLeft, bonusValue, urgent,
}: {
  pct: number; accent: string; daysLeft: number; bonusValue: number; urgent: boolean;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;
  const trackR = 118;
  const circ = 2 * Math.PI * r;
  const clampedPct = Math.min(pct, 1);
  const [animPct, setAnimPct] = useState(0);
  const rafRef = useRef<number>(0);

  // Animate pct on mount
  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setAnimPct(clampedPct * ease);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [clampedPct]);

  // Tick marks (60, like a watch bezel)
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const inner = trackR - (isMajor ? 10 : 5);
    const outer = trackR + 2;
    const x1 = cx + inner * Math.cos(angle);
    const y1 = cy + inner * Math.sin(angle);
    const x2 = cx + outer * Math.cos(angle);
    const y2 = cy + outer * Math.sin(angle);
    const filled = i / 60 <= animPct;
    return { x1, y1, x2, y2, isMajor, filled };
  });

  const dashFill = animPct * circ;
  const dashGap  = circ - dashFill;

  const ringColor = urgent ? "#f87171" : pct >= 1 ? "#4ade80" : accent;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="ringBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background disc */}
        <circle cx={cx} cy={cy} r={r + 14} fill="url(#ringBg)" />

        {/* Track ring */}
        <circle cx={cx} cy={cy} r={trackR} fill="none"
          stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.filled ? ringColor : "rgba(255,255,255,0.08)"}
            strokeWidth={t.isMajor ? 1.5 : 0.8}
            strokeLinecap="round"
            style={{ transition: "stroke 0.1s" }}
          />
        ))}

        {/* Track base */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.05)" strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={ringColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dashFill} ${dashGap}`}
          strokeDashoffset={circ * 0.25}   /* start at top */
          filter="url(#ringGlow)"
          style={{ transition: "stroke 0.6s ease" }}
        />

        {/* Glow pulse when urgent */}
        {urgent && (
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="#f87171" strokeWidth="18"
            strokeDasharray={`${dashFill} ${dashGap}`}
            strokeDashoffset={circ * 0.25}
            opacity="0.12"
            style={{ animation: "ringPulse 2s ease-in-out infinite" }}
          />
        )}

        {/* Center content — rendered as foreignObject for font rendering */}
        <foreignObject x={cx - 80} y={cy - 64} width={160} height={128}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
            {pct >= 1 ? (
              <>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4ade80", letterSpacing: "0.16em", marginBottom: 6 }}>BONUS EARNED</div>
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 38, fontWeight: 800, color: "#4ade80", lineHeight: 1, letterSpacing: "-0.04em" }}>✓</div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.16em", marginBottom: 4 }}>
                  {urgent ? "URGENT" : "DAYS LEFT"}
                </div>
                <div style={{
                  fontFamily: "var(--font-bricolage)", fontSize: 52, fontWeight: 800, lineHeight: 1,
                  letterSpacing: "-0.05em",
                  color: urgent ? "#f87171" : "#fff",
                  animation: urgent ? "urgentPulse 2s ease-in-out infinite" : undefined,
                }}>
                  {daysLeft}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em", marginTop: 4 }}>
                  TO CLOSE
                </div>
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 700, color: ringColor, marginTop: 8, letterSpacing: "-0.02em" }}>
                  ${bonusValue} bonus
                </div>
              </>
            )}
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

// ─── Weekly pace indicator ────────────────────────────────────────────────────

function PaceBar({
  weeklyTarget, weeklyActual, accent,
}: {
  weeklyTarget: number; weeklyActual: number | null; accent: string;
}) {
  const pct = weeklyActual !== null ? Math.min(weeklyActual / weeklyTarget, 1.2) : 0;
  const onTrack = weeklyActual !== null && weeklyActual >= weeklyTarget * 0.9;
  const color = weeklyActual === null ? "rgba(255,255,255,0.2)" : onTrack ? "#4ade80" : "#f97316";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em" }}>
          WEEKLY PACE
        </span>
        <span style={{ fontFamily: "var(--font-bricolage)", fontSize: 13, fontWeight: 700, color }}>
          {weeklyActual !== null
            ? onTrack ? "On track" : `$${(weeklyTarget - weeklyActual).toLocaleString()} short`
            : "Log this week"
          }
        </span>
      </div>
      <div style={{ position: "relative", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "visible" }}>
        {/* Target marker */}
        <div style={{ position: "absolute", left: "83.3%", top: -4, height: 11, width: 1, background: "rgba(255,255,255,0.2)" }} />
        {/* Fill */}
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct * 83.3}%`, background: color, borderRadius: 2, transition: "width 0.8s cubic-bezier(0.34,1.2,0.64,1)", maxWidth: "100%" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.2)" }}>$0</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.35)" }}>
          ${weeklyTarget.toLocaleString()} target
        </span>
      </div>
    </div>
  );
}

// ─── Check-in modal ───────────────────────────────────────────────────────────

function CheckInModal({ onClose, onSubmit, weeklyTarget, accent }: {
  onClose: () => void; onSubmit: (v: number) => void;
  weeklyTarget: number; accent: string;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    const n = parseFloat(value.replace(/,/g, ""));
    if (!isNaN(n) && n >= 0) { onSubmit(n); onClose(); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "rgba(13,22,36,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "36px 32px", width: 360, animation: "modalIn 0.25s cubic-bezier(0.34,1.4,0.64,1) both" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: accent, letterSpacing: "0.14em", marginBottom: 8 }}>WEEKLY CHECK-IN</div>
        <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-0.03em" }}>
          How much did you spend this week?
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 28 }}>
          Target: ${weeklyTarget.toLocaleString()}/wk to stay on pace
        </div>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-bricolage)", fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.35)" }}>$</div>
          <input
            ref={inputRef}
            type="number" min="0" step="10"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose(); }}
            placeholder="0"
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 16px 16px 36px", fontFamily: "var(--font-bricolage)", fontSize: 28, fontWeight: 800, color: "#fff", outline: "none", letterSpacing: "-0.03em", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: "0 0 auto", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 20px", fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.4)", cursor: "pointer", letterSpacing: "0.06em" }}>
            Cancel
          </button>
          <button onClick={handleSubmit}
            style={{ flex: 1, background: YELLOW, color: NAVY, border: "none", borderRadius: 10, padding: "12px 20px", fontFamily: "var(--font-bricolage)", fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.02em" }}>
            Log spend
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming card pill ───────────────────────────────────────────────────────

function UpcomingCard({ slot, index, monthsAway }: {
  slot: SequenceSlot; index: number; monthsAway: number;
}) {
  const card = slot.card;
  return (
    <div style={{ position: "relative", borderRadius: 14, padding: "18px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
      {/* Locked overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(13,27,42,0.6)", backdropFilter: "blur(2px)", borderRadius: 14, zIndex: 1 }} />
      {/* Card content (dimmed underneath) */}
      <div style={{ opacity: 0.4 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 10 }}>CARD {index}</div>
        <div style={{ width: 48, height: 30, borderRadius: 5, background: `linear-gradient(135deg,${card.bg[0]},${card.bg[1]})`, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 10, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,transparent,${card.accent}80,transparent)` }} />
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>{card.bank.toUpperCase()}</div>
        <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 13, fontWeight: 700, color: "#fff" }}>{card.name}</div>
      </div>
      {/* Unlocks in badge */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>UNLOCKS IN</div>
        <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,0.55)", lineHeight: 1, letterSpacing: "-0.04em" }}>{monthsAway}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>MONTHS</div>
        <div style={{ marginTop: 6, fontFamily: "var(--font-bricolage)", fontSize: 13, fontWeight: 700, color: card.accent }}>${slot.bonusValue}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.22)" }}>net bonus</div>
      </div>
    </div>
  );
}

// ─── Earn rate mini chart ─────────────────────────────────────────────────────

function EarnRateGrid({ card, spend }: { card: any; spend: Record<string, number> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {SPEND_CATEGORIES.map(cat => {
        const rate = card.earnRate?.[cat.key] ?? 1;
        const monthlyEarn = spend[cat.key] * rate;
        const barPct = Math.min(100, (rate / 3) * 100);
        return (
          <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.28)", width: 50, flexShrink: 0 }}>{cat.label.toUpperCase().slice(0, 5)}</span>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 2, height: 3, position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${barPct}%`, background: `linear-gradient(90deg, ${cat.color}66, ${cat.color})`, borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: cat.color, width: 20, textAlign: "right", flexShrink: 0 }}>{rate}×</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.22)", width: 44, textAlign: "right", flexShrink: 0 }}>
              ${(monthlyEarn * 0.008).toFixed(0)}/mo
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HarvestPage() {
  const router = useRouter();
  const {
    selectedSequence, rankedSequences, setSelectedSequence,
    spend, reset, setStep,
  } = useOnboardingStore();

  const [hydrated, setHydrated]     = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [time, setTime]             = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState(0);
  const { checkIns, addCheckIn, totalLogged, thisWeek, loaded } = useCheckIns();

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    const u = () => setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));
    u(); const t = setInterval(u, 1000); return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (hydrated && !rankedSequences?.length) router.push("/setup");
  }, [hydrated, rankedSequences]);

  if (!hydrated || !loaded || !selectedSequence) {
    return <div style={{ minHeight: "100vh", background: NAVY }} />;
  }

  const seq = selectedSequence;
  const slot = seq.slots[activePhase];
  const card = slot.card;
  const accent = card.accent;

  const totalMonthly   = Object.values(spend).reduce((a, b) => a + b, 0);
  const monthlyNeeded  = card.minSpend / card.spendPeriod;
  const weeklyTarget   = Math.ceil(monthlyNeeded / 4.33);
  const spendPct       = totalLogged > 0 ? totalLogged / card.minSpend : 0;
  const daysInPeriod   = card.spendPeriod * 30;
  const daysLeft       = Math.max(0, daysInPeriod - checkIns.length * 7);
  const urgent         = daysLeft <= 21 && spendPct < 0.7;
  const weeksRemaining = Math.ceil(daysLeft / 7);
  const weeklyNeeded   = weeksRemaining > 0
    ? Math.ceil((card.minSpend - totalLogged) / weeksRemaining)
    : 0;
  const projectedTotal  = weeksRemaining > 0 && thisWeek !== null
    ? totalLogged + (thisWeek * weeksRemaining)
    : totalLogged;
  const willHitBonus   = projectedTotal >= card.minSpend;

  // Months away for upcoming cards
  const getMonthsAway = (i: number) => seq.slots[i].startMonth - (seq.slots[activePhase].startMonth);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const getDate = (offset: number) => {
    const d = new Date(); d.setMonth(d.getMonth() + offset);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div
      className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
      style={{
        fontFamily: "var(--font-dm)",
        background: NAVY,
        color: "#fff",
        minHeight: "100vh",
        // Subtle radial noise texture
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 20% 10%, ${accent}08 0%, transparent 60%),
          radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 44px 44px",
      }}
    >
      {/* Grain overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.35,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 24px 60px" }}>

        {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
        <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.055)", marginBottom: 0 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open"
              style={{ height: 17, filter: "brightness(0) invert(1)", opacity: 0.85 }} />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { reset(); router.push("/setup"); }}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em", transition: "all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"; }}>
              <RefreshCw size={8} /> RESTART
            </button>
          </div>
        </div>

        {/* ── PHASE TABS ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
          {seq.slots.map((s, i) => {
            const active = activePhase === i;
            return (
              <button key={i} onClick={() => setActivePhase(i)}
                style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "10px 0", borderBottom: `2px solid ${active ? s.card.accent : "rgba(255,255,255,0.07)"}`, transition: "border-color 0.3s", textAlign: "left" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: active ? s.card.accent : "rgba(255,255,255,0.22)", letterSpacing: "0.1em", marginBottom: 3 }}>
                  PHASE {i + 1} · {getDate(s.startMonth)}
                </div>
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 13, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,0.4)", transition: "color 0.3s" }}>
                  {s.card.bank} {s.card.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>

          {/* ── LEFT — The Ring ──────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp 0.5s ease both" }}>

            {/* Ring container */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
              {/* Accent top glow */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${accent}70, transparent)` }} />
              {/* Card identity */}
              <div style={{ marginBottom: 20, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.14em", marginBottom: 3 }}>
                  {card.bank.toUpperCase()} — PHASE {activePhase + 1}
                </div>
                <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
                  {card.name}
                </div>
              </div>

              <HarvestRing
                pct={spendPct}
                accent={accent}
                daysLeft={daysLeft}
                bonusValue={slot.bonusValue}
                urgent={urgent}
              />

              {/* Spend progress legend */}
              <div style={{ marginTop: 20, width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "LOGGED",     val: `$${totalLogged.toLocaleString()}`,    color: accent },
                  { label: "TARGET",     val: `$${card.minSpend.toLocaleString()}`,  color: "rgba(255,255,255,0.45)" },
                  { label: "REMAINING",  val: `$${Math.max(0, card.minSpend - totalLogged).toLocaleString()}`, color: urgent ? "#f87171" : "rgba(255,255,255,0.6)" },
                  { label: "NET BONUS",  val: `$${slot.bonusValue}`,                 color: YELLOW },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.24)", letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 15, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Urgency warning */}
              {urgent && (
                <div style={{ marginTop: 14, width: "100%", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <AlertTriangle size={12} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#f87171", lineHeight: 1.6 }}>
                    At current pace you'll miss the bonus window. Need ${weeklyNeeded.toLocaleString()}/wk.
                  </div>
                </div>
              )}

              {/* Log spend CTA */}
              <button onClick={() => setShowModal(true)}
                style={{ marginTop: 16, width: "100%", background: YELLOW, color: NAVY, border: "none", borderRadius: 12, padding: "14px 0", fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.02em", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 32px rgba(242,201,76,0.3)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
                {thisWeek !== null ? `Update this week · $${thisWeek.toLocaleString()}` : "Log this week's spend"}
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Weekly pace */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 20px", animation: "fadeUp 0.5s ease 0.1s both" }}>
              <PaceBar weeklyTarget={weeklyTarget} weeklyActual={thisWeek} accent={accent} />
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.24)", letterSpacing: "0.1em", marginBottom: 2 }}>WEEKS CHECKED IN</div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: "#fff" }}>{checkIns.length}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.24)", letterSpacing: "0.1em", marginBottom: 2 }}>PROJECTION</div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: willHitBonus ? "#4ade80" : "#f97316" }}>
                    {willHitBonus ? "On track" : "Behind"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT — Details ──────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Milestones */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px 24px", animation: "fadeUp 0.5s ease 0.05s both" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.26)", letterSpacing: "0.12em", marginBottom: 20 }}>PHASE {activePhase + 1} MILESTONES</div>
              {[
                {
                  label: "Apply & activate",
                  date: getDate(slot.startMonth),
                  detail: `${card.bank} ${card.name} — ${card.network} · $${card.annualFee} annual fee`,
                  color: accent, done: true,
                },
                {
                  label: `Hit $${card.minSpend.toLocaleString()} min spend`,
                  date: getDate(slot.startMonth + card.spendPeriod),
                  detail: `$${Math.ceil(monthlyNeeded).toLocaleString()}/mo needed · ${slot.feasible ? `~${slot.weeksToBonus}wk at current pace` : "Increase spend to qualify"}`,
                  color: slot.feasible ? "#4ade80" : "#f97316", done: spendPct >= 1,
                },
                {
                  label: `${(card.bonus / 1000).toFixed(0)}K bonus points land`,
                  date: getDate(slot.bonusMonth),
                  detail: `${card.bonus.toLocaleString()} pts added to ${card.rewardProgram} — worth ~$${card.bonusValue}`,
                  color: YELLOW, done: false,
                },
                {
                  label: "Close before annual fee",
                  date: getDate(slot.startMonth + 11),
                  detail: `Close 30 days before month ${slot.startMonth + 12} to avoid $${card.annualFee} renewal`,
                  color: "#f87171", done: false,
                },
              ].map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: i < 3 ? 18 : 0, position: "relative" }}>
                  {/* Connector line */}
                  {i < 3 && <div style={{ position: "absolute", left: 10, top: 22, bottom: -18, width: 1, background: "rgba(255,255,255,0.06)" }} />}
                  {/* Node */}
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: ev.done ? ev.color : `${ev.color}18`, border: `1.5px solid ${ev.done ? ev.color : ev.color + "50"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: ev.done ? `0 0 12px ${ev.color}40` : "none", transition: "all 0.4s" }}>
                    {ev.done
                      ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: NAVY }} />
                      : <div style={{ width: 4, height: 4, borderRadius: "50%", background: ev.color, opacity: 0.6 }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-bricolage)", fontSize: 15, fontWeight: 700, color: ev.done ? "#fff" : "rgba(255,255,255,0.7)" }}>{ev.label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.26)", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "2px 7px" }}>{ev.date}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", lineHeight: 1.6 }}>{ev.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Earn rates + monthly value */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "22px 24px", animation: "fadeUp 0.5s ease 0.1s both" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.26)", letterSpacing: "0.12em" }}>
                  EARN RATES — {card.bank.toUpperCase()}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.24)", letterSpacing: "0.1em", marginBottom: 2 }}>ONGOING MONTHLY VALUE</div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: accent }}>
                    ${Math.round(Object.entries(spend).reduce((sum, [k, v]) => sum + v * (card.earnRate?.[k] ?? 1) * 0.008, 0)).toLocaleString()}
                    <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.3)", marginLeft: 3 }}>/mo</span>
                  </div>
                </div>
              </div>
              <EarnRateGrid card={card} spend={spend} />
            </div>

            {/* Upcoming cards in sequence */}
            {seq.slots.length > 1 && (
              <div style={{ animation: "fadeUp 0.5s ease 0.15s both" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.26)", letterSpacing: "0.12em", marginBottom: 12 }}>
                  NEXT IN SEQUENCE
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${seq.slots.length - 1}, 1fr)`, gap: 10 }}>
                  {seq.slots.filter((_, i) => i > activePhase).map((s, i) => (
                    <UpcomingCard
                      key={s.card.id}
                      slot={s}
                      index={activePhase + i + 2}
                      monthsAway={getMonthsAway(activePhase + i + 1)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Apply CTA */}
            <div style={{ background: `linear-gradient(135deg, ${card.bg[0]}, ${card.bg[1]})`, border: `1px solid ${accent}28`, borderRadius: 20, padding: "22px 24px", position: "relative", overflow: "hidden", animation: "fadeUp 0.5s ease 0.2s both" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.03) 50%, transparent 70%)" }} />
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 4 }}>READY TO APPLY?</div>
                  <div style={{ fontFamily: "var(--font-bricolage)", fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
                    {card.bank} {card.name}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
                    ${card.bonusValue} bonus · ${card.annualFee} fee · {card.network}
                  </div>
                </div>
                <a href="https://openloans.com.au" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ background: YELLOW, color: NAVY, border: "none", borderRadius: 12, padding: "12px 24px", fontFamily: "var(--font-bricolage)", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, letterSpacing: "-0.02em", transition: "all 0.2s", whiteSpace: "nowrap" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 28px rgba(242,201,76,0.3)`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
                    Apply via Open <ExternalLink size={13} />
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Check-in modal */}
      {showModal && (
        <CheckInModal
          onClose={() => setShowModal(false)}
          onSubmit={addCheckIn}
          weeklyTarget={weeklyTarget}
          accent={accent}
        />
      )}

      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
        html { scroll-behavior:smooth }
        body { background:${NAVY}; -webkit-font-smoothing:antialiased }
        @keyframes livePulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.75)} }
        @keyframes urgentPulse{ 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes ringPulse  { 0%,100%{opacity:0.12} 50%{opacity:0.22} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes modalIn    { from{opacity:0;transform:scale(0.94) translateY(8px)} to{opacity:1;transform:none} }
        input[type=number]    { -moz-appearance:textfield }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none }
        input:focus { border-color:${YELLOW}88 !important; box-shadow:0 0 0 3px ${YELLOW}14 !important; }
        ::-webkit-scrollbar       { width:4px; height:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px }
      `}</style>
    </div>
  );
}