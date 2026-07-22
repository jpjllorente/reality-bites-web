import { useEffect, useState } from "react";
import { fetchPublicGallery, type GalleryItem } from "@/lib/gallery";

const INSTAGRAM_URL = "https://instagram.com/144reality_bitesandcoffee";

export function Gallery() {
  const [active, setActive] = useState<GalleryItem | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    fetchPublicGallery().then(setItems).catch(() => setItems([]));
  }, []);


  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <header className="mb-10 flex flex-col gap-4 border-b border-foreground/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-secondary">
            @144reality_bitesandcoffee
          </p>
          <h1 className="mt-2 font-display text-4xl uppercase tracking-widest text-primary sm:text-5xl">
            Galería
          </h1>
          <p className="mt-3 max-w-xl text-sm text-foreground/70">
            Un vistazo curado a nuestro Instagram: creaciones dulces, café de
            especialidad y momentos del local.
          </p>
        </div>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-sm border border-secondary bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90"
        >
          Ver más en Instagram →
        </a>
      </header>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={`${item.src}-${i}`}>
            <button
              type="button"
              onClick={() => setActive(item)}
              className="group relative block aspect-square w-full overflow-hidden rounded-sm bg-primary/10 ring-1 ring-foreground/10 transition hover:ring-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              aria-label={`Ampliar: ${item.alt}`}
            >
              <img
                src={item.src}
                alt={item.alt}
                loading={i < 4 ? "eager" : "lazy"}
                width={1024}
                height={1024}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-primary/85 via-primary/40 to-transparent p-3 text-[10px] font-medium uppercase tracking-widest text-primary-foreground opacity-0 transition group-hover:opacity-100">
                <span className="line-clamp-2 text-left">{item.caption}</span>
                <span className="shrink-0 font-mono">{item.tag}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/90 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-sm bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.src}
              alt={active.alt}
              className="max-h-[70vh] w-full object-contain bg-primary"
            />
            <div className="flex items-center justify-between gap-4 border-t border-foreground/10 px-5 py-4">
              <div>
                <p className="text-sm text-foreground">{active.caption}</p>
                <p className="font-mono text-[11px] uppercase tracking-widest text-secondary">
                  {active.tag}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-sm border border-foreground/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground hover:bg-foreground/5"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
