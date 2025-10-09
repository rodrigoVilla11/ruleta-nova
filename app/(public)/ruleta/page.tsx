"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, TimerReset } from "lucide-react";

/**
 * Ruleta Nova — v7 (Responsive, mobile-first)
 * Cambios clave:
 * - Componente Wheel acepta `size` (px) para escalar en mobile (clamp 260–480)
 * - Layout 1 columna en mobile, 2 columnas a partir de md
 * - Fondo con foto sólo en md+; en mobile se usa fondo degradado legible
 * - Puntero corregido (posición absoluta arriba del disco, centrado)
 * - Botones y textos con tamaños fluidos
 * - Mejoras de accesibilidad y tap targets
 */

// ---------------- Brand Palette ----------------
const PALETTE = {
  ivory: "#E7E2D4",
  gold: "#C6A05A",
  goldDeep: "#B3873B",
  graphite: "#1A1A1A",
  coal: "#0C0B0A",
  stone: "#9CA3AF",
  red: "#ff0000",
};

// ---------------- Config ----------------
const RIGHT_BG_IMAGE = "/ruleta-right.jpg"; // md+
const CENTER_LOGO = "/LOGO.png";
const WHATSAPP_NUMBER = "5493512583838";

// ---------------- Tipos ----------------

type RewardKind =
  | { type: "PERCENT"; value: number }
  | { type: "ITEM"; value: string }
  | { type: "SHIPPING"; value: "FREE" }
  | { type: "NONE" };

export type Reward = {
  id: string;
  label: string;
  detail: string;
  weight: number;
  kind: RewardKind;
  fill: string;
  text: "light" | "dark";
};

// ---------------- Premios ----------------
const REWARDS: Reward[] = [
  {
    id: "try_again",
    label: "Seguí participando",
    detail: "¡Casi! No ganaste esta vez, volvé a intentarlo la próxima.",
    weight: 15,
    kind: { type: "NONE" },
    fill: PALETTE.stone,
    text: "dark",
  },
  {
    id: "pct10",
    label: "10% OFF",
    detail: "10% de descuento en tu próxima compra",
    weight: 25,
    kind: { type: "PERCENT", value: 10 },
    fill: PALETTE.ivory,
    text: "dark",
  },
  {
    id: "pct15",
    label: "15% OFF",
    detail: "15% de descuento en tu próxima compra",
    weight: 20,
    kind: { type: "PERCENT", value: 15 },
    fill: PALETTE.gold,
    text: "dark",
  },
  {
    id: "pct20",
    label: "20% OFF",
    detail: "20% de descuento en tu próxima compra",
    weight: 12,
    kind: { type: "PERCENT", value: 20 },
    fill: PALETTE.goldDeep,
    text: "light",
  },
  {
    id: "pct50",
    label: "50% OFF",
    detail: "50% de descuento en tu próxima compra",
    weight: 4,
    kind: { type: "PERCENT", value: 50 },
    fill: PALETTE.ivory,
    text: "dark",
  },
  {
    id: "dog",
    label: "Sushi Dog gratis",
    detail: "Un Sushi Dog de regalo 🐶🍣",
    weight: 8,
    kind: { type: "ITEM", value: "Sushi Dog" },
    fill: PALETTE.gold,
    text: "dark",
  },
  {
    id: "burger",
    label: "Sushi Burger gratis",
    detail: "Una Sushi Burger de regalo 🍔🍣",
    weight: 6,
    kind: { type: "ITEM", value: "Sushi Burger" },
    fill: PALETTE.goldDeep,
    text: "light",
  },
  {
    id: "ten_pieces",
    label: "10 piezas extra",
    detail: "10 piezas extra en tu próximo pedido 🍣",
    weight: 5,
    kind: { type: "ITEM", value: "10 piezas" },
    fill: PALETTE.ivory,
    text: "dark",
  },
  {
    id: "thirty_pieces",
    label: "30 piezas extra",
    detail: "30 piezas extra en tu próximo pedido 🎉",
    weight: 5,
    kind: { type: "ITEM", value: "30 piezas" },
    fill: PALETTE.goldDeep,
    text: "light",
  },
];

