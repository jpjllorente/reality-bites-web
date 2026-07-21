import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/site/Hero";
import { HomeTeasers } from "@/components/site/HomeTeasers";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "144 Reality — Bites & Coffee | Repostería moderna & café de especialidad" },
      {
        name: "description",
        content:
          "Repostería moderna, café de especialidad y encargos a medida en un local industrial y acogedor en Madrid.",
      },
      { property: "og:title", content: "144 Reality — Bites & Coffee" },
      {
        property: "og:description",
        content: "Repostería moderna, café de especialidad y encargos a medida.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="grain">
      <Hero />
      <HomeTeasers />
    </main>
  );
}
