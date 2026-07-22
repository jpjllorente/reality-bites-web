import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/site/Hero";
import { HomeTeasers } from "@/components/site/HomeTeasers";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "144 Reality — Bites & Coffee | Repostería moderna & café de especialidad" },
      {
        name: "description",
        content:
          "Repostería moderna, servicio en sala y encargos a medida en un local confortable y acogedor en Bullas, Murcia.",
      },
      { property: "og:title", content: "144 Reality — Bites & Coffee | Repostería moderna & café de especialidad" },
      {
        property: "og:description",
        content: "Repostería moderna, servicio en sala y encargos a medida en un local confortable y acogedor en Bullas, Murcia.",
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
          "@type": "Organization",
          "@id": "https://144reality.com/#organization",
          name: "144 Reality — Bites & Coffee",
          alternateName: "144 Reality",
          url: "https://144reality.com/",
          logo: "https://144reality.com/favicon.ico",
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
