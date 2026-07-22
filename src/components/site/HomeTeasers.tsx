import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { fetchFeaturedGallery, type GalleryItem } from "@/lib/gallery";

const TEASER_COUNT = 3;

export function HomeTeasers() {
  const [featured, setFeatured] = useState<GalleryItem[]>([]);

  useEffect(() => {
    let alive = true;
    fetchFeaturedGallery(TEASER_COUNT).then((items) => {
      if (!alive) return;
      setFeatured(items);
    });
    return () => {
      alive = false;
    };
  }, []);


  return (
    <>
      {/* Catálogo destacado */}
      <section className="relative bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-6 border-b border-foreground/15 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
                — Nuestros favoritos
              </p>
              <h2 className="font-display text-5xl leading-none text-primary sm:text-7xl">
                Un anticipo <br />
                de la <span className="text-secondary">carta</span>
              </h2>
            </div>
            <Link
              to="/tienda"
              className="inline-flex items-center gap-3 rounded-sm border border-primary bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90"
            >
              Ir a la tienda →
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item, i) => (
              <li
                key={`${item.src}-${i}`}
                className="group relative flex flex-col overflow-hidden rounded-sm border border-foreground/10 bg-card shadow-[var(--shadow-card)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  {item.tag ? (
                    <span className="absolute left-3 top-3 rounded-sm bg-background/90 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                      {item.tag}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="font-serif text-lg font-bold leading-tight text-foreground">
                    {item.alt}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.caption}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>


      {/* Encargos + Contacto CTA split */}
      <section className="grid gap-0 lg:grid-cols-2">
        <div className="relative overflow-hidden bg-primary p-10 text-primary-foreground sm:p-16">
          <img
            src={customCake}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="relative">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
              — Encargos a medida
            </p>
            <h3 className="font-display text-4xl leading-none sm:text-6xl">
              Tu ocasión, <br />
              <span className="text-secondary">nuestra receta.</span>
            </h3>
            <p className="mt-5 max-w-md text-primary-foreground/80">
              Tartas, mesas dulces y catering diseñados contigo, desde el concepto
              hasta el último detalle comestible.
            </p>
            <Link
              to="/encargos"
              className="mt-8 inline-block rounded-sm bg-secondary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90"
            >
              Pedir presupuesto
            </Link>
          </div>
        </div>

        <div className="relative bg-secondary p-10 text-secondary-foreground sm:p-16">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-primary/80">
            — Visítanos
          </p>
          <h3 className="font-display text-4xl leading-none text-primary sm:text-6xl">
            Bullas, <br />
            <span className="text-secondary-foreground">Murcia.</span>
          </h3>
          <p className="mt-5 max-w-md text-primary/80">
            Un espacio confortable y acogedor, con madera natural y buena luz.
            Ven, disfruta de nuestra repostería y quédate a un café.
          </p>
          <Link
            to="/contacto"
            className="mt-8 inline-block rounded-sm bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90"
          >
            Cómo llegar
          </Link>
        </div>
      </section>
    </>
  );
}
