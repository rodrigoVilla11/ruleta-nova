"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, TimerReset } from "lucide-react";

/**
 * Ruleta Nova — v6 (Branded)
 * - Colores de la marca (ivory + gold + negro) tomados del logo
 * - Imagen de fondo en MITAD DERECHA (mejor composición con tu foto)
 * - Centro con logo (usa /LOGO.png en /public)
 * - Contraste automático de textos por segmento (blanco/negro)
 * - Confetti sólo si hay premio (no en "Seguí participando")
 * - Alineación exacta del premio con el puntero
 */

// ---------------- Brand Palette ----------------
// Ajustadas a ojo a partir del logo provisto (podés retocar si tenés códigos exactos)
const PALETTE = {
  ivory: "#E7E2D4", // tipografía del logo
  gold: "#C6A05A", // dorado principal
  goldDeep: "#B3873B", // dorado profundo
  graphite: "#1A1A1A", // fondo oscuro
  coal: "#0C0B0A", // más oscuro
  stone: "#9CA3AF", // gris para "Seguí participando"
  red: "#ff0000",
};

// ---------------- Config ----------------
const RIGHT_BG_IMAGE = "/ruleta-right.jpg"; // ⬅️ Poné tu foto en /public con este nombre (o cambia aquí)
const CENTER_LOGO = "/LOGO.png"; // ⬅️ Logo en /public/LOGO.png
const WHATSAPP_NUMBER = "5493512583838"; // número real

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
  fill: string; // HEX del segmento
  text: "light" | "dark"; // color del texto (blanco/negro)
};

// ---------------- Premios (con colores de marca) ----------------
const REWARDS: Reward[] = [
  {
    id: "try_again",
    label: "Seguí participando",
    detail: "¡Casi! No ganaste esta vez, volvé a intentarlo la proxima.",
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
    label: "10 piezas gratis",
    detail: "10 piezas gratis en tu próximo pedido 🍣",
    weight: 5,
    kind: { type: "ITEM", value: "10 piezas" },
    fill: PALETTE.ivory,
    text: "dark",
  },
  {
    id: "thirty_pieces",
    label: "30 piezas gratis",
    detail: "30 piezas gratis en tu próximo pedido 🎉",
    weight: 5,
    kind: { type: "ITEM", value: "30 piezas" },
    fill: PALETTE.goldDeep,
    text: "light",
  },
];

