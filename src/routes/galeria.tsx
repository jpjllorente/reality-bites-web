import { createFileRoute } from "@tanstack/react-router";
import { Gallery } from "@/components/site/Gallery";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getRequestOrigin } from "@/lib/origin.functions";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";
import ogImage from "@/assets/gallery-1.jpg";

export const Route = createFileRoute("/galeria")({
  loader: async () => ({ origin: await getRequestOrigin() }),
  head: ({ loaderData }) => {
    const origin = loaderData?.origin ?? "";
    const absImage = `${origin}${ogImage}`;
    return {
      meta: [
        { title: "Galería — 144 Reality Bites & Coffee" },
        {
          name: "description",
          content:
            "Feed visual de 144 Reality: repostería, café de especialidad y momentos del local. Selección curada desde nuestro Instagram.",
        },
        { property: "og:title", content: "Galería — 144 Reality" },
        {
          property: "og:description",
          content:
            "Feed visual de 144 Reality: repostería, café y momentos del local.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://144reality.com/galeria" },
        { property: "og:image", content: absImage },
        { property: "og:image:alt", content: "Tartaleta de 144 Reality" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Galería — 144 Reality" },
        {
          name: "twitter:description",
          content: "Feed visual de 144 Reality en Bullas, Murcia.",
        },
        { name: "twitter:image", content: absImage },
      ],
      links: [{ rel: "canonical", href: "https://144reality.com/galeria" }],
      scripts: [
        breadcrumbJsonLd(origin, [
          { name: "Inicio", path: "/" },
          { name: "Galería", path: "/galeria" },
        ]),
      ],
    };
  },
  component: GaleriaPage,
});

function GaleriaPage() {
  return (
    <>
      <Header />
      <main className="grain">
        <Gallery />
      </main>
      <Footer />
    </>
  );
}
