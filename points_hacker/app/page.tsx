"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import AntigravityGPGPU from "./components/AntigravityGPGPU";
import { ArrowRight, Sparkles, TrendingUp, Shield } from "lucide-react";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400","600","700","800"], variable: "--font-bricolage" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-dm" });

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const NAVY   = "#0D1B2A";
const YELLOW = "#F2C94C";

const CARDS = [
  { bank: "American Express", name: "Platinum Edge",        points: "100,000", value: "$800", minSpend: "$3,000", period: "3 months", fee: "$195", network: "AMEX", accent: "#F2C94C", bg: ["#1a3350","#0f2236"] },
  { bank: "ANZ",              name: "Frequent Flyer Black", points: "80,000",  value: "$640", minSpend: "$2,500", period: "3 months", fee: "$425", network: "VISA", accent: "#60A5FA", bg: ["#1c2b4a","#121e35"] },
  { bank: "Westpac",          name: "Altitude Black",       points: "150,000", value: "$750", minSpend: "$4,000", period: "4 months", fee: "$250", network: "MC",   accent: "#F97316", bg: ["#2a1a0f","#1a0f07"] },
  { bank: "NAB",              name: "Qantas Rewards Sig.",  points: "90,000",  value: "$720", minSpend: "$3,000", period: "3 months", fee: "$395", network: "VISA", accent: "#A78BFA", bg: ["#1a1040","#0d0a28"] },
];

const ACT_TINTS = [
  "rgba(26,51,80,0)",
  "rgba(248,113,113,0.06)",
  "rgba(249,115,22,0.07)",
  "rgba(96,165,250,0.06)",
  "rgba(167,139,250,0.07)",
  "rgba(242,201,76,0.08)",
];

