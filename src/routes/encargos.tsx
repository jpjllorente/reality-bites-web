import { createFileRoute } from "@tanstack/react-router";
import { CustomOrders } from "@/components/site/CustomOrders";

export const Route = createFileRoute("/encargos")({
  head: () => ({
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
      { property: "og:url", content: "/encargos" },
    ],
    links: [{ rel: "canonical", href: "/encargos" }],
  }),
  component: EncargosPage,
});

function EncargosPage() {
  return (
    <main className="grain">
      <CustomOrders />
    </main>
  );
}
