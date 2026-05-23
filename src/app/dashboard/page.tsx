"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from "recharts";
import { Check, RefreshCw, ChevronRight, Target, Zap, TrendingUp, Award, ArrowUpRight } from "lucide-react";
import { useOnboardingStore } from "../../stores/onboarding.store";
import { projectPointsTimeline, generateRationale } from "../../lib/scoring";
import { SPEND_CATEGORIES } from "../../lib/cards";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-bricolage" });
const dmMono    = DM_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono" });
const dmSans    = DM_Sans({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-dm" });

const NAVY   = "#0D1B2A";
const NAVY_2 = "#132030";
const YELLOW = "#F2C94C";

// ─── Credit score projection ──────────────────────────────────────────────────
function projectCreditScore(spendPeriod: number) {
  const base = 720;
  const data = [
    { month: 0,               score: base,      event: "Today" },
    { month: 1,               score: base - 8,  event: "Application" },
    { month: 2,               score: base - 5,  event: null },
    { month: 3,               score: base - 2,  event: null },
    { month: spendPeriod + 1, score: base + 5,  event: "Bonus earned" },
    { month: 7,               score: base + 10, event: null },
    { month: 10,              score: base + 13, event: null },
    { month: 11,              score: base + 8,  event: "Card closed" },
    { month: 12,              score: base + 1,  event: "New inquiry" },
    { month: 15,              score: base + 9,  event: null },
    { month: 18,              score: base + 16, event: null },
    { month: 24,              score: base + 22, event: "Net gain" },
  ];
  return data;
}

// ─── Animated number ──────────────────────────────────────────────────────────
function AnimNum({ value, prefix="", suffix="" }: { value: number; prefix?: string; suffix?: string }) {
  const [disp, setDisp] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current, end = value, dur = 900, t0 = performance.now();
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

// ─── Chart tooltips ───────────────────────────────────────────────────────────
function ValueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(13,27,42,0.97)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontFamily:"var(--font-mono)" }}>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.32)", marginBottom:4 }}>MONTH {label}</div>
      <div style={{ fontSize:14, fontWeight:700, color:YELLOW }}>${payload[0]?.value?.toLocaleString()}</div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.32)", marginTop:2 }}>{payload[0]?.payload?.points?.toLocaleString()} pts</div>
    </div>
  );
}

function ScoreTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background:"rgba(13,27,42,0.97)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontFamily:"var(--font-mono)" }}>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.32)", marginBottom:4 }}>MONTH {label}</div>
      <div style={{ fontSize:14, fontWeight:700, color:"#a78bfa" }}>{payload[0]?.value}</div>
      {d?.event && <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:3 }}>{d.event}</div>}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent = YELLOW }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"20px 18px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <div style={{ color: accent, opacity:0.75 }}>{icon}</div>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em" }}>{label}</span>
      </div>
      <div style={{ fontFamily:"var(--font-bricolage)", fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-0.03em", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.26)", marginTop:6 }}>{sub}</div>}
    </div>
  );
}

