import { createFileRoute } from "@tanstack/react-router";
import { Contact } from "@/components/site/Contact";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getRequestOrigin } from "@/lib/origin.functions";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import ogImage from "@/assets/hero-3.jpg";

export const Route = createFileRoute("/contacto")({
  loader: async () => ({ origin: await getRequestOrigin() }),
  head: ({ loaderData }) => {
    const origin = loaderData?.origin ?? "";
    const absImage = `${origin}${ogImage}`;
    return {
      meta: [
        { title: "Contacto — 144 Reality Bites & Coffee" },
        {
          name: "description",
          content:
            "Dónde estamos, horarios y cómo contactar con 144 Reality Bites & Coffee en Bullas, Murcia.",
        },
        { property: "og:title", content: "Contacto — 144 Reality" },
        {
          property: "og:description",
          content: "Dirección, horarios y contacto de 144 Reality en Bullas, Murcia.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "/contacto" },
        { property: "og:image", content: absImage },
        { property: "og:image:alt", content: "Interior acogedor de 144 Reality" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Contacto — 144 Reality" },
        {
          name: "twitter:description",
          content: "Dirección, horarios y contacto de 144 Reality en Bullas, Murcia.",
        },
        { name: "twitter:image", content: absImage },
      ],
      links: [{ rel: "canonical", href: "/contacto" }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CafeOrCoffeeShop",
            "@id": `${origin}/#business`,
            name: "144 Reality Bites & Coffee",
            image: absImage,
            url: origin || undefined,
            telephone: "+34681634623",
            priceRange: "€€",
            servesCuisine: ["Repostería", "Café de especialidad"],
            address: {
              "@type": "PostalAddress",
              streetAddress: "Calle Francisco González Conde, 37",
              addressLocality: "Bullas",
              addressRegion: "Murcia",
              postalCode: "30180",
              addressCountry: "ES",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: 38.046,
              longitude: -1.668,
            },
            sameAs: [
              "https://www.instagram.com/144reality_bitesandcoffee",
            ],
            hasMenu: `${origin}/tienda`,
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "08:30",
                closes: "13:00",
              },
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "15:30",
                closes: "20:00",
              },
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Saturday", "Sunday", "PublicHolidays"],
                opens: "08:30",
                closes: "13:00",
              },
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Saturday", "Sunday", "PublicHolidays"],
                opens: "15:30",
                closes: "21:00",
              },
            ],
            additionalProperty: {
              "@type": "PropertyValue",
              name: "timezone",
              value: "Europe/Madrid",
            },
          }),
        },
        breadcrumbJsonLd(origin, [
          { name: "Inicio", path: "/" },
          { name: "Contacto", path: "/contacto" },
        ]),
      ],
    };
  },
  component: ContactoPage,
});

function ContactoPage() {
  return (
    <>
      <Header />
      <main className="grain">
        <Contact />
      </main>
      <Footer />
    </>
  );
}