// ---------------- Cooldown ----------------
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
function nowISO() {
  return new Date().toISOString();
}
function msUntilAvailable(): number {
  const last = localStorage.getItem(COOLDOWN_KEY);
  if (!last) return 0;
  const lastDate = new Date(last).getTime();
  const next = lastDate + COOLDOWN_HOURS * 3600_000;
  return Math.max(0, next - Date.now());
}
function formatHMS(ms: number) {
  const t = Math.ceil(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
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

// ---------------- Confetti simple ----------------
// === Enhanced Confetti (brand) — burst desde puntero ===
function EnhancedConfetti({
  show,
  duration = 1600,
  colors = ["#E7E2D4", "#C6A05A", "#B3873B", "#FFFFFF"],
  origin = "bottom-center",
  originOffsetY = 34, // fino: distancia desde el borde superior (px) hasta la punta del puntero
  spreadDeg = 70, // apertura del abanico
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

    // HiDPI + resize
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
      x: number;
      y: number;
      vx: number;
      vy: number;
      ax: number;
      ay: number;
      rot: number;
      vr: number;
      life: number;
      ttl: number;
      size: number;
      color: string;
      shape: "rect" | "circle" | "tri";
    };

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    // puntero: arriba, centro. Afinamos Y con originOffsetY para que coincida con la punta.
    const emitterX = W / 2;
    const emitterY =
      origin === "top-center" ? originOffsetY : H - originOffsetY;

    // si el origen es arriba, el “chorro” baja; si es abajo, sube
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
          ay: 0.05, // gravedad
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

    let parts: P[] = [...makeBurst(140)];
    const wave2 = setTimeout(() => {
      parts.push(...makeBurst(80, spreadDeg + 15));
    }, 110);

    let rafId = 0;
    const start = performance.now();

    const step = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, W, H);

      parts.forEach((p) => {
        // física
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.vy += p.ay; // gravedad hacia abajo (si el origen es top) o sigue afectando igual si es bottom
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life += 16;

        // fade in/out
        const fadeIn = Math.min(1, p.life / 250);
        const fadeOut = Math.max(0, 1 - elapsed / p.ttl);
        const alpha = Math.min(fadeIn, fadeOut);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        if (p.shape === "rect") {
          ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(-p.size, p.size * 0.6);
          ctx.lineTo(0, -p.size * 0.8);
          ctx.lineTo(p.size, p.size * 0.6);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
      });

      // limpiar fuera de pantalla/tiempo
      parts = parts.filter((p) => elapsed < p.ttl && p.y < H + 60 && p.y > -60);

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    const killer = setTimeout(
      () => cancelAnimationFrame(rafId),
      duration + 1000
    );
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
const SIZE = 440;
const CENTER = SIZE / 2;

function Wheel({ rewards, angle }: { rewards: Reward[]; angle: number }) {
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
          background:
            "radial-gradient(circle at 50% 40%, #1a1a1a 0, #020202 72%)",
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
          const mid = start + segAngle / 2; // ángulo del centro del segmento
          const lx = CENTER + CENTER * 0.85 * Math.cos(rad(mid));
          const ly = CENTER + CENTER * 0.85 * Math.sin(rad(mid));
          // texto derecho
          const textAngle = mid + 90;
          const norm = ((textAngle % 360) + 360) % 360;
          const tangent = mid + 90; // texto tangente al arco
          const tmod = ((tangent % 360) + 360) % 360;
          const finalTextAngle =
            tmod > 90 && tmod < 270 ? tangent + 180 : tangent;
          const textFill = r.text === "light" ? "#FFFFFF" : "#111111";
          return (
            <svg
              key={r.id}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="absolute inset-0 select-none"
            >
              <path d={path} fill={r.fill} />
              <path
                d={path}
                className="fill-transparent"
                stroke="#00000055"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: textFill }}
                className="text-[12px] font-extrabold tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
                transform={`rotate(${finalTextAngle}, ${lx}, ${ly})`}
              >
                {r.label}
              </text>
            </svg>
          );
        })}

        {/* líneas radiales sutiles */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0">
          {rewards.map((_, i) => {
            const a = i * (360 / rewards.length);
            const x = CENTER + CENTER * Math.cos(rad(a));
            const y = CENTER + CENTER * Math.sin(rad(a));
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="#00000033"
                strokeWidth={1}
              />
            );
          })}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={CENTER - 1}
            fill="transparent"
            stroke="#FFFFFF26"
            strokeWidth={2}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={CENTER - 6}
            fill="transparent"
            stroke="#FFFFFF14"
            strokeWidth={8}
          />
        </svg>

        {/* centro con logo ampliado */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full border-4 border-[rgba(198,160,90,0.6)] shadow-[0_0_25px_rgba(198,160,90,0.25)] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#000_0%,#1a1a1a_100%)]">
            <img
              src={CENTER_LOGO}
              alt="NOVA"
              className="w-[155px] h-[155px] object-contain scale-[1.15] transition-transform duration-500 hover:scale-[1.25]"
            />
          </div>
        </div>
      </motion.div>

      {/* puntero */}
      <div className="absolute top-105 left-1/2 -translate-x-1/2">
        <div
          className="w-0 h-0 border-l-[16px] border-r-[16px] border-b-[30px] border-l-transparent border-r-transparent"
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

  const spin = () => {
    if (!canSpin) return;
    setSpinning(true);
    setResultIdx(null);
    setBurst(false);

    const idx = pickWeightedIndex(rewards);

    const centerDeg = idx * segAngle + segAngle / 2;
    const currentMod = ((angle % 360) + 360) % 360;
    const targetMod = (90 - centerDeg + 360) % 360;
    const baseDelta = targetMod - currentMod;
    const normalizedDelta = ((baseDelta % 360) + 360) % 360;
    const extraTurns = 6 * 360;
    const delta = extraTurns + normalizedDelta;

    setAngle((prev) => prev + delta);

    setTimeout(() => {
      setResultIdx(idx);
      localStorage.setItem(COOLDOWN_KEY, nowISO());
      if (rewards[idx].kind.type !== "NONE") {
        setBurst(true);
        setTimeout(() => setBurst(false), 1600);
      }
      setSpinning(false);
    }, 5400);
  };

  const rw = resultIdx != null ? rewards[resultIdx] : null;

  const buildWhatsAppUrl = (reward: Reward) => {
    let msg = "Hola! 🎡 Jugué a la Ruleta Nova!";
    if (reward.kind.type === "PERCENT")
      msg = `Hola! 🍣 Gané un ${reward.kind.value}% de descuento en la Ruleta Nova y quiero usarlo en mi próximo pedido.`;
    else if (reward.kind.type === "ITEM")
      msg = `Hola! 🍣 Gané ${reward.kind.value} en la Ruleta Nova y quiero usarlo en mi próximo pedido.`;
    else if (reward.kind.type === "SHIPPING")
      msg = `Hola! 🚗 Gané envío gratis en la Ruleta Nova y quiero aprovecharlo en mi próximo pedido.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <main className="relative min-h-dvh w-full bg-[color:var(--coal,#0C0B0A)] text-white flex items-center justify-center p-6 overflow-hidden">
      {/* BG mitad derecha con imagen */}
      <div
        className="absolute inset-y-0 right-0 w-1/2"
        style={{
          backgroundImage: `url(${RIGHT_BG_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* capas para legibilidad sobre la foto */}
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-black/70 via-black/40 to-transparent backdrop-blur-[2px]" />
      {/* halo general */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(1200px_700px_at_40%_-10%,rgba(198,160,90,0.10),transparent)]" />

      <div className="relative w-full max-w-6xl grid md:grid-cols-[520px_1fr] gap-10 items-center">
        {/* Columna Izquierda (ruleta) */}
        <section className="relative flex flex-col items-center gap-5">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300">
              <TimerReset className="w-4 h-4" /> 1 giro cada 24 h
            </div>
            <h1 className="text-4xl font-black tracking-tight mt-3">
              Ruleta Nova
            </h1>
            <p className="text-zinc-300 mt-1">
              Girá y desbloqueá beneficios para tu próximo pedido ✨
            </p>
          </div>

          <div className="relative rounded-[32px] p-6 bg-black/30 border border-white/10 backdrop-blur-sm shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <Wheel rewards={rewards} angle={angle} />
            <EnhancedConfetti
              show={burst}
              duration={1800}
              colors={["#E7E2D4", "#C6A05A", "#B3873B", "#FFF7DF"]}
              origin="bottom-center" // ← hace que el emisor sea la punta del puntero
              originOffsetY={34} // ← afiná 30–40 según tu puntero; 34 suele calzar bien
              spreadDeg={70} // ← abanico un poco más abierto
            />
          </div>

          <button
            onClick={spin}
            disabled={!canSpin}
            className="px-7 py-3 rounded-2xl shadow-lg bg-gradient-to-r from-[var(--ivory,#E7E2D4)] to-[var(--gold,#C6A05A)] text-black font-extrabold disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
            title={
              canSpin
                ? "Girar ahora"
                : cooldownLeft > 0
                ? `Disponible en ${formatHMS(cooldownLeft)}`
                : undefined
            }
          >
            {spinning
              ? "Girando..."
              : canSpin
              ? "¡Girar!"
              : `Disponible en ${formatHMS(cooldownLeft)}`}
          </button>
        </section>

        {/* Columna Derecha (info sobre foto) */}
        <section className="space-y-5">
          <div className="rounded-[24px] p-6 bg-black/35 border border-white/10 backdrop-blur-md">
            <h2 className="text-xl font-bold">Resultado</h2>
            {!rw && (
              <p className="text-zinc-300 mt-2">
                Tocá “¡Girar!” para descubrir tu premio.
              </p>
            )}
            {rw && (
              <div className="mt-4">
                <div
                  className="text-3xl font-black tracking-tight"
                  style={{ color: PALETTE.ivory }}
                >
                  {rw.label}
                </div>
                <p className="text-zinc-200 mt-2 leading-relaxed">
                  {rw.detail}
                </p>
                {rw.kind.type !== "NONE" ? (
                  <a
                    href={buildWhatsAppUrl(rw)}
                    target="_blank"
                    className="inline-flex items-center gap-2 mt-5 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition shadow"
                  >
                    <MessageCircle className="w-5 h-5" /> Enviar a WhatsApp
                  </a>
                ) : (
                  <p className="text-sm text-zinc-300 mt-5">
                    Sin premio esta vez, ¡te esperamos mañana! 🥢
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[24px] p-6 bg-black/35 border border-white/10 backdrop-blur-md">
            <h3 className="text-lg font-bold">Cómo funciona</h3>
            <ul className="list-disc list-inside text-sm text-zinc-200 mt-2 space-y-1">
              <li>
                1 giro por día (24 h entre giros). Se guarda localmente en tu
                dispositivo.
              </li>
              <li>
                El beneficio se coordina por WhatsApp; no acumulable con otras
                promos.
              </li>
              <li>
                Premios sujetos a disponibilidad. Delivery con radio habilitado.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
