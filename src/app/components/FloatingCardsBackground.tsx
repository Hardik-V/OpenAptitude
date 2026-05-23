"use client";

/**
 * FloatingCardsBackground
 * ────────────────────────
 * Drop this component into your SetupPage file and render it as the
 * very first child inside the outer wrapper div (before the fixed overlay).
 *
 * It renders ~12 credit cards that drift, rotate and parallax gently
 * across the full viewport as a fixed background layer.
 * Uses the exact same accent/bg colours as the landing page.
 * Pure CSS + requestAnimationFrame — no extra deps.
 */

import React, { useEffect, useRef } from "react";

// Same card palette as the landing page ─────────────────────────────────────
const CARD_DEFS = [
  { bank: "American Express", name: "Platinum Edge",        pts: "100K", accent: "#F2C94C", bg: ["#1a3350","#0f2236"], network: "AMEX" },
  { bank: "ANZ",              name: "Frequent Flyer Black", pts: "80K",  accent: "#60A5FA", bg: ["#1c2b4a","#121e35"], network: "VISA" },
  { bank: "Westpac",          name: "Altitude Black",       pts: "150K", accent: "#F97316", bg: ["#2a1a0f","#1a0f07"], network: "MC"   },
  { bank: "NAB",              name: "Qantas Rewards Sig.",  pts: "90K",  accent: "#A78BFA", bg: ["#1a1040","#0d0a28"], network: "VISA" },
  { bank: "Citibank",         name: "Premier",              pts: "75K",  accent: "#34D399", bg: ["#0d2d22","#071a14"], network: "VISA" },
  { bank: "CommBank",         name: "Diamond Awards",       pts: "120K", accent: "#FB923C", bg: ["#2a1505","#1a0d03"], network: "MC"   },
];

// Each floating card's physics state ─────────────────────────────────────────
type CardState = {
  x: number;       // % of viewport width
  y: number;       // % of viewport height
  z: number;       // depth 0–1 (affects scale + opacity)
  rotX: number;    // degrees
  rotY: number;    // degrees
  rotZ: number;    // degrees tilt
  vx: number;      // velocity x  (%/s)
  vy: number;      // velocity y
  vRotZ: number;   // slow spin
  cardIdx: number;
};

// Deterministic seeded random (avoids hydration mismatch) ────────────────────
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}

const CARD_COUNT = 11;

function initCards(): CardState[] {
  const rand = seededRand(42);
  return Array.from({ length: CARD_COUNT }, (_, i) => ({
    x:      rand() * 110 - 5,      // spread slightly beyond viewport edges
    y:      rand() * 110 - 5,
    z:      0.2 + rand() * 0.8,
    rotX:  (rand() - 0.5) * 24,
    rotY:  (rand() - 0.5) * 32,
    rotZ:  (rand() - 0.5) * 22,
    vx:    (rand() - 0.5) * 2.2,   // very slow drift
    vy:    (rand() - 0.5) * 1.6,
    vRotZ: (rand() - 0.5) * 0.55,
    cardIdx: i % CARD_DEFS.length,
  }));
}