// ---------------- Utils ----------------
function pickWeightedIndex<T extends { weight: number }>(arr: T[]): number {
  const total = arr.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= arr[i].weight;
    if (r < 0) return i;
  }
  return arr.length - 1;
}

const COOLDOWN_HOURS = 24;
const COOLDOWN_KEY = "nova_last_spin_at";
const nowISO = () => new Date().toISOString();
function msUntilAvailable(): number {
  const last = typeof window !== "undefined" && localStorage.getItem(COOLDOWN_KEY);
  if (!last) return 0;
  const lastDate = new Date(last).getTime();
  const next = lastDate + COOLDOWN_HOURS * 3600_000;
  return Math.max(0, next - Date.now());
}
const formatHMS = (ms: number) => {
  const t = Math.ceil(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};
function useCooldown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(msUntilAvailable());
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);
  return left;
}

// Wheel size responsive hook
function useWheelSize(min = 260, max = 480) {
  const [size, setSize] = useState(360);
  useEffect(() => {
    const calc = () => {
      const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      // 86vw en mobile, 38vw en md+, clamped
      const target = vw < 768 ? vw * 0.86 : vw * 0.38;
      setSize(Math.max(min, Math.min(max, Math.round(target))));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [min, max]);
  return size;
}

// ---------------- Enhanced Confetti ----------------
function EnhancedConfetti({
  show,
  duration = 1600,
  colors = ["#E7E2D4", "#C6A05A", "#B3873B", "#FFFFFF"],
  origin = "bottom-center",
  originOffsetY = 34,
  spreadDeg = 70,
}: {
  show: boolean;
  duration?: number;
  colors?: string[];
  origin?: "top-center" | "bottom-center";
  originOffsetY?: number;
  spreadDeg?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!show || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const { offsetWidth: w, offsetHeight: h } = canvas;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    type P = {
      x: number; y: number; vx: number; vy: number; ax: number; ay: number; rot: number; vr: number; life: number; ttl: number; size: number; color: string; shape: "rect" | "circle" | "tri";
    };

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    const emitterX = W / 2;
    const emitterY = origin === "top-center" ? originOffsetY : H - originOffsetY;
    const baseAngle = origin === "top-center" ? Math.PI / 2 : -Math.PI / 2;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];

    const makeBurst = (N: number, spread = spreadDeg) => {
      const parts: P[] = [];
      for (let i = 0; i < N; i++) {
        const angle = ((Math.random() - 0.5) * spread * Math.PI) / 180;
        const speed = rand(6, 9);
        parts.push({
          x: emitterX,
          y: emitterY,
          vx: Math.cos(baseAngle + angle) * speed,
          vy: Math.sin(baseAngle + angle) * speed,
          ax: 0,
          ay: 0.05,
          rot: rand(0, Math.PI * 2),
          vr: rand(-0.2, 0.2),
          life: 0,
          ttl: rand(duration * 0.6, duration * 1.1),
          size: rand(4, 9),
          color: pick(colors),
          shape: pick(["rect", "circle", "tri"]),
        });
      }
      return parts;
    };

    let parts: P[] = [...makeBurst(120)];
    const wave2 = setTimeout(() => { parts.push(...makeBurst(80, spreadDeg + 15)); }, 110);

    let rafId = 0;
    const start = performance.now();

    const step = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, W, H);

      parts.forEach((p) => {
        p.vx *= 0.985; p.vy *= 0.985; p.vy += p.ay;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life += 16;
        const fadeIn = Math.min(1, p.life / 250);
        const fadeOut = Math.max(0, 1 - elapsed / p.ttl);
        const alpha = Math.min(fadeIn, fadeOut);

        ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (p.shape === "rect") {
          ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
        } else if (p.shape === "circle") {
          ctx.beginPath(); ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.moveTo(-p.size, p.size * 0.6); ctx.lineTo(0, -p.size * 0.8); ctx.lineTo(p.size, p.size * 0.6); ctx.closePath(); ctx.fill();
        }
        ctx.restore(); ctx.globalAlpha = 1;
      });

      parts = parts.filter((p) => elapsed < p.ttl && p.y < H + 60 && p.y > -60);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    const killer = setTimeout(() => cancelAnimationFrame(rafId), duration + 1000);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(killer);
      clearTimeout(wave2);
      window.removeEventListener("resize", resize);
    };
  }, [show, duration, colors, origin, originOffsetY, spreadDeg]);

  return (
    <AnimatePresence>
      {show && (
        <motion.canvas
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          ref={ref}
          className="pointer-events-none absolute inset-0"
        />
      )}
    </AnimatePresence>
  );
}

