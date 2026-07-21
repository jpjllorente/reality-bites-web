import { useEffect, useState } from "react";
import logoAsset from "@/assets/logo-144reality.jpeg.asset.json";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";

const slides = [
  {
    src: hero1,
    kicker: "Colección de temporada",
    title: "Repostería que cruje, funde y sorprende",
    caption: "Piezas modernas horneadas cada mañana en nuestro obrador.",
  },
  {
    src: hero2,
    kicker: "Café de especialidad",
    title: "Un buen café merece una buena mesa",
    caption: "Blend de tueste medio, extraído con precisión.",
  },
  {
    src: hero3,
    kicker: "Bienvenidos al 144",
    title: "Ladrillo, acero y azúcar",
    caption: "Un local industrial pensado para quedarse un rato más.",
  },
];

export function Hero() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      {/* Slides */}
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div
            key={s.src}
            className={`absolute inset-0 transition-opacity duration-[1600ms] ease-in-out ${
              i === idx ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={i !== idx}
          >
            <img
              src={s.src}
              alt=""
              className={`h-full w-full object-cover ${i === idx ? "fade-slide" : ""}`}
              width={1600}
              height={1200}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
        {/* Vignette + green wash to blend the vintage industrial vibe */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/40 to-primary/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,oklch(0.22_0.03_145_/0.7)_100%)]" />
      </div>

      {/* Top bar with logo + nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-10">
        <a href="#inicio" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-background/95 ring-2 ring-secondary/70">
            <img
              src={logoAsset.url}
              alt="144 Reality Bites & Coffee"
              className="h-9 w-9 rounded-full object-cover"
            />
          </span>
          <span className="hidden font-display text-2xl tracking-widest text-primary-foreground sm:inline">
            144 REALITY
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium uppercase tracking-widest md:flex">
          <a href="#catalogo" className="hover:text-secondary">Catálogo</a>
          <a href="#encargos" className="hover:text-secondary">Encargos</a>
          <a href="#contacto" className="hover:text-secondary">Contacto</a>
        </nav>
        <a
          href="#catalogo"
          className="hidden rounded-sm border border-secondary bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90 md:inline-block"
        >
          Pedir online
        </a>
      </header>

      {/* Hero copy */}
      <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-7xl flex-col justify-end px-4 pb-16 sm:px-6 lg:px-10 lg:pb-24">
        <div className="max-w-3xl">
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-secondary">
            <span className="h-px w-10 bg-secondary" />
            {slides[idx].kicker}
          </div>
          <h1 className="font-display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
            {slides[idx].title}
          </h1>
          <p className="mt-5 max-w-xl text-base text-primary-foreground/85 sm:text-lg">
            {slides[idx].caption}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#catalogo"
              className="rounded-sm bg-secondary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90"
            >
              Ver catálogo
            </a>
            <a
              href="#encargos"
              className="rounded-sm border border-primary-foreground/40 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground transition hover:border-secondary hover:text-secondary"
            >
              Encargos a medida
            </a>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="mt-10 flex items-center gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              className={`h-1 rounded-full transition-all ${
                i === idx ? "w-10 bg-secondary" : "w-5 bg-primary-foreground/40 hover:bg-primary-foreground/70"
              }`}
            />
          ))}
          <span className="ml-4 font-mono text-xs tracking-widest text-primary-foreground/60">
            0{idx + 1} / 0{slides.length}
          </span>
        </div>
      </div>

      {/* Ticker */}
      <div className="relative z-10 border-y border-primary-foreground/15 bg-primary/60 py-3 backdrop-blur">
        <div className="marquee-track flex whitespace-nowrap font-display text-lg tracking-[0.25em] text-primary-foreground/80">
          {Array.from({ length: 2 }).map((_, r) => (
            <div key={r} className="flex shrink-0 items-center gap-10 pr-10">
              {["Repostería moderna", "★", "Café de especialidad", "★", "Encargos a medida", "★", "Obrador propio", "★", "Bites & Coffee", "★"].map((t, i) => (
                <span key={`${r}-${i}`}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
