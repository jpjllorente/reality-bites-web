import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { finalizeCustomOrderPayment } from "@/lib/custom-orders.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/encargos/pago-completado")({
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pago de encargo — 144 Reality" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function fmt(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    (cents ?? 0) / 100,
  );
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; status: "paid" | "pending" | "failed"; mode: "deposit" | "full"; amountCents: number };

function Page() {
  const { session_id } = Route.useSearch();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!session_id) {
      setState({ kind: "error", message: "Falta el identificador de la sesión." });
      return;
    }
    finalizeCustomOrderPayment({
      data: { environment: getStripeEnvironment(), sessionId: session_id },
    })
      .then((r) => {
        if ("error" in r) setState({ kind: "error", message: r.error });
        else
          setState({
            kind: "ok",
            status: r.status,
            mode: r.mode,
            amountCents: r.amountCents,
          });
      })
      .catch((e) =>
        setState({ kind: "error", message: e instanceof Error ? e.message : "Error." }),
      );
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
              <p className="mt-3 text-sm">{state.message}</p>
              <Link
                to="/encargos"
                className="mt-6 inline-block rounded-sm bg-secondary px-5 py-3 text-xs font-bold uppercase tracking-widest text-secondary-foreground"
              >
                Volver a encargos
              </Link>
            </div>
          )}
          {state.kind === "ok" && state.status === "paid" && (
            <div className="rounded-sm border border-foreground/15 bg-card p-6 sm:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">
                — Pago confirmado
              </p>
              <h1 className="mt-2 font-display text-4xl text-primary">¡Gracias!</h1>
              <p className="mt-3 text-sm">
                Hemos recibido {fmt(state.amountCents)}{" "}
                {state.mode === "deposit" ? "como anticipo de tu encargo" : "por el encargo completo"}.
                Te enviamos la confirmación por email y nos pondremos en contacto contigo.
              </p>
            </div>
          )}
          {state.kind === "ok" && state.status !== "paid" && (
            <div className="rounded-sm border border-foreground/15 bg-card p-6">
              <h1 className="font-display text-3xl text-primary">
                {state.status === "pending" ? "Pago pendiente" : "Pago no completado"}
              </h1>
              <p className="mt-3 text-sm">
                {state.status === "pending"
                  ? "Tu pago está en proceso. En cuanto se confirme, te enviaremos un email."
                  : "El pago no se completó. Puedes reintentarlo desde el enlace del presupuesto."}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