// ─── Credit Card ─────────────────────────────────────────────────────────────
function CreditCard({ card, swapping, flipRef }: {
  card: typeof CARDS[0];
  swapping?: boolean;
  flipRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [flipped, setFlipped] = useState(false);
  const userFlipRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setFlipped(false); }, [card]);

  // Apply click-flip via direct style so GSAP tilt on flipRef doesn't interfere
  useEffect(() => {
    if (!userFlipRef.current) return;
    userFlipRef.current.style.transform = flipped ? "rotateY(180deg)" : "rotateY(0deg)";
  }, [flipped]);

  return (
    <div
      onClick={() => setFlipped(f => !f)}
      style={{ width: "340px", height: "210px", perspective: "1200px", cursor: "pointer" }}
    >
      {/* GSAP owns this layer: subtle scroll-driven tilts only (no full 180° flips) */}
      <div
        ref={flipRef}
        style={{
          position: "relative", width: "100%", height: "100%",
          transformStyle: "preserve-3d",
        }}
      >
        {/* User click-flip layer: CSS transition for smooth flip both ways */}
        <div
          ref={userFlipRef}
          style={{
            position: "relative", width: "100%", height: "100%",
            transformStyle: "preserve-3d",
            transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)",
            transform: "rotateY(0deg)",
            willChange: "transform",
          }}
        >
          {/* FRONT */}
          <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", borderRadius:"16px", background:`linear-gradient(135deg, ${card.bg[0]} 0%, ${card.bg[1]} 100%)`, padding:"24px 28px", display:"flex", flexDirection:"column", justifyContent:"space-between", boxShadow:`0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.09), inset 0 1px 0 rgba(255,255,255,0.14)`, overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"16px", pointerEvents:"none", background:"linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.065) 50%, transparent 80%)", animation:"shimmer 5s ease-in-out infinite" }} />
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", borderRadius:"16px 16px 0 0", background:`linear-gradient(90deg, transparent, ${card.accent}60, transparent)`, transition:"background 0.8s" }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative", zIndex:1 }}>
              <div>
                <div style={{ fontSize:"10px", fontWeight:700, color:"rgba(255,255,255,0.32)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:"2px" }}>{card.bank}</div>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"15px", fontWeight:700, color:"#fff" }}>{card.name}</div>
              </div>
              <div style={{ width:"40px", height:"30px", background:"linear-gradient(135deg, #c8982a 0%, #f0c060 40%, #b07820 60%, #e0a830 100%)", borderRadius:"5px", border:"1px solid rgba(255,255,255,0.18)", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:"50%", left:0, right:0, height:"1px", background:"rgba(0,0,0,0.2)" }} />
                <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:"1px", background:"rgba(0,0,0,0.2)" }} />
              </div>
            </div>
            <div style={{ fontFamily:"monospace", fontSize:"14px", letterSpacing:"0.22em", color:"rgba(255,255,255,0.45)", position:"relative", zIndex:1 }}>•••• •••• •••• 4821</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", position:"relative", zIndex:1 }}>
              <div>
                <div style={{ fontSize:"8px", color:"rgba(255,255,255,0.28)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"2px" }}>Expires</div>
                <div style={{ fontSize:"13px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:"monospace" }}>08/28</div>
              </div>
              <div style={{ borderRadius:"8px", padding:"6px 10px", textAlign:"right", background:"rgba(255,255,255,0.05)", border:`1px solid ${card.accent}38`, transition:"border-color 0.8s, background 0.8s" }}>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"18px", fontWeight:800, color:card.accent, lineHeight:1, transition:"color 0.8s" }}>{card.points}</div>
                <div style={{ fontSize:"8px", color:"rgba(255,255,255,0.3)", marginTop:"1px" }}>bonus pts</div>
              </div>
              <NetworkBadge network={card.network} />
            </div>
          </div>
          {/* BACK */}
          <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", transform:"rotateY(180deg)", borderRadius:"16px", background:`linear-gradient(135deg, ${card.bg[1]} 0%, ${card.bg[0]} 100%)`, overflow:"hidden", boxShadow:`0 24px 64px rgba(0,0,0,0.6)` }}>
            <div style={{ position:"absolute", top:"40px", left:0, right:0, height:"44px", background:"rgba(0,0,0,0.65)" }} />
            <div style={{ position:"absolute", top:"96px", left:"20px", right:"20px" }}>
              <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"6px", padding:"10px 14px", marginBottom:"10px" }}>
                <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>Net bonus value</div>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"26px", fontWeight:800, color:card.accent, transition:"color 0.8s" }}>{card.value}</div>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.32)", marginTop:"2px" }}>after {card.fee} annual fee</div>
              </div>
              <div style={{ display:"flex", gap:"8px" }}>
                {([["Min. spend", card.minSpend, `in ${card.period}`], ["Annual fee", card.fee, "per year"]] as [string,string,string][]).map(([label,val,sub]) => (
                  <div key={label} style={{ flex:1, background:"rgba(255,255,255,0.04)", borderRadius:"6px", padding:"8px 10px" }}>
                    <div style={{ fontSize:"8px", color:"rgba(255,255,255,0.26)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"2px" }}>{label}</div>
                    <div style={{ fontSize:"13px", fontWeight:700, color:"#fff" }}>{val}</div>
                    <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.26)" }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position:"absolute", bottom:"14px", left:0, right:0, textAlign:"center", fontSize:"9px", color:"rgba(255,255,255,0.15)" }}>Tap to flip back</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NetworkBadge({ network }: { network: string }) {
  if (network==="VISA") return <div style={{ fontFamily:"Georgia, serif", fontSize:"17px", fontWeight:900, color:"rgba(255,255,255,0.6)", fontStyle:"italic" }}>VISA</div>;
  if (network==="MC")   return <div style={{ display:"flex" }}><div style={{ width:"20px", height:"20px", borderRadius:"50%", background:"rgba(235,85,50,0.8)" }} /><div style={{ width:"20px", height:"20px", borderRadius:"50%", background:"rgba(255,185,0,0.8)", marginLeft:"-8px" }} /></div>;
  return <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"12px", fontWeight:800, color:"rgba(255,255,255,0.55)", letterSpacing:"0.06em" }}>AMEX</div>;
}

function Counter({ target, prefix="", suffix="" }: { target:number; prefix?:string; suffix?:string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el=ref.current; if(!el) return;
    const obs=new IntersectionObserver(([e]) => {
      if(e.isIntersecting && !started.current){ started.current=true; const t0=performance.now(); const tick=(now:number)=>{ const p=Math.min((now-t0)/2000,1); setValue(Math.round((1-Math.pow(1-p,4))*target)); if(p<1)requestAnimationFrame(tick); }; requestAnimationFrame(tick); obs.disconnect(); }
    }, { threshold:0.5 });
    obs.observe(el); return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{value.toLocaleString()}{suffix}</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PointsHackerLanding() {
  const wrapRef   = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const cardRef   = useRef<HTMLDivElement | null>(null);
  const cardFlipRef = useRef<HTMLDivElement | null>(null);
  const navRef    = useRef<HTMLElement>(null);
  const bgTintRef = useRef<HTMLDivElement>(null);
  const [cardIdx, setCardIdx]   = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [mouse, setMouse]       = useState({ x:0, y:0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x:(e.clientX/window.innerWidth-0.5)*2, y:(e.clientY/window.innerHeight-0.5)*2 });
    window.addEventListener("mousemove", h, { passive:true });
    return () => window.removeEventListener("mousemove", h);
  }, []);

  const swapCard = (idx: number) => {
    if (!cardRef.current) { setCardIdx(idx); return; }
    gsap.to(cardRef.current, {
      opacity: 0, duration: 0.18, ease: "power2.in",
      onComplete: () => {
        setCardIdx(idx);
        gsap.to(cardRef.current, { opacity: 1, duration: 0.22, ease: "power2.out" });
      }
    });
  };

  useEffect(() => {
    if (typeof window==="undefined") return;
    if (isMobile) return;
    let lenis: any;

    const init = async () => {
      const { default: Lenis } = await import("lenis");
      lenis = new Lenis({ duration:1.4, easing:(t:number)=>Math.min(1, 1.001-Math.pow(2,-10*t)), smoothWheel:true });
      const raf = (time:number) => { lenis.raf(time); ScrollTrigger.update(); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.lagSmoothing(0);

      ScrollTrigger.create({
        trigger: wrapRef.current, start:"top -60px",
        onEnter:     () => gsap.to(navRef.current, { backgroundColor:"rgba(13,27,42,0.92)", backdropFilter:"blur(24px)", borderBottomColor:"rgba(255,255,255,0.07)", duration:0.4 }),
        onLeaveBack: () => gsap.to(navRef.current, { backgroundColor:"transparent", backdropFilter:"blur(0px)", borderBottomColor:"transparent", duration:0.3 }),
      });

      const card = cardRef.current; if(!card) return;
      const flipEl = cardFlipRef.current; if (!flipEl) return;

      // FIX: No transformPerspective here — perspective lives on the CreditCard outer div.
      // Double perspective contexts caused the blur.
      gsap.set(card,   { x:"26vw", y:"-2vh", scale:1.45, rotateX:5, rotateZ:-2, opacity:1, transformOrigin:"center center" });
      // flipEl only does subtle tilts — never full 180° (that's handled by userFlipRef inside CreditCard)
      gsap.set(flipEl, { rotateY: 0 });

      gsap.set(".act-hero",      { opacity:1, y:0 });
      gsap.set(".act-loss",      { opacity:0, y:44 });
      gsap.set(".act-switch",    { opacity:0, y:44 });
      gsap.set(".act-portfolio", { opacity:0, y:44 });
      gsap.set(".act-playbook",  { opacity:0, y:44 });
      gsap.set(".act-cta",       { opacity:0, y:44 });
      gsap.set(".portfolio-card-item", { opacity:0, y:30 });
      gsap.set(".playbook-step",       { opacity:0, x:34 });
      gsap.set(".card-glow",           { opacity:0 });
      gsap.set(".card-final-glow",     { opacity:0, scale:1 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger:wrapRef.current, start:"top top", end:"bottom bottom", scrub:0.7 }
      });

      // ACT 0 → ACT 1: subtle tilt on flipEl only — no full flips (user handles those via click)
      tl
        .to(flipEl, { rotateY: -10, duration: 0.07, ease: "none" }, 0.04)
        .to(flipEl, { rotateY: 0,   duration: 0.06, ease: "power2.inOut" }, 0.11)
        .to(".act-hero",  { opacity:0, y:-52, duration:0.06, ease:"power2.in" }, 0.13)
        .to(card,         { x:"16vw", y:"0vh", scale:1.1, rotateX:-3, rotateZ:2.5, duration:0.14, ease:"power2.inOut" }, 0.14)
        .to(".bg-blob",   { x:"15%", opacity:0.55, duration:0.14 }, 0.14)
        .to(".act-loss",  { opacity:1, y:0, duration:0.08, ease:"power2.out" }, 0.22)

      // ACT 2 — SWITCH
        .to(".act-loss",    { opacity:0, y:-52, duration:0.06 }, 0.29)
        .to(card,           { x:"-20vw", y:"1vh", scale:1.32, rotateX:5, rotateZ:-3, duration:0.16 }, 0.30)
        .to(".bg-blob",     { x:"-22%", opacity:0.6, duration:0.16 }, 0.30)
        .to(flipEl,         { rotateY: -14, duration: 0.16, ease:"power2.inOut" }, 0.30)
        .to(".card-glow",   { opacity:0.9, duration:0.09 }, 0.37)
        .to(".act-switch",  { opacity:1, y:0, duration:0.08 }, 0.38)

      // ACT 3 — PORTFOLIO
        .to(".act-switch",    { opacity:0, y:-52, duration:0.06 }, 0.47)
        .to(".card-glow",     { opacity:0, duration:0.05 }, 0.47)
        .to(card,             { x:"20vw", y:"-14vh", scale:0.90, rotateX:-4, rotateZ:1.5, duration:0.14 }, 0.47)
        .to(flipEl,           { rotateY: 8, duration:0.14, ease:"power2.inOut" }, 0.47)
        .to(".bg-blob",       { x:"12%", y:"-10%", opacity:0.38, duration:0.14 }, 0.47)
        .to(".act-portfolio", { opacity:1, y:0, duration:0.07 }, 0.5)
        .to(".portfolio-card-item", { opacity:1, y:0, stagger:0.028, duration:0.07 }, 0.45)

      // ACT 4 — PLAYBOOK
        .to(".act-portfolio",       { opacity:0, y:-52, duration:0.06 }, 0.64)
        .to(".portfolio-card-item", { opacity:0, y:22,  duration:0.05 }, 0.64)
        .to(card,                   { x:"-20vw", y:"4vh", scale:1.0, rotateX:2, rotateZ:-2, duration:0.10 }, 0.64)
        .to(flipEl,                 { rotateY: -6, duration:0.10, ease:"power2.inOut" }, 0.64)
        .to(".bg-blob",             { x:"-16%", y:"16%", opacity:0.44, duration:0.10 }, 0.64)
        .to(".act-playbook",        { opacity:1, y:0, duration:0.07 }, 0.70)
        .to(".playbook-step",       { opacity:1, x:0, stagger:0.016, duration:0.055 }, 0.71)

      // ACT 5 — CTA: reset inner tilt to 0° for clean centred presentation
        .to(".act-playbook",  { opacity:0, y:-52, duration:0.06 }, 0.82)
        .to(".playbook-step", { opacity:0, x:44,  duration:0.05 }, 0.82)
        .to(card,             { x:0, y:"-22vh", scale:1.35, rotateX:0, rotateZ:0, duration:0.17 }, 0.82)
        .to(flipEl,           { rotateY: 0, duration:0.17, ease:"power2.inOut" }, 0.82)
        .to(".bg-blob",       { x:"0%", y:"0%", opacity:0.72, duration:0.17 }, 0.82)
        .to(".card-final-glow", { opacity:1, scale:1.7, duration:0.15 }, 0.85)
        .to(".act-cta",         { opacity:1, y:0, duration:0.11 },       0.91);

      const ACTS_META = [
        { p:0.30, i:2, prev:0, actIdx:2 },
        { p:0.48, i:1, prev:2, actIdx:3 },
        { p:0.65, i:3, prev:1, actIdx:4 },
        { p:0.81, i:0, prev:3, actIdx:5 },
      ];

      ACTS_META.forEach(({ p, i, prev, actIdx }) => {
        ScrollTrigger.create({
          trigger: wrapRef.current,
          start: `${p*100}% top`,
          onEnter:     () => { swapCard(i); setActTint(actIdx); },
          onLeaveBack: () => { swapCard(prev); setActTint(actIdx-1); },
        });
      });

      ScrollTrigger.create({
        trigger: wrapRef.current, start:"14% top",
        onEnter:     () => setActTint(1),
        onLeaveBack: () => setActTint(0),
      });
    };

    init();
    return () => { lenis?.destroy(); ScrollTrigger.getAll().forEach(t=>t.kill()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  const setActTint = (idx: number) => {
    if (bgTintRef.current) bgTintRef.current.style.background = ACT_TINTS[idx] ?? ACT_TINTS[0];
  };

  const tiltX = mouse.y * -5;
  const tiltY = mouse.x * 7;

  const SectionLabel = ({ text }: { text: string }) => (
    <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", marginBottom:"18px" }}>
      <div style={{ width:"20px", height:"1px", background:YELLOW, opacity:0.7 }} />
      <p style={{ fontSize:"10px", fontWeight:700, color:YELLOW, letterSpacing:"0.16em", textTransform:"uppercase", opacity:0.8 }}>{text}</p>
    </div>
  );

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className={`${bricolage.variable} ${dmSans.variable}`} style={{ fontFamily:"var(--font-dm)", background:NAVY, color:"#fff" }}>
        <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, padding:"0 20px", height:"60px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(13,27,42,0.95)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <a href="https://openloans.com.au" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:"8px" }}>
            <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height:"22px", filter:"brightness(0) invert(1)", opacity:0.9 }} />
          </a>
          <a href="/setup" style={{ textDecoration:"none" }}>
            <button style={{ background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"9px 20px", fontFamily:"var(--font-dm)", fontSize:"13px", fontWeight:700, cursor:"pointer" }}>
              Start free
            </button>
          </a>
        </nav>

        <div style={{ paddingTop:"60px" }}>
          <section style={{ padding:"56px 24px 48px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 120% 80% at 50% 0%, #162234 0%, #0D1B2A 70%)", zIndex:0 }} />
            <div style={{ position:"relative", zIndex:1 }}>
              <h1 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(46px, 12vw, 68px)", fontWeight:800, lineHeight:0.92, letterSpacing:"-0.04em", color:"#fff", marginBottom:"20px" }}>
                Your wallet<br />is <span style={{ color:YELLOW }}>quietly<br />bleeding.</span>
              </h1>
              <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.42)", lineHeight:1.7, marginBottom:"32px" }}>
                Most Australians miss <strong style={{ color:"rgba(255,255,255,0.74)" }}>$300-$800 in sign-up bonuses</strong> every card cycle.
              </p>
              <div style={{ marginBottom:"32px", display:"flex", justifyContent:"center" }}>
                <div style={{ transform:"scale(0.82) translateY(-8px)", transformOrigin:"top center" }}>
                  <CreditCard card={CARDS[0]} />
                </div>
              </div>
              <a href="/setup" style={{ textDecoration:"none", display:"block" }}>
                <button style={{ width:"100%", background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"16px 32px", fontFamily:"var(--font-dm)", fontSize:"16px", fontWeight:700, cursor:"pointer" }}>
                  Find my best card
                </button>
              </a>
              <p style={{ textAlign:"center", marginTop:"12px", fontSize:"12px", color:"rgba(255,255,255,0.22)" }}>Free · No credit check · 2 minutes</p>
            </div>
          </section>

          <section style={{ padding:"40px 24px", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel text="The problem" />
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(36px, 10vw, 52px)", fontWeight:800, letterSpacing:"-0.036em", lineHeight:0.95, color:"#fff", marginBottom:"20px" }}>
              You're losing<br /><span style={{ color:"#f87171" }}><Counter target={612} prefix="$" /></span><br />every year.
            </h2>
            <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)", lineHeight:1.7, marginBottom:"32px" }}>
              The average Australian household leaves <strong style={{ color:"rgba(255,255,255,0.7)" }}>$612 in bonus value</strong> unclaimed by staying on the same card past its bonus window.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px" }}>
              {([["$612","Avg. bonus\nmissed/yr"],["3.2yrs","Avg. on\none card"],["47%","Never\nswitch"]] as [string,string][]).map(([val,label]) => (
                <div key={label} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"12px", padding:"14px 10px", textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(20px,5vw,26px)", fontWeight:800, color:"#f87171", letterSpacing:"-0.03em" }}>{val}</div>
                  <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.28)", marginTop:"4px", lineHeight:1.4, whiteSpace:"pre-line" }}>{label}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ padding:"40px 24px", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel text="The solution" />
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(34px,9vw,48px)", fontWeight:800, letterSpacing:"-0.036em", lineHeight:0.95, color:"#fff", marginBottom:"16px" }}>
              There's a<br /><span style={{ color:CARDS[2].accent }}>better card</span><br />waiting.
            </h2>
            <div style={{ marginBottom:"20px", display:"flex", justifyContent:"center" }}>
              <div style={{ transform:"scale(0.82)", transformOrigin:"top center" }}>
                <CreditCard card={CARDS[2]} />
              </div>
            </div>
            <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)", lineHeight:1.7, marginBottom:"20px" }}>
              The Westpac Altitude Black is offering <strong style={{ color:"rgba(255,255,255,0.7)" }}>150,000 bonus points</strong> worth $750 — just for switching and hitting your normal spend.
            </p>
            <div style={{ background:"rgba(249,115,22,0.07)", border:"1px solid rgba(249,115,22,0.22)", borderRadius:"14px", padding:"16px", display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ width:"32px", height:"32px", background:"rgba(249,115,22,0.14)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div style={{ fontSize:"13px", fontWeight:600, color:"#fff" }}>Points Hacker matched this card</div>
                <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.34)", marginTop:"2px" }}>Based on $3,200/month household spend</div>
              </div>
            </div>
          </section>

          <section style={{ padding:"40px 24px", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel text="The full database" />
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(28px,8vw,40px)", fontWeight:800, letterSpacing:"-0.034em", lineHeight:1.0, color:"#fff", marginBottom:"28px" }}>
              Every premium AU card.<br /><span style={{ color:"rgba(255,255,255,0.22)" }}>Live offers. Real net value.</span>
            </h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              {CARDS.map((card,i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"14px" }}>
                  <p style={{ fontSize:"9px", fontWeight:700, color:"rgba(255,255,255,0.22)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"2px" }}>{card.bank}</p>
                  <p style={{ fontFamily:"var(--font-bricolage)", fontSize:"12px", fontWeight:700, color:"#fff", marginBottom:"10px", lineHeight:1.3 }}>{card.name}</p>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"22px", fontWeight:800, color:card.accent, letterSpacing:"-0.03em", lineHeight:1 }}>{card.points}</div>
                  <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.24)", marginTop:"2px", marginBottom:"8px" }}>pts ≈ {card.value}</div>
                  <div style={{ paddingTop:"8px", borderTop:"1px solid rgba(255,255,255,0.05)", fontSize:"10px", color:"rgba(255,255,255,0.26)", lineHeight:1.6 }}>
                    {card.minSpend} · {card.period}<br />{card.fee} p.a.
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ padding:"40px 24px", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel text="The playbook" />
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(30px,8vw,44px)", fontWeight:800, letterSpacing:"-0.034em", lineHeight:0.95, color:"#fff", marginBottom:"32px" }}>
              Four moves.<br /><span style={{ color:"rgba(255,255,255,0.2)" }}>Compounding gains.</span>
            </h2>
            {[
              { n:"01", title:"Tell us your spend",  body:"Monthly household breakdown across groceries, dining, travel, bills." },
              { n:"02", title:"We find your match",  body:"Live AU offers cross-referenced with your spend profile and history." },
              { n:"03", title:"Follow the timeline", body:"Open, spend, harvest the bonus, close before the annual fee hits." },
              { n:"04", title:"Pivot and repeat",    body:"Every 6-12 months. Each cycle compounds your total." },
            ].map((step,i) => (
              <div key={step.n} style={{ display:"flex", gap:"14px", alignItems:"flex-start", padding:"16px 0", borderBottom:i<3?"1px solid rgba(255,255,255,0.05)":"none" }}>
                <div style={{ width:"30px", height:"30px", background:YELLOW, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-bricolage)", fontSize:"11px", fontWeight:800, color:NAVY, flexShrink:0 }}>{step.n}</div>
                <div>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"15px", fontWeight:700, color:"#fff", marginBottom:"3px" }}>{step.title}</div>
                  <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.34)", lineHeight:1.6 }}>{step.body}</div>
                </div>
              </div>
            ))}
          </section>

          <section style={{ padding:"56px 24px 64px", textAlign:"center", borderTop:"1px solid rgba(255,255,255,0.05)", background:"radial-gradient(ellipse 100% 60% at 50% 100%, #162234 0%, #0D1B2A 70%)" }}>
            <SectionLabel text="Ready?" />
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(30px,8vw,44px)", fontWeight:800, letterSpacing:"-0.038em", lineHeight:0.93, color:"#fff", marginBottom:"12px" }}>
              Stop leaving money<br />on the table.
            </h2>
            <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.36)", marginBottom:"28px" }}>Free. No credit check. 2 minutes.</p>
            <a href="/setup" style={{ textDecoration:"none", display:"block" }}>
              <button style={{ width:"100%", background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"18px 32px", fontFamily:"var(--font-dm)", fontSize:"17px", fontWeight:700, cursor:"pointer" }}>
                Find my best switch
              </button>
            </a>
          </section>
        </div>

        <footer style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"24px", display:"flex", flexDirection:"column", gap:"12px", alignItems:"center", background:NAVY }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height:"18px", filter:"brightness(0) invert(1)", opacity:0.3 }} />
            <span style={{ fontFamily:"var(--font-bricolage)", fontWeight:700, fontSize:"12px", color:"rgba(255,255,255,0.26)" }}>Points Hacker</span>
          </div>
          <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.13)", textAlign:"center", lineHeight:1.7 }}>
            General information only. Not financial advice. Card offers subject to change. Always read the PDS.
          </p>
        </footer>

        <style>{`
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }
          @keyframes shimmer { 0%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
          *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
          html { scroll-behavior:smooth }
          body { background:#0D1B2A; -webkit-font-smoothing:antialiased }
        `}</style>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  return (
    <div className={`${bricolage.variable} ${dmSans.variable}`} style={{ fontFamily:"var(--font-dm)", background:NAVY, color:"#fff" }}>

      <nav ref={navRef} style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, padding:"0 56px", height:"72px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid transparent", transition:"background 0.4s, border-color 0.4s" }}>
        <a href="https://openloans.com.au" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:"10px" }}>
          <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height:"26px", filter:"brightness(0) invert(1)", opacity:0.9 }} />
        </a>
        <div style={{ display:"flex", gap:"36px" }}>
          {["How it works","The cards","Our data"].map(l => (
            <button key={l} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-dm)", fontSize:"14px", fontWeight:500, cursor:"pointer", transition:"color 0.2s" }}
              onMouseEnter={e=>(e.currentTarget.style.color="#fff")}
              onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.4)")}>{l}</button>
          ))}
        </div>
        <a href="/setup" style={{ textDecoration:"none" }}>
          <button style={{ background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"11px 24px", fontFamily:"var(--font-dm)", fontSize:"14px", fontWeight:700, cursor:"pointer", transition:"all 0.22s" }}
            onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.transform="translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 8px 28px rgba(242,201,76,0.38)`; }}
            onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform=""; (e.currentTarget as HTMLElement).style.boxShadow=""; }}>
            Start for free
          </button>
        </a>
      </nav>

      <div ref={wrapRef} style={{ height: "990vh", position: "relative" }}>
      <div ref={stickyRef} style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>

        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `radial-gradient(ellipse 100% 80% at 50% 35%, #162234 0%, ${NAVY} 70%)` }} />
        <div ref={bgTintRef} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", transition: "background 1.2s ease", background: ACT_TINTS[0] }} />
        <div className="bg-blob" style={{ position: "absolute", top: "50%", left: "50%", width: "800px", height: "550px", marginTop: "-275px", marginLeft: "-400px", background: "radial-gradient(ellipse, rgba(24,50,74,0.85) 0%, transparent 68%)", borderRadius: "50%", zIndex: 0, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.35, backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)`, backgroundSize: "44px 44px" }} />
        
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")` }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)" }} />

        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", opacity: 0.45 }}>
          <AntigravityGPGPU />
        </div>

        {/* THE CARD */}
        <div ref={cardRef} style={{ position: "absolute", top: "50%", left: "50%", marginTop: "-105px", marginLeft: "-170px", zIndex: 10, transformOrigin: "center center" }}>
            <div className="card-glow" style={{ position:"absolute", inset:"-90px", background:`radial-gradient(ellipse, ${(CARDS[cardIdx]??CARDS[0]).accent}30 0%, transparent 65%)`, borderRadius:"50%", pointerEvents:"none", opacity:0, zIndex:-1, transition:"background 0.9s ease" }} />
            <div className="card-final-glow" style={{ position:"absolute", inset:"-130px", background:"radial-gradient(ellipse, rgba(242,201,76,0.18) 0%, transparent 62%)", borderRadius:"50%", pointerEvents:"none", opacity:0, zIndex:-1 }} />
            {/* Mouse-tilt wrapper: only rotateX from mouse, no rotateY here */}
            <div style={{ transform:`rotateX(${tiltX}deg)`, transition:"transform 0.1s ease-out", transformStyle:"preserve-3d" }}>
              <CreditCard card={CARDS[cardIdx]} swapping={swapping} flipRef={cardFlipRef} />
            </div>
          </div>

          {/* ACT 0 — HERO */}
          <div className="act-hero" style={{ position:"absolute", inset:0, zIndex:5, display:"flex", alignItems:"center", padding:"0 9vw", pointerEvents:"none" }}>
            <div style={{ maxWidth:"480px" }}>
              <h1 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(54px, 6.8vw, 96px)", fontWeight:800, lineHeight:0.92, letterSpacing:"-0.04em", color:"#fff", marginBottom:"28px" }}>
                Your wallet<br />is <span style={{ color:YELLOW }}>quietly<br />bleeding.</span>
              </h1>
              <p style={{ fontSize:"17px", color:"rgba(255,255,255,0.42)", lineHeight:1.72, maxWidth:"380px", marginBottom:"44px" }}>
                Most Australians miss <strong style={{ color:"rgba(255,255,255,0.74)" }}>$300-$800 in sign-up bonuses</strong> every card cycle. Scroll to see what you're leaving on the table.
              </p>
              <div style={{ display:"flex", gap:"12px", alignItems:"center", pointerEvents:"all" }}>
                <a href="/setup" style={{ textDecoration:"none" }}>
                  <button style={{ background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"17px 40px", fontFamily:"var(--font-dm)", fontSize:"16px", fontWeight:700, cursor:"pointer", transition:"all 0.25s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 16px 48px rgba(242,201,76,0.32)`; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform=""; (e.currentTarget as HTMLElement).style.boxShadow=""; }}>
                    Find my best switch
                  </button>
                </a>
                <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", gap:"6px" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12L7 2M7 12l-3-3M7 12l3-3" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Scroll to explore
                </span>
              </div>
            </div>
          </div>

          {/* ACT 1 — LOSS */}
          <div className="act-loss" style={{ position:"absolute", inset:0, zIndex:5, display:"flex", alignItems:"center", padding:"0 9vw", pointerEvents:"none" }}>
            <div style={{ maxWidth:"460px" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", marginBottom:"18px" }}><div style={{ width:"20px", height:"1px", background:YELLOW, opacity:0.7 }} /><p style={{ fontSize:"10px", fontWeight:700, color:YELLOW, letterSpacing:"0.16em", textTransform:"uppercase", opacity:0.8 }}>The problem</p></div>
              <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(44px, 5.6vw, 76px)", fontWeight:800, letterSpacing:"-0.036em", lineHeight:0.93, color:"#fff", marginBottom:"24px" }}>
                You're losing<br /><span style={{ color:"#f87171" }}><Counter target={612} prefix="$" /></span><br />every year.
              </h2>
              <p style={{ fontSize:"16px", color:"rgba(255,255,255,0.4)", lineHeight:1.76, marginBottom:"40px" }}>
                The average Australian household leaves <strong style={{ color:"rgba(255,255,255,0.7)" }}>$612 in bonus value</strong> unclaimed every year by staying on the same card past its bonus window.
              </p>
              <div style={{ display:"flex", gap:"32px" }}>
                {([["$612","Avg. bonus missed/yr"],["3.2yrs","Avg. on one card"],["47%","Never switch"]] as [string,string][]).map(([val,label]) => (
                  <div key={label}><div style={{ fontFamily:"var(--font-bricolage)", fontSize:"32px", fontWeight:800, color:"#f87171", letterSpacing:"-0.03em" }}>{val}</div><div style={{ fontSize:"11px", color:"rgba(255,255,255,0.28)", marginTop:"5px", lineHeight:1.4 }}>{label}</div></div>
                ))}
              </div>
            </div>
          </div>

          {/* ACT 2 — SWITCH */}
          <div className="act-switch" style={{ position:"absolute", inset:0, zIndex:5, display:"flex", alignItems:"center", justifyContent:"flex-end", padding:"0 9vw", pointerEvents:"none" }}>
            <div style={{ maxWidth:"400px" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", marginBottom:"18px" }}><div style={{ width:"20px", height:"1px", background:YELLOW, opacity:0.7 }} /><p style={{ fontSize:"10px", fontWeight:700, color:YELLOW, letterSpacing:"0.16em", textTransform:"uppercase", opacity:0.8 }}>The solution</p></div>
              <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(38px, 4.8vw, 64px)", fontWeight:800, letterSpacing:"-0.036em", lineHeight:0.93, color:"#fff", marginBottom:"24px" }}>
                There's a<br /><span style={{ color:CARDS[2].accent }}>better card</span><br />waiting.
              </h2>
              <p style={{ fontSize:"16px", color:"rgba(255,255,255,0.4)", lineHeight:1.76, marginBottom:"28px" }}>
                The Westpac Altitude Black is offering <strong style={{ color:"rgba(255,255,255,0.7)" }}>150,000 bonus points</strong> worth $750 — just for switching and hitting your normal spend.
              </p>
              <div style={{ background:"rgba(249,115,22,0.07)", border:"1px solid rgba(249,115,22,0.22)", borderRadius:"14px", padding:"16px 20px", display:"flex", alignItems:"center", gap:"14px" }}>
                <div style={{ width:"36px", height:"36px", background:"rgba(249,115,22,0.14)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:600, color:"#fff" }}>Points Hacker matched this card</div>
                  <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.34)", marginTop:"2px" }}>Based on $3,200/month household spend</div>
                </div>
              </div>
            </div>
          </div>

          {/* ACT 3 — PORTFOLIO */}
          <div className="act-portfolio" style={{ position:"absolute", inset:0, zIndex:5, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 9vw", paddingTop:"60px", pointerEvents:"none" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", marginBottom:"18px" }}><div style={{ width:"20px", height:"1px", background:YELLOW, opacity:0.7 }} /><p style={{ fontSize:"10px", fontWeight:700, color:YELLOW, letterSpacing:"0.16em", textTransform:"uppercase", opacity:0.8 }}>The full database</p></div>
            <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(34px, 4vw, 54px)", fontWeight:800, letterSpacing:"-0.034em", lineHeight:1.0, color:"#fff", marginBottom:"36px", maxWidth:"520px" }}>
              Every premium AU card.<br /><span style={{ color:"rgba(255,255,255,0.22)" }}>Live offers. Real net value.</span>
            </h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px", maxWidth:"820px" }}>
              {CARDS.map((card,i) => (
                <div key={i} className="portfolio-card-item" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"18px", transition:"border-color 0.3s, background 0.3s" }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor=`${card.accent}44`; (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.055)"; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.03)"; }}>
                  <p style={{ fontSize:"9px", fontWeight:700, color:"rgba(255,255,255,0.22)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"3px" }}>{card.bank}</p>
                  <p style={{ fontFamily:"var(--font-bricolage)", fontSize:"13px", fontWeight:700, color:"#fff", marginBottom:"14px", lineHeight:1.3 }}>{card.name}</p>
                  <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"26px", fontWeight:800, color:card.accent, letterSpacing:"-0.03em", lineHeight:1 }}>{card.points}</div>
                  <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.24)", marginTop:"2px", marginBottom:"12px" }}>pts ≈ {card.value}</div>
                  <div style={{ paddingTop:"10px", borderTop:"1px solid rgba(255,255,255,0.05)", fontSize:"10px", color:"rgba(255,255,255,0.26)", lineHeight:1.7 }}>{card.minSpend} · {card.period}<br />{card.fee} p.a.</div>
                </div>
              ))}
            </div>
          </div>

          {/* ACT 4 — PLAYBOOK */}
          <div className="act-playbook" style={{ position:"absolute", inset:0, zIndex:5, display:"flex", alignItems:"center", justifyContent:"flex-end", padding:"0 9vw", pointerEvents:"none" }}>
            <div style={{ maxWidth:"420px" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", marginBottom:"18px" }}><div style={{ width:"20px", height:"1px", background:YELLOW, opacity:0.7 }} /><p style={{ fontSize:"10px", fontWeight:700, color:YELLOW, letterSpacing:"0.16em", textTransform:"uppercase", opacity:0.8 }}>The playbook</p></div>
              <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(36px, 4.5vw, 60px)", fontWeight:800, letterSpacing:"-0.034em", lineHeight:0.93, color:"#fff", marginBottom:"36px" }}>
                Four moves.<br /><span style={{ color:"rgba(255,255,255,0.2)" }}>Compounding gains.</span>
              </h2>
              {[
                { n:"01", title:"Tell us your spend",  body:"Monthly household breakdown across groceries, dining, travel, bills." },
                { n:"02", title:"We find your match",  body:"Live AU offers cross-referenced with your spend profile and history." },
                { n:"03", title:"Follow the timeline", body:"Open, spend, harvest the bonus, close before the annual fee hits." },
                { n:"04", title:"Pivot and repeat",    body:"Every 6-12 months. Each cycle compounds your total." },
              ].map((step,i) => (
                <div key={step.n} className="playbook-step" style={{ display:"flex", gap:"14px", alignItems:"flex-start", padding:"16px 0", borderBottom:i<3?"1px solid rgba(255,255,255,0.05)":"none" }}>
                  <div style={{ width:"30px", height:"30px", background:YELLOW, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-bricolage)", fontSize:"11px", fontWeight:800, color:NAVY, flexShrink:0 }}>{step.n}</div>
                  <div>
                    <div style={{ fontFamily:"var(--font-bricolage)", fontSize:"15px", fontWeight:700, color:"#fff", marginBottom:"3px" }}>{step.title}</div>
                    <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.34)", lineHeight:1.6 }}>{step.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACT 5 — CTA */}
          <div className="act-cta" style={{ position:"absolute", inset:0, zIndex:5, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", paddingBottom:"7vh", textAlign:"center", pointerEvents:"none" }}>
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-bricolage)", fontSize:"clamp(60px, 13vw, 175px)", fontWeight:800, color:"rgba(255,255,255,0.015)", letterSpacing:"-0.06em", whiteSpace:"nowrap", pointerEvents:"none", userSelect:"none" }}>SWITCH SMARTER</div>
            <div style={{ position:"relative", zIndex:2, pointerEvents:"all" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", marginBottom:"18px" }}><div style={{ width:"20px", height:"1px", background:YELLOW, opacity:0.7 }} /><p style={{ fontSize:"10px", fontWeight:700, color:YELLOW, letterSpacing:"0.16em", textTransform:"uppercase", opacity:0.8 }}>Ready?</p></div>
              <h2 style={{ fontFamily:"var(--font-bricolage)", fontSize:"clamp(34px, 4.5vw, 58px)", fontWeight:800, letterSpacing:"-0.038em", lineHeight:0.93, color:"#fff", marginBottom:"14px" }}>
                Stop leaving money<br />on the table.
              </h2>
              <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.36)", marginBottom:"28px" }}>Free. No credit check. 2 minutes.</p>
              <a href="/setup" style={{ textDecoration:"none" }}>
                <button style={{ background:YELLOW, color:NAVY, border:"none", borderRadius:"100px", padding:"18px 52px", fontFamily:"var(--font-dm)", fontSize:"17px", fontWeight:700, cursor:"pointer", transition:"all 0.25s" }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.transform="translateY(-3px) scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 20px 60px rgba(242,201,76,0.42)`; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform=""; (e.currentTarget as HTMLElement).style.boxShadow=""; }}>
                  Find my best switch
                </button>
              </a>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"2px", background:"rgba(255,255,255,0.04)", zIndex:50 }}>
            <div id="progress-bar" style={{ height:"100%", background:`linear-gradient(90deg, ${YELLOW}, rgba(242,201,76,0.6))`, width:"0%", transition:"width 0.08s linear" }} />
          </div>

          <div style={{ position:"absolute", right:"24px", top:"50%", transform:"translateY(-50%)", zIndex:50, display:"flex", flexDirection:"column", gap:"10px", alignItems:"center" }}>
            {["Hero","Loss","Switch","Portfolio","Playbook","CTA"].map((label,i) => (
              <div key={label} id={`dot-${i}`} title={label} style={{ width:"5px", height:"5px", borderRadius:"50%", background:"rgba(255,255,255,0.14)", transition:"all 0.3s", cursor:"pointer" }} />
            ))}
          </div>

        </div>
      </div>

      <footer style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"40px 56px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"20px", background:NAVY }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <img src="https://openloans.com.au/wp-content/uploads/2023/07/open-1-1-e1689958528538.png" alt="Open" style={{ height:"20px", filter:"brightness(0) invert(1)", opacity:0.3 }} />
          <span style={{ fontFamily:"var(--font-bricolage)", fontWeight:700, fontSize:"13px", color:"rgba(255,255,255,0.26)" }}>Points Hacker</span>
        </div>
        <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.13)", maxWidth:"380px", textAlign:"center", lineHeight:1.7 }}>
          General information only. Not financial advice. Card offers subject to change. Always read the PDS.
        </p>
        <a href="https://openloans.com.au" style={{ fontSize:"13px", color:"rgba(255,255,255,0.2)", textDecoration:"none" }}>openloans.com.au</a>
      </footer>

      <ProgressSync wrapRef={wrapRef} />

      <style>{`
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }
        @keyframes shimmer { 0%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
        html { scroll-behavior:auto }
        body { background:#0D1B2A; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale }
        ::-webkit-scrollbar       { width:4px }
        ::-webkit-scrollbar-track { background:#0D1B2A }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.07); border-radius:2px }
        ::-webkit-scrollbar-thumb:hover { background:rgba(242,201,76,0.28) }
      `}</style>
    </div>
  );
}

function ProgressSync({ wrapRef }: { wrapRef: React.RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    if (typeof window==="undefined") return;
    const acts = [0, 0.14, 0.30, 0.48, 0.65, 0.81];
    const onScroll = () => {
      const el=wrapRef.current; if(!el) return;
      const { top, height } = el.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -top/(height-window.innerHeight)));
      const bar = document.getElementById("progress-bar");
      if(bar) bar.style.width=`${progress*100}%`;
      const actIdx = acts.reduce((acc,t,i) => progress>=t ? i : acc, 0);
      acts.forEach((_,i) => {
        const dot = document.getElementById(`dot-${i}`);
        if(dot) { dot.style.background=i===actIdx ? YELLOW : "rgba(255,255,255,0.14)"; dot.style.width=i===actIdx?"7px":"5px"; dot.style.height=i===actIdx?"7px":"5px"; }
      });
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [wrapRef]);
  return null;
}