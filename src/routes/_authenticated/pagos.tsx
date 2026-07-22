import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { listPayments, listWebhookEvents } from "@/lib/payments-admin.functions";
import { NavTabs } from "./productos";

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos — 144 Reality" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PagosPage,
});

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "paid", label: "Pagado" },
  { value: "partially_refunded", label: "Reembolso parcial" },
  { value: "refunded", label: "Reembolsado" },
  { value: "failed", label: "Fallido" },
  { value: "unpaid", label: "Sin pagar" },
  { value: "in_store_paid", label: "Pagado en tienda" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
  partially_refunded: "bg-amber-100 text-amber-900 border-amber-300",
  refunded: "bg-neutral-200 text-neutral-800 border-neutral-400",
  failed: "bg-rose-100 text-rose-800 border-rose-300",
  unpaid: "bg-neutral-100 text-neutral-700 border-neutral-300",
  in_store_paid: "bg-sky-100 text-sky-800 border-sky-300",
};

function fmtEUR(cents: number | null | undefined) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })
    .format((cents ?? 0) / 100);
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

function PagosPage() {
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const listFn = useServerFn(listPayments);
  const eventsFn = useServerFn(listWebhookEvents);

  const filters = useMemo(
    () => ({
      status: status as any,
      from: from ? new Date(from).toISOString() : null,
      to: to ? new Date(to + "T23:59:59").toISOString() : null,
      search: search || null,
    }),
    [status, from, to, search],
  );

  const payments = useQuery({
    queryKey: ["admin-payments", filters],
    queryFn: () => listFn({ data: filters }),
  });

  const events = useQuery({
    queryKey: ["admin-webhook-events"],
    queryFn: () => eventsFn({ data: undefined as any }),
  });

  const totals = useMemo(() => {
    const rows = payments.data ?? [];
    let paid = 0, refunded = 0, net = 0;
    for (const r of rows as any[]) {
      paid += r.amount_paid_cents ?? 0;
      refunded += r.amount_refunded_cents ?? 0;
      net += (r.amount_paid_cents ?? 0) - (r.amount_refunded_cents ?? 0);
    }
    return { paid, refunded, net, count: rows.length };
  }, [payments.data]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl">Pagos & Reembolsos</h1>
            <p className="text-sm text-foreground/70 mt-1">
              Registro de PaymentIntents, cobros y reembolsos Stripe.
            </p>
          </div>
          <NavTabs current="pagos" />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi label="Pedidos" value={String(totals.count)} />
          <Kpi label="Cobrado" value={fmtEUR(totals.paid)} />
          <Kpi label="Reembolsado" value={fmtEUR(totals.refunded)} />
          <Kpi label="Neto" value={fmtEUR(totals.net)} />
        </div>

        {/* Filters */}
        <div className="rounded-sm border border-foreground/15 bg-card p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-xs uppercase tracking-widest text-foreground/70">
            Estado
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-widest text-foreground/70">
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs uppercase tracking-widest text-foreground/70">
            Hasta
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs uppercase tracking-widest text-foreground/70">
            Buscar
            <input
              type="search"
              placeholder="Nombre, email, pi_..., cs_..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-sm border border-foreground/15 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-foreground/70">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Pagado</th>
                <th className="p-3 text-right">Reembolsado</th>
                <th className="p-3 text-left">Stripe IDs</th>
              </tr>
            </thead>
            <tbody>
              {payments.isLoading && (
                <tr><td colSpan={7} className="p-6 text-center text-foreground/60">Cargando…</td></tr>
              )}
              {payments.data && payments.data.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-foreground/60">Sin resultados.</td></tr>
              )}
              {(payments.data ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-foreground/10 align-top">
                  <td className="p-3 whitespace-nowrap text-foreground/80">
                    {fmtDate(r.created_at)}
                    {r.payment_confirmed_at && (
                      <div className="text-[10px] text-emerald-700">✓ {fmtDate(r.payment_confirmed_at)}</div>
                    )}
                    {r.refunded_at && (
                      <div className="text-[10px] text-amber-700">↩ {fmtDate(r.refunded_at)}</div>
                    )}
                    {r.payment_failed_at && (
                      <div className="text-[10px] text-rose-700">✗ {fmtDate(r.payment_failed_at)}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-foreground/60">{r.email || r.phone}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block rounded-sm border px-2 py-0.5 text-[11px] uppercase tracking-widest ${STATUS_STYLE[r.payment_status] ?? "bg-neutral-100 border-neutral-300"}`}>
                      {r.payment_status ?? "—"}
                    </span>
                    {r.payment_failure_reason && (
                      <div className="text-[11px] text-rose-700 mt-1">{r.payment_failure_reason}</div>
                    )}
                  </td>
                  <td className="p-3 text-right">{fmtEUR(r.total_cents)}</td>
                  <td className="p-3 text-right text-emerald-800">{fmtEUR(r.amount_paid_cents)}</td>
                  <td className="p-3 text-right text-amber-800">{fmtEUR(r.amount_refunded_cents)}</td>
                  <td className="p-3 font-mono text-[11px] text-foreground/70">
                    {r.stripe_payment_intent_id && <div>{r.stripe_payment_intent_id}</div>}
                    {r.stripe_session_id && <div className="text-foreground/50">{r.stripe_session_id}</div>}
                    {!r.stripe_payment_intent_id && !r.stripe_session_id && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Webhook events log */}
        <section className="mt-10">
          <h2 className="font-serif text-2xl mb-3">Eventos webhook (últimos 100)</h2>
          <div className="overflow-x-auto rounded-sm border border-foreground/15 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-widest text-foreground/70">
                <tr>
                  <th className="p-3 text-left">Recibido</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Entorno</th>
                  <th className="p-3 text-left">Procesado</th>
                  <th className="p-3 text-left">Event ID</th>
                </tr>
              </thead>
              <tbody>
                {(events.data ?? []).map((e: any) => (
                  <tr key={e.event_id} className="border-t border-foreground/10">
                    <td className="p-3 whitespace-nowrap">{fmtDate(e.received_at)}</td>
                    <td className="p-3 font-mono text-[11px]">{e.event_type}</td>
                    <td className="p-3 text-xs">{e.environment}</td>
                    <td className="p-3 whitespace-nowrap text-emerald-700">
                      {e.processed_at ? fmtDate(e.processed_at) : (e.error ? <span className="text-rose-700">Error</span> : "—")}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-foreground/60">{e.event_id}</td>
                  </tr>
                ))}
                {events.data && events.data.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-foreground/60">Sin eventos aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-foreground/15 bg-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-foreground/60">{label}</div>
      <div className="mt-1 font-serif text-2xl">{value}</div>
    </div>
  );
}
