import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { getShopOrderPublicTimeline } from "@/lib/shop-orders.functions";
import { OrderTimeline } from "@/components/site/OrderTimeline";
import type { TimelineEvent } from "@/lib/order-timeline";

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

function formatPrice(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}

type Item = {
  id: string;
  name: string;
  qty: number;
  price_cents: number;
  variant_name?: string | null;
  portion?: boolean | null;
};

function Reservado() {
  const { order_id } = Route.useSearch();
  const cart = useCart();
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [totalCents, setTotalCents] = useState<number>(0);

  useEffect(() => {
    cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!order_id) return;
    getShopOrderPublicTimeline({ data: { orderId: order_id } })
      .then((r) => {
        if ("ok" in r) {
          setTimeline((r.timeline ?? []) as TimelineEvent[]);
          setItems((r.items ?? []) as Item[]);
          setTotalCents(r.total_cents ?? 0);
        }
      })
      .catch(() => {});
  }, [order_id]);

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

          {items.length > 0 && (
            <>
              <ul className="mt-6 divide-y divide-foreground/10 border-y border-foreground/10">
                {items.map((i, idx) => (
                  <li key={`${i.id}-${idx}`} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div>
                      <span>{i.qty} × {i.name}</span>
                      {(i.variant_name || i.portion) && (
                        <p className="text-xs text-muted-foreground">
                          {i.variant_name ? `Variante: ${i.variant_name}` : ""}
                          {i.variant_name && i.portion ? " · " : ""}
                          {i.portion ? "Tamaño: porción" : ""}
                        </p>
                      )}
                    </div>
                    <span className="font-mono">{formatPrice(i.qty * i.price_cents)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Total en tienda</span>
                <span className="font-display text-2xl text-primary">{formatPrice(totalCents)}</span>
              </div>
            </>
          )}

          {timeline.length > 0 && (
            <div className="mt-6">
              <OrderTimeline events={timeline} />
            </div>
          )}

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
