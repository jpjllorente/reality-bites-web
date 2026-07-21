import { createFileRoute } from "@tanstack/react-router";
import { Contact } from "@/components/site/Contact";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getRequestOrigin } from "@/lib/origin.functions";
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
        { property: "og:image:alt", content: "Interior industrial de 144 Reality" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Contacto — 144 Reality" },
        {
          name: "twitter:description",
          content: "Dirección, horarios y contacto de 144 Reality en Bullas, Murcia.",
        },
        { name: "twitter:image", content: absImage },
      ],
      links: [{ rel: "canonical", href: "/contacto" }],
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
