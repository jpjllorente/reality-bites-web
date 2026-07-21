import { createFileRoute } from "@tanstack/react-router";
import { Contact } from "@/components/site/Contact";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto — 144 Reality Bites & Coffee" },
      {
        name: "description",
        content:
          "Dónde estamos, horarios y cómo contactar con 144 Reality Bites & Coffee en Madrid.",
      },
      { property: "og:title", content: "Contacto — 144 Reality" },
      {
        property: "og:description",
        content: "Dirección, horarios y contacto de 144 Reality en Madrid.",
      },
      { property: "og:url", content: "/contacto" },
    ],
    links: [{ rel: "canonical", href: "/contacto" }],
  }),
  component: ContactoPage,
});

function ContactoPage() {
  return (
    <main className="grain">
      <Contact />
    </main>
  );
}
