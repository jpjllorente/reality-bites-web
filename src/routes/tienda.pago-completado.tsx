import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { finalizeShopCheckout } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useCart } from "@/hooks/use-cart";
import { OrderTimeline } from "@/components/site/OrderTimeline";
import type { TimelineEvent } from "@/lib/order-timeline";



function formatPrice(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export const Route = createFileRoute("/tienda/pago-completado")({
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pedido confirmado — 144 Reality" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PagoCompletado,
});

type Item = {
  id: string;
  name: string;
  qty: number;
  price_cents: number;
  variant_name?: string | null;
  portion?: boolean | null;
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      status: "paid" | "pending" | "failed";
      orderId: string | null;
      totalCents: number;
      items: Item[];
      customer: { name: string; phone: string; email: string | null; notes: string | null };
      timeline: TimelineEvent[];
    };

function PagoCompletado() {
  const { session_id } = Route.useSearch();
  const cart = useCart();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!session_id) {
      setState({ kind: "error", message: "Falta el identificador de la sesión de pago." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await finalizeShopCheckout({
          data: { environment: getStripeEnvironment(), sessionId: session_id },
        });
        if (cancelled) return;
        if ("error" in res) {
          setState({ kind: "error", message: res.error });
          return;
        }
        setState({
          kind: "ok",
          status: res.status,
          orderId: res.orderId,
          totalCents: res.total_cents,
          items: res.items,
          customer: res.customer,
          timeline: res.timeline,
        });
        // Clear cart on any successful finalize (paid or pending capture).
        // The order row already exists server-side, so keeping items in the
        // cart would cause duplicate orders on the next visit.
        if (res.status === "paid" || res.status === "pending") cart.clear();
      } catch (e) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: e instanceof Error ? e.message : "Error inesperado.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session_id]);


  return (
    <>
      <Header />
      <main className="grain min-h-[70vh] bg-background py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          {state.kind === "loading" && (
            <p className="text-center font-mono text-sm text-muted-foreground">
              Confirmando tu pago…
            </p>
          )}

          {state.kind === "error" && (
            <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-6">
              <h1 className="font-display text-3xl text-primary">No pudimos confirmar el pago</h1>
              <p className="mt-3 text-sm text-foreground/80">{state.message}</p>
              <Link
                to="/tienda"
                className="mt-6 inline-block rounded-sm bg-secondary px-5 py-3 text-xs font-bold uppercase tracking-widest text-secondary-foreground"
              >
                Volver a la tienda
              </Link>
            </div>
          )}

          {state.kind === "ok" && state.status === "paid" && (
            <div className="rounded-sm border border-foreground/15 bg-card p-6 sm:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">— Pago confirmado</p>
              <h1 className="mt-2 font-display text-4xl text-primary">¡Gracias, {state.customer.name.split(" ")[0]}!</h1>
              <p className="mt-3 text-sm text-foreground/80">
                Tu pedido {state.orderId ? <span className="font-mono">#{state.orderId.slice(0, 8)}</span> : null} ha sido pagado correctamente. Te acabamos de enviar un email de confirmación con el detalle y el equipo ya ha recibido el aviso para prepararlo.
              </p>

              <ul className="mt-6 divide-y divide-foreground/10 border-y border-foreground/10">
                {state.items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between py-3 text-sm">
                    <span>
                      {i.qty} × {i.name}
                    </span>
                    <span className="font-mono">{formatPrice(i.qty * i.price_cents)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Total</span>
                <span className="font-display text-2xl text-primary">{formatPrice(state.totalCents)}</span>
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
          )}

          {state.kind === "ok" && state.status !== "paid" && (
            <div className="rounded-sm border border-foreground/15 bg-card p-6">
              <h1 className="font-display text-3xl text-primary">
                {state.status === "pending" ? "Pago pendiente" : "Pago no completado"}
              </h1>
              <p className="mt-3 text-sm text-foreground/80">
                {state.status === "pending"
                  ? "Tu pago está en proceso. En cuanto se confirme, te enviaremos un email."
                  : "El pago no se completó. Puedes volver a intentarlo desde la tienda."}
              </p>
              <Link
                to="/tienda"
                className="mt-6 inline-block rounded-sm bg-secondary px-5 py-3 text-xs font-bold uppercase tracking-widest text-secondary-foreground"
              >
                Volver a la tienda
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
