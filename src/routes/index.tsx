import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/site/Hero";
import { HomeTeasers } from "@/components/site/HomeTeasers";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pastelería y cafetería en Bullas | 144 Reality Bites & Coffee" },
      {
        name: "description",
        content:
          "Repostería americana y del mundo en Bullas: tartas por encargo, donuts, cookies, brownies, café y opciones saladas. Compra online o recoge en el local.",
      },
      { property: "og:title", content: "Pastelería y cafetería en Bullas | 144 Reality" },
      {
        property: "og:description",
        content: "Tartas por encargo, donuts, cookies, brownies, café y sabores del mundo. Compra online o visítanos en Bullas, Murcia.",
      },
      { property: "og:url", content: "https://144reality.com/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://144reality.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": ["Organization", "LocalBusiness", "Bakery"],
          "@id": "https://144reality.com/#organization",
          name: "144 Reality — Bites & Coffee",
          alternateName: "144 Reality",
          url: "https://144reality.com/",
          logo: "https://144reality.com/favicon.ico",
          image: "https://storage.googleapis.com/gpt-engineer-file-uploads/2aTFzYNJqUYfQfMni6aWXLFYWj02/social-images/social-1784650264228-07408EC5-D139-47C6-8B5A-98C8F730DE42.webp",
          telephone: "+34681634623",
          priceRange: "€€",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Calle Francisco González Conde, 37",
            addressLocality: "Bullas",
            addressRegion: "Murcia",
            postalCode: "30180",
            addressCountry: "ES",
          },
          hasMenu: "https://144reality.com/tienda",
          sameAs: ["https://www.instagram.com/144reality_bitesandcoffee/"],
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: "+34681634623",
              contactType: "customer service",
              areaServed: "ES",
              availableLanguage: ["Spanish"],
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": "https://144reality.com/#website",
          url: "https://144reality.com/",
          name: "144 Reality — Bites & Coffee",
          publisher: { "@id": "https://144reality.com/#organization" },
          inLanguage: "es-ES",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://144reality.com/tienda?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <main className="grain">
        <Hero />
        <HomeTeasers />
      </main>
      <Footer />
    </>
  );
}