// ---------------- Wheel visuals ----------------
function Wheel({ rewards, angle, size }: { rewards: Reward[]; angle: number; size: number }) {
  const SIZE = size; // dinámico
  const CENTER = SIZE / 2;
  const segAngle = 360 / rewards.length;
  const rad = (a: number) => (a * Math.PI) / 180;

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      {/* aro exterior con brillo dorado */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${PALETTE.gold}22, ${PALETTE.ivory}77, ${PALETTE.gold}22)`,
          filter: "blur(2px)",
          boxShadow: "0 24px 80px rgba(198,160,90,0.25)",
        }}
      />

      <motion.div
        animate={{ rotate: angle }}
        transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 5.4 }}
        className="rounded-full border border-white/10 relative overflow-hidden"
        style={{
          width: SIZE,
          height: SIZE,
          background: "radial-gradient(circle at 50% 40%, #1a1a1a 0, #020202 72%)",
        }}
      >
        {/* segmentos */}
        {rewards.map((r, i) => {
          const start = i * segAngle;
          const end = start + segAngle;
          const largeArc = segAngle > 180 ? 1 : 0;
          const x1 = CENTER + CENTER * Math.cos(rad(start));
          const y1 = CENTER + CENTER * Math.sin(rad(start));
          const x2 = CENTER + CENTER * Math.cos(rad(end));
          const y2 = CENTER + CENTER * Math.sin(rad(end));
          const path = `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${CENTER} ${CENTER} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          const mid = start + segAngle / 2;
          const lx = CENTER + CENTER * 0.85 * Math.cos(rad(mid));
          const ly = CENTER + CENTER * 0.85 * Math.sin(rad(mid));
          const tangent = mid + 90;
          const tmod = ((tangent % 360) + 360) % 360;
          const finalTextAngle = tmod > 90 && tmod < 270 ? tangent + 180 : tangent;
          const textFill = r.text === "light" ? "#FFFFFF" : "#111111";
          return (
            <svg key={r.id} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 select-none">
              <path d={path} fill={r.fill} />
              <path d={path} className="fill-transparent" stroke="#00000055" strokeWidth={Math.max(1, SIZE * 0.002)} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: textFill }}
                className="font-extrabold tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
                transform={`rotate(${finalTextAngle}, ${lx}, ${ly})`}
                fontSize={Math.max(10, Math.round(SIZE * 0.028))}
              >
                {r.label}
              </text>
            </svg>
          );
        })}

        {/* líneas radiales sutiles + aros */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0">
          {rewards.map((_, i) => {
            const a = i * (360 / rewards.length);
            const x = CENTER + CENTER * Math.cos(rad(a));
            const y = CENTER + CENTER * Math.sin(rad(a));
            return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#00000033" strokeWidth={Math.max(1, SIZE * 0.002)} />;
          })}
          <circle cx={CENTER} cy={CENTER} r={CENTER - 1} fill="transparent" stroke="#FFFFFF26" strokeWidth={Math.max(2, SIZE * 0.004)} />
          <circle cx={CENTER} cy={CENTER} r={CENTER - 6} fill="transparent" stroke="#FFFFFF14" strokeWidth={Math.max(8, SIZE * 0.016)} />
        </svg>

        {/* centro con logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border-4 border-[rgba(198,160,90,0.6)] shadow-[0_0_25px_rgba(198,160,90,0.25)] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#000_0%,#1a1a1a_100%)]"
               style={{ width: SIZE * 0.34, height: SIZE * 0.34 }}>
            <img src={CENTER_LOGO} alt="NOVA" className="object-contain" style={{ width: SIZE * 0.35, height: SIZE * 0.35 }} />
          </div>
        </div>
      </motion.div>

      {/* puntero — centrado arriba del disco */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: Math.max(310, Math.round(size * 0.03)) }}>
        <div
          className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[26px] border-l-transparent border-r-transparent"
          style={{ borderBottomColor: PALETTE.red }}
        />
      </div>
    </div>
  );
}

