import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  getCustomOrderQuote,
  createCustomOrderPayment,
} from "@/lib/custom-orders.functions";
import { OrderTimeline } from "@/components/site/OrderTimeline";
import type { TimelineEvent } from "@/lib/order-timeline";

export const Route = createFileRoute("/encargos/pagar/$token")({
  head: () => ({
    meta: [
      { title: "Pagar encargo — 144 Reality" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PayQuotePage,
});

function fmt(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    (cents ?? 0) / 100,
  );
}

type Quote = {
  id: string;
  name: string;
  order_type: string;
  event_date: string | null;
  quote_total_cents: number;
  deposit_percent: number;
  quote_notes: string | null;
  payment_status: string;
  amount_paid_cents: number | null;
  payment_mode: "deposit" | "full" | null;
};

function PayQuotePage() {
  const { token } = Route.useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"deposit" | "full">("deposit");
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    getCustomOrderQuote({ data: { token } })
      .then((r) => {
        if ("error" in r) setErr(r.error ?? "Error");
        else {
          setQuote(r.quote as Quote);
          setTimeline((r.timeline ?? []) as TimelineEvent[]);
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Error"));
  }, [token]);

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/encargos/pago-completado?session_id={CHECKOUT_SESSION_ID}`
      : "";

  const depositCents = quote
    ? Math.max(50, Math.round((quote.quote_total_cents * quote.deposit_percent) / 100))
    : 0;

  const options = useMemo(
    () => ({
      fetchClientSecret: async () => {
        const res = await createCustomOrderPayment({
          data: {
            token,
            mode,
            environment: getStripeEnvironment(),
            returnUrl,
          },
        });
        if ("error" in res) throw new Error(res.error);
        if (!res.clientSecret) throw new Error("Stripe no devolvió el client secret.");
        return res.clientSecret;
      },
    }),
    // Provider forbids swapping client secret. Remount by keying on mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payOpen, mode],
  );

  return (
    <>
      <Header />
      <main className="grain min-h-[70vh] bg-background py-14">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">
            — Presupuesto de tu encargo
          </p>
          <h1 className="mt-2 font-display text-5xl text-primary">Pagar encargo</h1>

          {err && (
            <div className="mt-8 rounded-sm border border-destructive/40 bg-destructive/5 p-6">
              <p className="text-sm text-foreground/80">{err}</p>
              <Link
                to="/encargos"
                className="mt-4 inline-block rounded-sm border border-primary px-4 py-2 text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground"
              >
                Solicitar otro presupuesto
              </Link>
            </div>
          )}

          {!err && !quote && (
            <p className="mt-8 text-sm text-muted-foreground">Cargando presupuesto…</p>
          )}

          {quote && quote.payment_status === "paid" && (
            <div className="mt-8 rounded-sm border border-foreground/15 bg-card p-6">
              <h2 className="font-display text-2xl text-primary">Este encargo ya está pagado</h2>
              <p className="mt-2 text-sm text-foreground/80">
                Nos pondremos en contacto contigo para los últimos detalles.
              </p>
            </div>
          )}

          {quote && quote.payment_status !== "paid" && (
            <div className="mt-8 space-y-6">
              <div className="rounded-sm border border-foreground/15 bg-card p-6">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Encargo
                </p>
                <p className="mt-1 font-serif text-lg font-semibold">
                  {quote.name} · {quote.order_type}
                </p>
                {quote.event_date && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fecha del evento: {quote.event_date}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Total
                    </p>
                    <p className="font-display text-3xl text-primary">
                      {fmt(quote.quote_total_cents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Anticipo mínimo ({quote.deposit_percent}%)
                    </p>
                    <p className="font-display text-3xl text-secondary">
                      {fmt(depositCents)}
                    </p>
                  </div>
                </div>
                {quote.quote_notes && (
                  <>
                    <hr className="my-4 border-foreground/10" />
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Notas
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{quote.quote_notes}</p>
                  </>
                )}
                {quote.payment_status === "deposit_paid" && (
                  <p className="mt-4 rounded-sm bg-secondary/15 px-3 py-2 text-xs text-secondary">
                    Ya has abonado un anticipo de {fmt(quote.amount_paid_cents ?? 0)}. Puedes
                    completar el pago restante cuando quieras.
                  </p>
                )}
              </div>

              <fieldset className="rounded-sm border border-foreground/15 p-4">
                <legend className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Elige cómo pagar
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {quote.payment_status !== "deposit_paid" && (
                    <label
                      className={`cursor-pointer rounded-sm border p-3 text-sm transition ${mode === "deposit" ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20 hover:border-primary"}`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "deposit"}
                        onChange={() => setMode("deposit")}
                        className="sr-only"
                      />
                      <span className="block font-semibold">Anticipo</span>
                      <span className="block text-xs opacity-80">
                        Reserva por {fmt(depositCents)} ({quote.deposit_percent}%)
                      </span>
                    </label>
                  )}
                  <label
                    className={`cursor-pointer rounded-sm border p-3 text-sm transition ${mode === "full" ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20 hover:border-primary"}`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "full"}
                      onChange={() => setMode("full")}
                      className="sr-only"
                    />
                    <span className="block font-semibold">Pago completo</span>
                    <span className="block text-xs opacity-80">
                      {fmt(
                        quote.payment_status === "deposit_paid"
                          ? Math.max(0, quote.quote_total_cents - (quote.amount_paid_cents ?? 0))
                          : quote.quote_total_cents,
                      )}{" "}
                      {quote.payment_status === "deposit_paid" ? "pendiente" : "hoy"}
                    </span>
                  </label>
                </div>
              </fieldset>

              {!payOpen ? (
                <button
                  onClick={() => setPayOpen(true)}
                  className="w-full rounded-sm bg-secondary px-5 py-3 text-xs font-bold uppercase tracking-widest text-secondary-foreground hover:bg-secondary/90"
                >
                  Continuar al pago
                </button>
              ) : (
                <div className="rounded-sm border border-foreground/15 bg-background p-4">
                  <EmbeddedCheckoutProvider
                    key={mode}
                    stripe={getStripe()}
                    options={options}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
