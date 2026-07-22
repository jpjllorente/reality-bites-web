import { createFileRoute } from "@tanstack/react-router";
import { Catalog } from "@/components/site/Catalog";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PaymentTestModeBanner } from "@/components/site/PaymentTestModeBanner";
import { getRequestOrigin } from "@/lib/origin.functions";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import { products } from "@/lib/products";
import ogImage from "@/assets/product-1.jpg";


export const Route = createFileRoute("/tienda")({
  loader: async () => ({ origin: await getRequestOrigin() }),
  head: ({ loaderData }) => {
    const origin = loaderData?.origin ?? "";
    const absImage = `${origin}${ogImage}`;
    return {
      meta: [
        { title: "Tienda — 144 Reality Bites & Coffee" },
        {
          name: "description",
          content:
            "Catálogo online de repostería, café de especialidad y bites. Arma tu pedido y lo confirmamos por WhatsApp.",
        },
        { property: "og:title", content: "Tienda — 144 Reality" },
        {
          property: "og:description",
          content: "Catálogo online de repostería y café. Pedidos por WhatsApp.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://144reality.com/tienda" },
        { property: "og:image", content: absImage },
        { property: "og:image:alt", content: "Repostería de 144 Reality" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Tienda — 144 Reality" },
        {
          name: "twitter:description",
          content: "Catálogo online de repostería y café. Pedidos por WhatsApp.",
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
            hasMenuSection: [
              {
                "@type": "MenuSection",
                name: "Repostería",
                hasMenuItem: products
                  .filter((p) => p.category === "Repostería")
                  .map((p) => ({
                    "@type": "MenuItem",
                    name: p.name,
                    description: p.description,
                    image: `${origin}${p.image}`,
                    offers: {
                      "@type": "Offer",
                      price: p.price.toFixed(2),
                      priceCurrency: "EUR",
                    },
                  })),
              },
              {
                "@type": "MenuSection",
                name: "Café",
                hasMenuItem: products
                  .filter((p) => p.category === "Café")
                  .map((p) => ({
                    "@type": "MenuItem",
                    name: p.name,
                    description: p.description,
                    image: `${origin}${p.image}`,
                    offers: {
                      "@type": "Offer",
                      price: p.price.toFixed(2),
                      priceCurrency: "EUR",
                    },
                  })),
              },
              {
                "@type": "MenuSection",
                name: "Bites",
                hasMenuItem: products
                  .filter((p) => p.category === "Bites")
                  .map((p) => ({
                    "@type": "MenuItem",
                    name: p.name,
                    description: p.description,
                    image: `${origin}${p.image}`,
                    offers: {
                      "@type": "Offer",
                      price: p.price.toFixed(2),
                      priceCurrency: "EUR",
                    },
                  })),
              },
            ],
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
              image: `${origin}${p.image}`,
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
  return (
    <>
      <Header />
      <main className="grain">
        <Catalog />
      </main>
      <Footer />
    </>
  );
}
