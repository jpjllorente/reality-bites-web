import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/tienda/reservado")({
  validateSearch: (s: Record<string, unknown>) => ({
    order_id: typeof s.order_id === "string" ? s.order_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reserva confirmada — 144 Reality" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reservado,
});

function Reservado() {
  const { order_id } = Route.useSearch();
  const cart = useCart();
  useEffect(() => {
    cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const short = order_id ? order_id.slice(0, 8) : "";
  return (
    <main className="grain min-h-[70vh] bg-background py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="rounded-sm border border-foreground/15 bg-card p-6 sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">
            — Reserva registrada
          </p>
          <h1 className="mt-2 font-display text-4xl text-primary">
            ¡Te esperamos en el local!
          </h1>
          <p className="mt-3 text-sm text-foreground/80">
            Hemos guardado tu pedido{short ? <> <span className="font-mono">#{short}</span></> : null}. Si
            nos dejaste tu email te hemos enviado la confirmación con el detalle; también hemos
            avisado al equipo para que lo tenga listo. Pásate a recogerlo cuando quieras y págalo
            directamente en el mostrador.
          </p>
          <div className="mt-6 rounded-sm border border-foreground/10 bg-muted/40 p-4 text-sm">
            <p><strong>Dirección:</strong> Calle Francisco González Conde, 37 — Bullas, Murcia</p>
            <p className="mt-1"><strong>Horario:</strong> Mar-Vie 8:30-13:00 y 15:30-20:00 · Fines de semana y festivos 8:30-13:00 y 15:30-21:00</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/tienda"
              className="rounded-sm bg-secondary px-5 py-3 text-center text-xs font-bold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
