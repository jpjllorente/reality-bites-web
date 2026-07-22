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
