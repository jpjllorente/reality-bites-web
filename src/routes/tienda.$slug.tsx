import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getRequestOrigin } from "@/lib/origin.functions";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import { fetchPublicProductBySlug, type Product } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";


export const Route = createFileRoute("/tienda/$slug")({
  loader: async ({ params }) => {
    const [origin, product] = await Promise.all([
      getRequestOrigin(),
      fetchPublicProductBySlug(params.slug),
    ]);
    if (!product) throw notFound();
    return { origin, product };
  },
  errorComponent: ({ error, reset }) => (
    <>
      <Header />
      <main className="grain grid min-h-[50vh] place-items-center px-4 py-20 text-center">
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">Error</p>
          <h1 className="font-display text-4xl text-primary">No pudimos cargar el producto</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => reset()}
            className="mt-6 rounded-sm border border-primary px-5 py-2 text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      </main>
      <Footer />
    </>
  ),
  notFoundComponent: () => (
    <>
      <Header />
      <main className="grain grid min-h-[50vh] place-items-center px-4 py-20 text-center">
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">404</p>
          <h1 className="font-display text-4xl text-primary">Producto no encontrado</h1>
          <Link
            to="/tienda"
            className="mt-6 inline-block rounded-sm border border-primary px-5 py-2 text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground"
          >
            Volver a la tienda
          </Link>
        </div>
      </main>
      <Footer />
    </>
  ),
  head: ({ loaderData, params }) => {
    const origin = loaderData?.origin ?? "";
    const p = loaderData?.product;
    const path = `/tienda/${params.slug}`;
    const canonical = `https://144reality.com${path}`;
    const title = p?.seoTitle?.trim() || (p ? `${p.name} — 144 Reality` : "Producto — 144 Reality");
    const description =
      p?.seoDescription?.trim() ||
      p?.description?.trim() ||
      "Repostería artesana y café de especialidad en Bullas, Murcia.";
    const image = p?.image ? (p.image.startsWith("http") ? p.image : `${origin}${p.image}`) : "";
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "product" },
      { property: "og:url", content: canonical },
      ...(image
        ? [
            { property: "og:image", content: image },
            { property: "og:image:alt", content: p?.name ?? "" },
            { name: "twitter:image", content: image },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(p?.tags?.length ? [{ name: "keywords", content: p.tags.join(", ") }] : []),
    ];
    const scripts = [
      ...(p
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: p.name,
                description,
                image: image || undefined,
                category: p.category,
                keywords: p.tags?.join(", "),
                brand: { "@type": "Brand", name: "144 Reality Bites & Coffee" },
                offers: {
                  "@type": "Offer",
                  price: p.price.toFixed(2),
                  priceCurrency: "EUR",
                  availability: "https://schema.org/InStock",
                  url: canonical,
                },
              }),
            },
          ]
        : []),
      breadcrumbJsonLd(origin, [
        { name: "Inicio", path: "/" },
        { name: "Tienda", path: "/tienda" },
        { name: p?.name ?? params.slug, path },
      ]),
    ];
    return {
      meta,
      links: [{ rel: "canonical", href: canonical }],
      scripts,
    };
  },
  component: ProductPage,
});

function formatPrice(v: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  return <ProductDetail product={product} />;
}

function ProductDetail({ product }: { product: Product }) {
  const navigate = Route.useNavigate();
  const cart = useCart();
  const activeVariants = (product.variants ?? []).filter((v) => v.active);
  const hasVariants = activeVariants.length > 0;
  const hasPortion = product.portionPrice != null && product.portionPrice > 0;
  const [variantId, setVariantId] = useState<string | undefined>(undefined);
  const [portion, setPortion] = useState<boolean | null>(hasPortion ? null : false);
  const [error, setError] = useState<string | null>(null);
  const outOfStock = product.inStock === false;
  const effectivePortion = portion === true;
  const unitPrice = effectivePortion && hasPortion ? (product.portionPrice as number) : product.price;

  function addToCart(goToCart: boolean) {
    if (outOfStock) return;
    if (hasPortion && portion === null) {
      setError("Elige el tamaño (completo o porción).");
      return;
    }
    if (hasVariants && !variantId) {
      setError("Selecciona una variante antes de continuar.");
      return;
    }
    setError(null);
    const variant = activeVariants.find((v) => v.id === variantId);
    cart.add(product, {
      variantId: variant?.id,
      variantName: variant?.name,
      portion: effectivePortion && hasPortion,
    });
    if (goToCart) navigate({ to: "/tienda" });
  }

  return (
    <>
      <Header />
      <main className="grain bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
          <nav className="mb-8 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <Link to="/" className="hover:text-primary">Inicio</Link>
            <span className="mx-2">/</span>
            <Link to="/tienda" className="hover:text-primary">Tienda</Link>
            <span className="mx-2">/</span>
            <span className="text-primary">{product.name}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-2">
            <div className="overflow-hidden rounded-sm border border-foreground/10 bg-muted">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  width={1200}
                  height={1200}
                />
              ) : (
                <div className="aspect-square" />
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
                  {product.category}
                </p>
                <h1 className="font-display text-5xl leading-none text-primary sm:text-6xl">
                  {product.name}
                </h1>
              </div>

              {product.tags.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {product.tags.map((t) => (
                    <li
                      key={t}
                      className="rounded-sm border border-secondary/40 bg-secondary/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-secondary"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-lg leading-relaxed text-foreground/80">{product.description}</p>

              {hasPortion && (
                <fieldset className="rounded-sm border border-foreground/15 p-3">
                  <legend className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Tamaño <span className="text-destructive">*</span>
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    <label className={`flex-1 cursor-pointer rounded-sm border px-3 py-2 text-sm transition ${portion === false ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20 hover:border-primary"}`}>
                      <input type="radio" name="size" checked={portion === false} onChange={() => { setPortion(false); setError(null); }} className="sr-only" />
                      Artículo completo · {formatPrice(product.price)}
                    </label>
                    <label className={`flex-1 cursor-pointer rounded-sm border px-3 py-2 text-sm transition ${portion === true ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20 hover:border-primary"}`}>
                      <input type="radio" name="size" checked={portion === true} onChange={() => { setPortion(true); setError(null); }} className="sr-only" />
                      Porción · {formatPrice(product.portionPrice as number)}
                    </label>
                  </div>
                </fieldset>
              )}

              {activeVariants.length > 0 && (
                <fieldset className="rounded-sm border border-foreground/15 p-3">
                  <legend className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Variante <span className="text-destructive">*</span>
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {activeVariants.map((v) => (
                      <label
                        key={v.id}
                        className={`cursor-pointer rounded-sm border px-3 py-2 text-sm transition ${variantId === v.id ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20 hover:border-primary"}`}
                      >
                        <input type="radio" name="variant" checked={variantId === v.id} onChange={() => { setVariantId(v.id); setError(null); }} className="sr-only" />
                        {v.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex items-baseline gap-3 border-y border-foreground/15 py-4">
                <span className="font-display text-5xl text-primary">
                  {formatPrice(unitPrice)}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  IVA incluido
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => addToCart(true)}
                  className="inline-flex items-center rounded-sm bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {outOfStock ? "Agotado" : "Añadir al pedido"}
                </button>
                <Link
                  to="/encargos"
                  className="inline-flex items-center rounded-sm border border-primary px-5 py-3 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Encargo a medida
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

