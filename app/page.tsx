import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0C0B0A] text-white">
      {/* Halo dorado suave */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_-10%,rgba(198,160,90,0.12),transparent)]" />

      <div className="mx-auto flex min-h-dvh max-w-6xl items-center justify-center px-6">
        <section className="w-full text-center">

          {/* Logo */}
          <div className="relative mx-auto mb-8 flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(198,160,90,0.15),transparent)]" />
            <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-2 border-[rgba(198,160,90,0.4)] bg-gradient-to-br from-black to-[#1a1a1a] shadow-[0_0_25px_rgba(198,160,90,0.25)] overflow-hidden">
              <img
                src="/LOGO.png"
                alt="Nóva Sushi"
                className="object-contain w-[150px] h-[150px] scale-[1.08]"
              />
            </div>
          </div>

          {/* Títulos */}
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Ruleta <span className="text-[#E7E2D4]">Nova</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-zinc-300">
            Girá y desbloqueá beneficios para tu próximo pedido ✨
          </p>

          {/* CTA */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/ruleta?orderId=DEMO123"
              className="rounded-2xl px-6 py-3 font-extrabold text-black shadow-lg transition hover:brightness-110
                         bg-gradient-to-r from-[#E7E2D4] to-[#C6A05A]"
            >
              Ir a la ruleta
            </Link>

            <a
              href="https://wa.me/5493512583838"
              target="_blank"
              className="rounded-2xl px-6 py-3 font-semibold text-white/90 transition 
                         border border-white/10 bg-white/5 hover:bg-white/10"
            >
              Pedir por WhatsApp
            </a>
          </div>

          {/* Footer mini */}
          <p className="mt-6 text-xs text-zinc-500">
            © {new Date().getFullYear()} Nóva Sushi — Córdoba
          </p>
        </section>
      </div>
    </main>
  );
}
