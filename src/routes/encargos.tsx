import { createFileRoute } from "@tanstack/react-router";
import { CustomOrders } from "@/components/site/CustomOrders";
import { Faq, faqs } from "@/components/site/Faq";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getRequestOrigin } from "@/lib/origin.functions";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import ogImage from "@/assets/custom-cake.jpg";


export const Route = createFileRoute("/encargos")({
  loader: async () => ({ origin: await getRequestOrigin() }),
  head: ({ loaderData }) => {
    const origin = loaderData?.origin ?? "";
    const absImage = `${origin}${ogImage}`;
    return {
      meta: [
        { title: "Encargos a medida — 144 Reality Bites & Coffee" },
        {
          name: "description",
          content:
            "Tartas, mesas dulces y catering personalizados para cumpleaños, bodas y eventos. Cuéntanos tu idea y te respondemos en 24h.",
        },
        { property: "og:title", content: "Encargos a medida — 144 Reality" },
        {
          property: "og:description",
          content: "Tartas y catering diseñados a medida para tu ocasión.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "/encargos" },
        { property: "og:image", content: absImage },
        { property: "og:image:alt", content: "Tarta personalizada de 144 Reality" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Encargos a medida — 144 Reality" },
        {
          name: "twitter:description",
          content: "Tartas y catering diseñados a medida para tu ocasión.",
        },
        { name: "twitter:image", content: absImage },
      ],
      links: [{ rel: "canonical", href: "/encargos" }],
      scripts: [
        breadcrumbJsonLd(origin, [
          { name: "Inicio", path: "/" },
          { name: "Encargos", path: "/encargos" },
        ]),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
      ],
    };
  },
  component: EncargosPage,
});

function EncargosPage() {
  return (
    <>
      <Header />
      <main className="grain">
        <CustomOrders />
        <Faq />
      </main>
      <Footer />
    </>
  );
}

