import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/site/Hero";
import { Catalog } from "@/components/site/Catalog";
import { CustomOrders } from "@/components/site/CustomOrders";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="grain">
      <Hero />
      <Catalog />
      <CustomOrders />
      <Contact />
      <Footer />
    </main>
  );
}