// ---------------- Página ----------------
export default function RuletaNovaPage() {
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [resultIdx, setResultIdx] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);

  const rewards = useMemo(() => REWARDS, []);
  const segAngle = 360 / rewards.length;

  const cooldownLeft = useCooldown();
  const canSpin = cooldownLeft <= 0 && !spinning;
  const wheelSize = useWheelSize(); // 260–480px dinámico

  const spin = () => {
    if (!canSpin) return;
    setSpinning(true);
    setResultIdx(null);
    setBurst(false);

    const idx = pickWeightedIndex(rewards);

    const centerDeg = idx * segAngle + segAngle / 2;
    const currentMod = ((angle % 360) + 360) % 360;
    const targetMod = (90 - centerDeg + 360) % 360; // 90° = puntero arriba
    const baseDelta = targetMod - currentMod;
    const normalizedDelta = ((baseDelta % 360) + 360) % 360;
    const extraTurns = 6 * 360;
    const delta = extraTurns + normalizedDelta;

    setAngle((prev) => prev + delta);

    window.setTimeout(() => {
      setResultIdx(idx);
      localStorage.setItem(COOLDOWN_KEY, nowISO());
      if (rewards[idx].kind.type !== "NONE") {
        setBurst(true);
        window.setTimeout(() => setBurst(false), 1600);
      }
      setSpinning(false);
    }, 5400);
  };

  const rw = resultIdx != null ? rewards[resultIdx] : null;

  const buildWhatsAppUrl = (reward: Reward) => {
    let msg = "Hola! Jugué a la Ruleta Nova!";
    if (reward.kind.type === "PERCENT")
      msg = `Hola! Gané un ${reward.kind.value}% de descuento en la Ruleta Nova y quiero usarlo en mi próximo pedido.`;
    else if (reward.kind.type === "ITEM")
      msg = `Hola! Gané ${reward.kind.value} en la Ruleta Nova y quiero usarlo en mi próximo pedido.`;
    else if (reward.kind.type === "SHIPPING")
      msg = `Hola! Gané envío gratis en la Ruleta Nova y quiero aprovecharlo en mi próximo pedido.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <main
      className="relative min-h-dvh w-full text-white flex items-center justify-center p-4 sm:p-6 overflow-x-hidden"
      style={{ backgroundColor: PALETTE.coal }}
    >
      {/* BG con imagen: sólo md+ */}
      <div
        className="hidden md:block absolute inset-y-0 right-0 w-1/2"
        style={{ backgroundImage: `url(${RIGHT_BG_IMAGE})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      {/* capas para legibilidad sobre la foto (md+) y degradado en mobile */}
      <div className="absolute inset-0 -z-10">
        <div className="hidden md:block absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-black/70 via-black/40 to-transparent backdrop-blur-[2px]" />
        <div className="md:hidden absolute inset-0 bg-[radial-gradient(800px_480px_at_50%_-10%,rgba(198,160,90,0.10),transparent)]" />
      </div>

      <div className="relative w-full max-w-6xl grid grid-cols-1 md:grid-cols-[minmax(0,520px)_1fr] gap-6 sm:gap-8 md:gap-10 items-center">
        {/* Columna Izquierda (ruleta) */}
        <section className="relative flex flex-col items-center gap-4 sm:gap-5">
          <div className="text-center px-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] sm:text-xs text-zinc-300">
              <TimerReset className="w-4 h-4" /> 1 giro por compra
            </div>
            <h1 className="text-[clamp(1.6rem,5vw,2.25rem)] font-black tracking-tight mt-2 sm:mt-3">Ruleta Nova</h1>
            <p className="text-zinc-300 mt-1 text-sm sm:text-base">Girá y desbloqueá beneficios para tu próximo pedido ✨</p>
          </div>

          <div className="relative rounded-2xl sm:rounded-[32px] p-3 sm:p-6 bg-black/30 border border-white/10 backdrop-blur-sm shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <Wheel rewards={rewards} angle={angle} size={wheelSize} />
            <EnhancedConfetti show={burst} duration={1800} colors={["#E7E2D4", "#C6A05A", "#B3873B", "#FFF7DF"]} origin="bottom-center" originOffsetY={34} spreadDeg={70} />
          </div>

          <button
            onClick={spin}
            disabled={!canSpin}
            className="px-6 sm:px-7 py-3 rounded-xl sm:rounded-2xl shadow-lg bg-gradient-to-r from-[var(--ivory,#E7E2D4)] to-[var(--gold,#C6A05A)] text-black font-extrabold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-white/40"
            title={canSpin ? "Girar ahora" : cooldownLeft > 0 ? `Disponible en ${formatHMS(cooldownLeft)}` : undefined}
          >
            {spinning ? "Girando..." : canSpin ? "¡Girar!" : `Disponible en ${formatHMS(cooldownLeft)}`}
          </button>
        </section>

        {/* Columna Derecha (info) */}
        <section className="space-y-4 sm:space-y-5 w-full">
          <div className="rounded-2xl sm:rounded-[24px] p-4 sm:p-6 bg-black/35 border border-white/10 backdrop-blur-md">
            <h2 className="text-lg sm:text-xl font-bold">Resultado</h2>
            {!rw && <p className="text-zinc-300 mt-2 text-sm sm:text-base">Tocá “¡Girar!” para descubrir tu premio.</p>}
            {rw && (
              <div className="mt-3 sm:mt-4">
                <div className="font-black tracking-tight" style={{ color: PALETTE.ivory, fontSize: "clamp(1.25rem,4.4vw,1.875rem)" }}>
                  {rw.label}
                </div>
                <p className="text-zinc-200 mt-2 leading-relaxed text-sm sm:text-base">{rw.detail}</p>
                {rw.kind.type !== "NONE" ? (
                  <a
                    href={buildWhatsAppUrl(rw)}
                    target="_blank"
                    className="inline-flex items-center gap-2 mt-4 sm:mt-5 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition shadow min-w-[220px] justify-center"
                  >
                    <MessageCircle className="w-5 h-5" /> Enviar a WhatsApp
                  </a>
                ) : (
                  <p className="text-xs sm:text-sm text-zinc-300 mt-4">Sin premio esta vez, ¡te esperamos mañana! 🥢</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl sm:rounded-[24px] p-4 sm:p-6 bg-black/35 border border-white/10 backdrop-blur-md">
            <h3 className="text-base sm:text-lg font-bold">Cómo funciona</h3>
            <ul className="list-disc list-inside text-xs sm:text-sm text-zinc-200 mt-2 space-y-1">
              <li>1 giro después de cada compra.</li>
              <li>El beneficio se coordina por WhatsApp; no acumulable con otras promos.</li>
              <li>Premios sujetos a disponibilidad. Delivery con radio habilitado.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
