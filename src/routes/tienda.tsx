import { createFileRoute } from "@tanstack/react-router";
import { Catalog } from "@/components/site/Catalog";

export const Route = createFileRoute("/tienda")({
  head: () => ({
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
      { property: "og:url", content: "/tienda" },
    ],
    links: [{ rel: "canonical", href: "/tienda" }],
  }),
  component: TiendaPage,
});

function TiendaPage() {
  return (
    <main className="grain">
      <Catalog />
    </main>
  );
}
