import { createFileRoute } from "@tanstack/react-router";
import { Catalog } from "@/components/site/Catalog";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getRequestOrigin } from "@/lib/origin.functions";
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
        { property: "og:url", content: "/tienda" },
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
      links: [{ rel: "canonical", href: "/tienda" }],
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