// Network badge helpers ───────────────────────────────────────────────────────
function NetworkBadge({ network, accent }: { network: string; accent: string }) {
  if (network === "VISA") return (
    <span style={{ fontFamily: "Georgia, serif", fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}>VISA</span>
  );
  if (network === "MC") return (
    <span style={{ display: "flex" }}>
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(235,85,50,0.75)", display: "inline-block" }} />
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(255,185,0,0.75)", display: "inline-block", marginLeft: -6 }} />
    </span>
  );
  return <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em" }}>AMEX</span>;
}

// Single card face ────────────────────────────────────────────────────────────
function CardFace({ def }: { def: typeof CARD_DEFS[0] }) {
  return (
    <div style={{
      width: "100%", height: "100%", borderRadius: 14,
      background: `linear-gradient(135deg, ${def.bg[0]} 0%, ${def.bg[1]} 100%)`,
      padding: "18px 20px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.10)`,
      overflow: "hidden", position: "relative",
    }}>
      {/* Shimmer sweep */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.055) 50%, transparent 75%)", animation: "shimmer 6s ease-in-out infinite", borderRadius: 14, pointerEvents: "none" }} />
      {/* Accent top stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "14px 14px 0 0", background: `linear-gradient(90deg, transparent, ${def.accent}60, transparent)` }} />

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 2 }}>{def.bank}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{def.name}</div>
        </div>
        {/* Chip */}
        <div style={{ width: 30, height: 22, borderRadius: 3, background: "linear-gradient(135deg,#c8982a,#f0c060,#b07820)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ height: 1, background: "rgba(0,0,0,0.2)", margin: "0 2px" }} />
            <div style={{ height: 1, background: "rgba(0,0,0,0.1)", margin: "3px 2px 0" }} />
          </div>
        </div>
      </div>

      {/* Card number dots */}
      <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", position: "relative", zIndex: 1 }}>•••• •••• •••• 4821</div>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 6, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 1 }}>Expires</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>08/28</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "4px 8px", border: `1px solid ${def.accent}33`, textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: def.accent, lineHeight: 1, fontFamily: "var(--font-bricolage, serif)" }}>{def.pts}</div>
          <div style={{ fontSize: 6, color: "rgba(255,255,255,0.28)", marginTop: 1 }}>pts</div>
        </div>
        <NetworkBadge network={def.network} accent={def.accent} />
      </div>
    </div>
  );
}

// The main floating background ────────────────────────────────────────────────
export function FloatingCardsBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef     = useRef<CardState[]>(initCards());
  const rafRef       = useRef<number>(0);
  const lastRef      = useRef<number>(0);
  const mouseRef     = useRef({ x: 0, y: 0 }); // normalised -1..1
  const divRefs      = useRef<(HTMLDivElement | null)[]>([]);

  // Mouse parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Animation loop
  useEffect(() => {
    const tick = (now: number) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05); // cap at 50ms
      lastRef.current = now;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      cardsRef.current.forEach((c, i) => {
        // Drift
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rotZ += c.vRotZ * dt;

        // Gentle parallax nudge from mouse (deeper cards move more)
        const parallaxStrength = c.z * 0.6;  // was 1.8 — much more subtle
        const targetX = c.x + mx * parallaxStrength;
        const targetY = c.y + my * parallaxStrength;

        // Wrap around viewport edges
        if (c.x < -22) c.x = 108;
        if (c.x > 108) c.x = -22;
        if (c.y < -18) c.y = 108;
        if (c.y > 108) c.y = -18;

        // Apply to DOM
        const el = divRefs.current[i];
        if (!el) return;

        const scale = 0.35 + c.z * 0.72;   // 0.35 (far) → 1.07 (near)
        const opacity = 0.32 + c.z * 0.52; // was 0.08–0.46, now 0.18–0.62

        // Dynamic rotX/rotY tilt toward mouse
        const tiltX = my * -8 * c.z;
        const tiltY = mx *  10 * c.z;

        el.style.transform = `
          translate(${targetX}vw, ${targetY}vh)
          scale(${scale})
          rotateX(${c.rotX + tiltX}deg)
          rotateY(${c.rotY + tiltY}deg)
          rotateZ(${c.rotZ}deg)
        `;
        el.style.opacity = String(opacity);
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0,
        zIndex: 0, pointerEvents: "none",
        perspective: "1200px",
        overflow: "hidden",
      }}
    >
      {cardsRef.current.map((c, i) => (
        <div
          key={i}
          ref={el => { divRefs.current[i] = el; }}
          style={{
            position: "absolute",
            top: 0, left: 0,
            width: 280, height: 175,
            transformOrigin: "center center",
            willChange: "transform, opacity",
            // initial transform matches initCards() so there's no jump
            transform: `translate(${c.x}vw, ${c.y}vh) scale(${0.35 + c.z * 0.72}) rotateX(${c.rotX}deg) rotateY(${c.rotY}deg) rotateZ(${c.rotZ}deg)`,
            opacity: 0.32 + c.z * 0.52,
          }}
        >
          <CardFace def={CARD_DEFS[c.cardIdx]} />
        </div>
      ))}

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
}