// ─── Progress ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, size=80, stroke=5, color=YELLOW, children }: { pct:number; size?:number; stroke?:number; color?:string; children?:React.ReactNode }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>{children}</div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { rankedCards, selectedCard, spend, goal, cardHistory, setStep, reset } = useOnboardingStore();
  const [time, setTime] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => { setIsHydrated(true); }, []);

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("en-AU", { hour:"2-digit", minute:"2-digit", second:"2-digit" }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (rankedCards.length === 0) { router.push("/setup"); }
  }, [isHydrated, rankedCards, router]);

  if (!isHydrated || !rankedCards.length || !selectedCard) {
    return <div style={{ minHeight:"100vh", background:NAVY }} />;
  }

  const top = rankedCards[0];
  const card = top.card;
  const bd = top.breakdown;
  const chartData = projectPointsTimeline(card, spend, 24);
  const creditData = projectCreditScore(card.spendPeriod);

  const spendTotal = Object.values(spend).reduce((a, b) => a + b, 0);
  const monthsNeeded = card.minSpend / spendTotal;
  const weeksNeeded = Math.ceil(monthsNeeded * 4.33);
  const spendPct = Math.min(100, (spendTotal / (card.minSpend / card.spendPeriod)) * 100);
  const goalPct = goal ? Math.min(100, (card.bonus / goal.pointsRequired) * 100) : 0;
  const today = new Date().toLocaleDateString("en-AU", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  const baseScore = 720;
  const netScoreChange = creditData[creditData.length - 1].score - baseScore;

  const handleUpdateProfile = () => {
    reset();           // clears rankedCards + resets step to "welcome"
    router.push("/setup");
  };

  return (
    <div className={`${bricolage.variable} ${dmMono.variable} ${dmSans.variable}`}
      style={{ fontFamily:"var(--font-dm)", background:NAVY, color:"#fff", minHeight:"100vh" }}>

      {/* TOP BAR */}
      <div style={{ position:"sticky", top:0, zIndex:100, height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", background:"rgba(13,27,42,0.92)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.055)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <a href="/" style={{ textDecoration:"none" }}>
            <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height:18, filter:"brightness(0) invert(1)", opacity:0.85 }} />
          </a>
          <div style={{ width:1, height:20, background:"rgba(255,255,255,0.09)" }} />
          <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em" }}>DASHBOARD</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, background:"#4ade80", borderRadius:"50%", animation:"pulse 2s infinite", display:"inline-block" }} />
            <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.22)", letterSpacing:"0.08em" }}>LIVE</span>
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"rgba(255,255,255,0.18)", letterSpacing:"0.06em" }}>{time}</div>
          <button onClick={() => { reset(); router.push("/setup"); }}
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"6px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.32)", letterSpacing:"0.06em", transition:"all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; }}
          >
            <RefreshCw size={11} /> RESET
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"32px 32px 80px" }}>

        {/* Welcome header */}
        <div style={{ marginBottom:32, display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:8 }}>{today.toUpperCase()}</div>
            <h1 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(24px,3vw,40px)", fontWeight:800, letterSpacing:"-0.035em", lineHeight:1, color:"#fff" }}>
              Your rewards<br /><span style={{ color:YELLOW }}>flight deck.</span>
            </h1>
          </div>
          <button onClick={handleUpdateProfile}
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"10px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontFamily:"var(--font-mono)", fontSize:11, color:"rgba(255,255,255,0.42)", letterSpacing:"0.06em", transition:"all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.18)"; (e.currentTarget as HTMLElement).style.color="#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.42)"; }}
          >
            UPDATE PROFILE <RefreshCw size={12} />
          </button>
        </div>

        {/* ROW 1: Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
          <StatCard icon={<Award size={16} />}     label="SIGN-UP BONUS"  value={<AnimNum value={card.bonus} suffix=" pts" />}          sub={`≈ $${card.bonusValue} value`} />
          <StatCard icon={<TrendingUp size={16} />} label="NET VALUE"      value={<><AnimNum prefix="$" value={bd.netBonusValue} /></>}  sub={`after $${card.annualFee} fee`} />
          <StatCard icon={<Zap size={16} />}        label="MONTHLY EARN"   value={<><AnimNum value={bd.monthlyEarnEstimate} suffix=" pts" /></>} sub="ongoing earn rate" />
          <StatCard icon={<Target size={16} />}     label="MATCH SCORE"    value={<><AnimNum value={bd.total} suffix="/1000" /></>}      sub="9-factor composite" />
        </div>

        {/* ROW 2: Card + Chart */}
        <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:14, marginBottom:20 }}>

          {/* Card panel */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:20 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:14 }}>CURRENT TARGET</div>
              <div style={{ width:"100%", aspectRatio:"1.6/1", borderRadius:12, background:`linear-gradient(135deg,${card.bg[0]},${card.bg[1]})`, padding:"16px 18px", display:"flex", flexDirection:"column", justifyContent:"space-between", boxShadow:`0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)`, position:"relative", overflow:"hidden", marginBottom:16 }}>
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(105deg,transparent 20%,rgba(255,255,255,0.04) 50%,transparent 80%)", animation:"shimmer 6s ease-in-out infinite" }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative", zIndex:1 }}>
                  <div>
                    <div style={{ fontSize:8, color:"rgba(255,255,255,0.28)", fontFamily:"var(--font-mono)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:2 }}>{card.bank}</div>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:13, fontWeight:700, color:"#fff" }}>{card.name}</div>
                  </div>
                  <div style={{ width:32, height:24, background:"linear-gradient(135deg,#c8982a,#f0c060,#b07820)", borderRadius:4, border:"1px solid rgba(255,255,255,0.15)" }} />
                </div>
                <div style={{ fontFamily:"monospace", fontSize:11, letterSpacing:"0.2em", color:"rgba(255,255,255,0.32)", position:"relative", zIndex:1 }}>•••• •••• •••• 4821</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", position:"relative", zIndex:1 }}>
                  <div>
                    <div style={{ fontSize:7, color:"rgba(255,255,255,0.24)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:1 }}>Expires</div>
                    <div style={{ fontFamily:"monospace", fontSize:11, color:"rgba(255,255,255,0.52)" }}>08/28</div>
                  </div>
                  <div style={{ textAlign:"right", background:`rgba(255,255,255,0.05)`, border:`1px solid ${card.accent}33`, borderRadius:6, padding:"5px 8px" }}>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:15, fontWeight:800, color:card.accent, lineHeight:1 }}>{(card.bonus/1000).toFixed(0)}K</div>
                    <div style={{ fontSize:7, color:"rgba(255,255,255,0.28)", marginTop:1 }}>BONUS PTS</div>
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[
                  { l:"Min. Spend", v:`$${card.minSpend.toLocaleString()}`, s:`in ${card.spendPeriod} months` },
                  { l:"Annual Fee", v:`$${card.annualFee}`, s:"p.a." },
                  { l:"Transfer Partners", v:card.transferPartners.length+"", s:"programs" },
                  { l:"Reward Program", v:card.rewardProgram.split(" ")[0], s:card.rewardProgram.split(" ").slice(1).join(" ") },
                ].map((m) => (
                  <div key={m.l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"9px 10px" }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:8, color:"rgba(255,255,255,0.22)", letterSpacing:"0.1em", marginBottom:3 }}>{m.l.toUpperCase()}</div>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.82)" }}>{m.v}</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:8, color:"rgba(255,255,255,0.18)" }}>{m.s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:"rgba(242,201,76,0.04)", border:"1px solid rgba(242,201,76,0.13)", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:YELLOW, letterSpacing:"0.12em", marginBottom:8 }}>WHY THIS CARD</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.65 }}>{generateRationale(top, spend)}</div>
            </div>
          </div>

          {/* Value chart */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:24, display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:6 }}>PROJECTED VALUE — 24 MONTHS</div>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-0.03em" }}>
                  $<AnimNum value={chartData[24]?.value ?? 0} />
                  <span style={{ fontSize:13, fontWeight:400, color:"rgba(255,255,255,0.28)", marginLeft:6 }}>total value</span>
                </div>
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.18)", textAlign:"right" }}>
                <div>Ongoing earn: {bd.monthlyEarnEstimate.toLocaleString()} pts/mo</div>
                <div style={{ marginTop:2 }}>vs debit: $0 / year</div>
              </div>
            </div>
            <div style={{ flex:1, minHeight:200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top:4, right:4, bottom:4, left:4 }}>
                  <defs>
                    <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={YELLOW} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={YELLOW} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontFamily:"var(--font-mono)", fontSize:9, fill:"rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `M${v}`} />
                  <YAxis tick={{ fontFamily:"var(--font-mono)", fontSize:9, fill:"rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<ValueTooltip />} />
                  <ReferenceLine x={card.spendPeriod} stroke="rgba(242,201,76,0.28)" strokeDasharray="3 3" label={{ value:"Bonus", fill:"rgba(242,201,76,0.45)", fontSize:9, fontFamily:"var(--font-mono)" }} />
                  <Area type="monotone" dataKey="value" stroke={YELLOW} strokeWidth={2} fill="url(#valueGrad)" dot={false} activeDot={{ fill:YELLOW, r:4, strokeWidth:0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ROW 3: Spend + Goal + Factors */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }}>

          {/* Spend velocity */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:16 }}>SPEND VELOCITY</div>
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
              <ProgressRing pct={spendPct} size={72} color={spendPct >= 100 ? "#4ade80" : YELLOW}>
                <span style={{ fontFamily:"var(--font-bricolage)", fontSize:12, fontWeight:800, color: spendPct >= 100 ? "#4ade80" : YELLOW }}>{Math.round(spendPct)}%</span>
              </ProgressRing>
              <div>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:18, fontWeight:800, color:"#fff" }}>{bd.feasible ? `~${weeksNeeded}wk` : "Tight"}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", marginTop:2 }}>to hit min spend</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.18)", marginTop:4 }}>${spendTotal.toLocaleString()}/mo current</div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {SPEND_CATEGORIES.slice(0,3).map((cat) => {
                const pct = Math.min(100, ((spend[cat.key] ?? 0) / cat.max) * 100);
                return (
                  <div key={cat.key}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.28)", letterSpacing:"0.06em" }}>{cat.label.toUpperCase()}</span>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.38)" }}>${(spend[cat.key]??0).toLocaleString()}</span>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:100, height:3 }}>
                      <div style={{ height:"100%", background:cat.color, width:`${pct}%`, borderRadius:100, opacity:0.65 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Goal tracker */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:16 }}>GOAL TRACKER</div>
            {goal ? (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                  <ProgressRing pct={goalPct} size={72} color="#60a5fa">
                    <span style={{ fontFamily:"var(--font-bricolage)", fontSize:11, fontWeight:800, color:"#60a5fa" }}>{Math.round(goalPct)}%</span>
                  </ProgressRing>
                  <div>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:15, fontWeight:700, color:"#fff", marginBottom:3 }}>{goal.label}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.36)" }}>{goal.description}</div>
                  </div>
                </div>
                <div style={{ background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.14)", borderRadius:8, padding:"10px 12px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.26)" }}>THIS CARD EARNS</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.26)" }}>GOAL NEEDS</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:20, fontWeight:800, color:"#60a5fa" }}>{(card.bonus/1000).toFixed(0)}K</div>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:20, fontWeight:800, color:"rgba(255,255,255,0.35)" }}>{(goal.pointsRequired/1000).toFixed(0)}K</div>
                  </div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.22)", marginTop:4 }}>
                    {goalPct >= 100 ? "One card gets you there" : `Need ~${Math.ceil(goal.pointsRequired/card.bonus)} card cycles`}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <Target size={28} color="rgba(255,255,255,0.12)" style={{ marginBottom:12 }} />
                <div style={{ fontFamily:"var(--font-dm)", fontSize:13, color:"rgba(255,255,255,0.28)", marginBottom:12 }}>No goal set</div>
                <button onClick={handleUpdateProfile} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:6, padding:"8px 14px", cursor:"pointer", fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.38)", letterSpacing:"0.06em" }}>
                  Set a goal
                </button>
              </div>
            )}
          </div>

          {/* Score factors */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:16 }}>MATCH FACTORS</div>
            {[
              { label:"Reward Yield",   val: bd.rewardYield },
              { label:"Velocity Fit",   val: bd.velocityFit },
              { label:"Category Match", val: bd.categoryOptimization },
              { label:"Fee Efficiency", val: bd.annualFeeDecay },
              { label:"Goal Alignment", val: bd.goalAlignment },
            ].map(({ label, val }) => (
              <div key={label} style={{ marginBottom:9 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.32)", letterSpacing:"0.06em" }}>{label.toUpperCase()}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color: val > 60 ? YELLOW : "rgba(255,255,255,0.32)" }}>{Math.round(val)}</span>
                </div>
                <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:100, height:3 }}>
                  <div style={{ height:"100%", background: val > 70 ? YELLOW : val > 40 ? "rgba(242,201,76,0.55)" : "rgba(242,201,76,0.22)", width:`${val}%`, borderRadius:100, transition:"width 1s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 4: Credit Score Impact */}
        <div style={{ marginBottom:20 }}>
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:6 }}>CREDIT SCORE IMPACT — 24 MONTHS</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:14 }}>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-0.03em" }}>
                    {baseScore} <span style={{ fontSize:14, color:"rgba(255,255,255,0.28)", fontWeight:400 }}>today</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ fontFamily:"var(--font-bricolage)", fontSize:20, fontWeight:800, color:"#4ade80" }}>+{netScoreChange}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)" }}>projected at 24mo</span>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:20 }}>
                {[
                  { dot:"#f87171", label:"Application dip" },
                  { dot:"#4ade80", label:"Recovery & growth" },
                  { dot:"#a78bfa", label:"Credit score" },
                ].map(({ dot, label }) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:dot, flexShrink:0 }} />
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.3)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height:180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={creditData} margin={{ top:8, right:12, bottom:4, left:4 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#4ade80" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontFamily:"var(--font-mono)", fontSize:9, fill:"rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `M${v}`} />
                  <YAxis domain={[680, 760]} tick={{ fontFamily:"var(--font-mono)", fontSize:9, fill:"rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ScoreTooltip />} />
                  {/* Baseline */}
                  <ReferenceLine y={baseScore} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                  {/* Events */}
                  {creditData.filter(d => d.event).map((d) => (
                    <ReferenceDot key={d.month} x={d.month} y={d.score}
                      r={4}
                      fill={d.score < baseScore ? "#f87171" : d.score > baseScore ? "#4ade80" : "#a78bfa"}
                      stroke="rgba(13,27,42,0.8)" strokeWidth={2}
                    />
                  ))}
                  <Line type="monotone" dataKey="score" stroke="url(#scoreGrad)" strokeWidth={2} dot={false} activeDot={{ fill:"#a78bfa", r:4, strokeWidth:0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Event annotations */}
            <div style={{ display:"flex", gap:8, marginTop:16, flexWrap:"wrap" }}>
              {creditData.filter(d => d.event).map((d) => (
                <div key={d.month} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:6, padding:"5px 10px" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.3)" }}>M{d.month}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color: d.score < baseScore ? "#f87171" : "#4ade80" }}>
                    {d.score - baseScore >= 0 ? "+" : ""}{d.score - baseScore}
                  </div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.4)" }}>{d.event}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop:14, padding:"10px 14px", background:"rgba(74,222,128,0.05)", border:"1px solid rgba(74,222,128,0.12)", borderRadius:8, fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.4)", lineHeight:1.7 }}>
              Responsible card cycling — applying, paying on time, and closing before the fee — typically produces a net positive credit score outcome over 24 months. The initial hard inquiry dip of ~8 points recovers within 3–4 months of on-time payments.
            </div>
          </div>
        </div>

        {/* ROW 5: Alternatives + Transfer partners */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

          {/* Alternative cards */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em" }}>RANKED ALTERNATIVES</div>
              <button onClick={handleUpdateProfile} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:4 }}>
                RERUN <RefreshCw size={10} />
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {rankedCards.map(({ card: c, breakdown: b }, i) => (
                <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, background:i===0?"rgba(242,201,76,0.05)":"rgba(255,255,255,0.02)", border:`1px solid ${i===0?"rgba(242,201,76,0.18)":"rgba(255,255,255,0.05)"}` }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:11, fontWeight:500, color:i===0?YELLOW:"rgba(255,255,255,0.22)", width:16, textAlign:"center" }}>{String(i+1).padStart(2,"0")}</div>
                  <div style={{ width:28, height:18, borderRadius:3, background:`linear-gradient(135deg,${c.bg[0]},${c.bg[1]})`, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"var(--font-dm)", fontSize:12, fontWeight:600, color:i===0?"#fff":"rgba(255,255,255,0.5)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.bank} {c.name}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:14, fontWeight:800, color:c.accent }}>{(c.bonus/1000).toFixed(0)}K</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.2)" }}>{b.total}/1000</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer partners + CTA */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:20, flex:1 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.28)", letterSpacing:"0.1em", marginBottom:14 }}>TRANSFER PARTNERS</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {card.transferPartners.map((p) => (
                  <div key={p} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:28, height:28, borderRadius:6, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>
                        {p.includes("Qantas")?"✈":p.includes("Velocity")?"⚡":p.includes("Marriott")?"🏨":p.includes("Singapore")?"🌟":"🔁"}
                      </div>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>{p}</span>
                    </div>
                    <ArrowUpRight size={13} color="rgba(255,255,255,0.18)" />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:`linear-gradient(135deg,${card.bg[0]},${card.bg[1]})`, border:"1px solid rgba(255,255,255,0.09)", borderRadius:14, padding:20, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:`radial-gradient(circle,${card.accent}18,transparent 70%)` }} />
              <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.32)", letterSpacing:"0.1em", marginBottom:8 }}>READY TO APPLY?</div>
              <div style={{ fontFamily:"var(--font-bricolage)", fontSize:17, fontWeight:800, color:"#fff", marginBottom:4, letterSpacing:"-0.02em" }}>{card.bank} {card.name}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.38)", marginBottom:16 }}>Application via Open — Licensed Mortgage Broker</div>
              <a href="https://openloans.com.au" target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                <button style={{ background:YELLOW, color:NAVY, border:"none", borderRadius:8, padding:"12px 24px", fontFamily:"var(--font-bricolage)", fontSize:14, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:8, width:"100%", justifyContent:"center" }}>
                  Talk to Open about applying <ChevronRight size={15} />
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop:40, paddingTop:24, borderTop:"1px solid rgba(255,255,255,0.05)", fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(255,255,255,0.13)", lineHeight:1.8, textAlign:"center" }}>
          General information only. Not financial advice. Card offers subject to change — verify directly with the issuer. Always read the Product Disclosure Statement before applying. Open Home Loans Pty Ltd | Australian Credit Licence.
        </div>
      </div>

      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
        body { background:${NAVY}; -webkit-font-smoothing:antialiased }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.85)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background:${NAVY} }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.07); border-radius:2px }
      `}</style>
    </div>
  );
}