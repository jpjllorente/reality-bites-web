import { createFileRoute } from "@tanstack/react-router";
import { Catalog } from "@/components/site/Catalog";
import type { Product } from "@/lib/products";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PaymentTestModeBanner } from "@/components/site/PaymentTestModeBanner";
import { getRequestOrigin } from "@/lib/origin.functions";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import { fetchPublicProductsServer } from "@/lib/products-public.functions";

const SOCIAL_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/2aTFzYNJqUYfQfMni6aWXLFYWj02/social-images/social-1784650264228-07408EC5-D139-47C6-8B5A-98C8F730DE42.webp";

export const Route = createFileRoute("/tienda/")({
  loader: async () => ({
    origin: await getRequestOrigin(),
    products: await fetchPublicProductsServer(),
  }),
  head: ({ loaderData }) => {
    const origin = loaderData?.origin ?? "";
    const products = loaderData?.products ?? [];
    const absImage = SOCIAL_IMAGE;
    const abs = (u: string) => (u.startsWith("http") ? u : `${origin}${u}`);

    const sectionFor = (cat: string) => ({
      "@type": "MenuSection",
      name: cat,
      hasMenuItem: products
        .filter((p) => p.category === cat)
        .map((p) => ({
          "@type": "MenuItem",
          name: p.name,
          description: p.description,
          image: abs(p.image),
          offers: {
            "@type": "Offer",
            price: p.price.toFixed(2),
            priceCurrency: "EUR",
          },
        })),
    });

    return {
      meta: [
        { title: "Tienda — 144 Reality Bites & Coffee" },
        {
          name: "description",
          content:
            "Catálogo online de repostería, café de especialidad y bites. Arma tu pedido y págalo con tarjeta.",
        },
        { property: "og:title", content: "Tienda — 144 Reality" },
        {
          property: "og:description",
          content: "Catálogo online de repostería y café. Pago con tarjeta.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://144reality.com/tienda" },
        { property: "og:image", content: absImage },
        { property: "og:image:alt", content: "Repostería de 144 Reality" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Tienda — 144 Reality" },
        {
          name: "twitter:description",
          content: "Catálogo online de repostería y café. Pago con tarjeta.",
        },
        { name: "twitter:image", content: absImage },
      ],
      links: [{ rel: "canonical", href: "https://144reality.com/tienda" }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Menu",
            name: "Catálogo 144 Reality",
            url: `${origin}/tienda`,
            hasMenuSection: ["Repostería", "Café", "Bites"].map(sectionFor),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Catálogo 144 Reality",
            url: "https://144reality.com/tienda",
            numberOfItems: products.length,
            itemListElement: products.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://144reality.com/tienda/${p.slug ?? p.id}`,
              name: p.name,
              image: abs(p.image),
            })),
          }),
        },
        breadcrumbJsonLd(origin, [
          { name: "Inicio", path: "/" },
          { name: "Tienda", path: "/tienda" },
        ]),
      ],
    };
  },
  component: TiendaPage,
});

function TiendaPage() {
  const { products } = Route.useLoaderData();
  return (
    <>
      <PaymentTestModeBanner />
      <Header />
      <main className="grain">
        <Catalog initialProducts={products as unknown as Product[]} />
      </main>
      <Footer />
    </>
  );
}
