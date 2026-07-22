import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  listPayments,
  listWebhookEvents,
  reconcileWithStripe,
  getPaymentDetail,
} from "@/lib/payments-admin.functions";
import { NavTabs } from "./productos";
import { getStripeEnvironment } from "@/lib/stripe";

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

const PAGE_SIZES = [25, 50, 100, 200] as const;

function fmtEUR(cents: number | null | undefined, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency })
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
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(0);

  const [eventsPageSize, setEventsPageSize] = useState<number>(50);
  const [eventsPage, setEventsPage] = useState<number>(0);
  const [onlyEventErrors, setOnlyEventErrors] = useState(false);

  const [detailPi, setDetailPi] = useState<string | null>(null);

  const listFn = useServerFn(listPayments);
  const eventsFn = useServerFn(listWebhookEvents);
  const reconcileFn = useServerFn(reconcileWithStripe);

  const filters = useMemo(
    () => ({
      status: status as any,
      from: from ? new Date(from).toISOString() : null,
      to: to ? new Date(to + "T23:59:59").toISOString() : null,
      search: search || null,
      limit: pageSize,
      offset: page * pageSize,
    }),
    [status, from, to, search, pageSize, page],
  );

  const payments = useQuery({
    queryKey: ["admin-payments", filters],
    queryFn: () => listFn({ data: filters }),
    placeholderData: (prev) => prev,
  });

  const events = useQuery({
    queryKey: ["admin-webhook-events", eventsPageSize, eventsPage, onlyEventErrors],
    queryFn: () =>
      eventsFn({
        data: { limit: eventsPageSize, offset: eventsPage * eventsPageSize, onlyErrors: onlyEventErrors },
      }),
    placeholderData: (prev) => prev,
  });

  const reconcile = useMutation({
    mutationFn: (days: number) =>
      reconcileFn({ data: { environment: getStripeEnvironment(), days } }),
  });

  const totals = useMemo(() => {
    const rows = payments.data?.rows ?? [];
    let paid = 0, refunded = 0, net = 0;
    for (const r of rows as any[]) {
      paid += r.amount_paid_cents ?? 0;
      refunded += r.amount_refunded_cents ?? 0;
      net += (r.amount_paid_cents ?? 0) - (r.amount_refunded_cents ?? 0);
    }
    return { paid, refunded, net, count: rows.length };
  }, [payments.data]);

  const total = payments.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const eventsTotal = events.data?.total ?? 0;
  const eventsTotalPages = Math.max(1, Math.ceil(eventsTotal / eventsPageSize));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl">Pagos & Reembolsos</h1>
            <p className="text-sm text-foreground/70 mt-1">
              Registro de PaymentIntents, cobros, reembolsos y conciliación con Stripe.
            </p>
          </div>
          <NavTabs current="pagos" />
        </div>

        {/* Reconciliación */}
        <section className="rounded-sm border border-foreground/15 bg-card p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl">Conciliación con Stripe</h2>
              <p className="text-xs text-foreground/60">
                Compara los PaymentIntents recientes de Stripe con los pedidos de la BD para detectar discrepancias.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[3, 7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => reconcile.mutate(d)}
                  disabled={reconcile.isPending}
                  className="rounded-sm border border-foreground/20 px-3 py-1.5 text-xs uppercase tracking-widest hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {reconcile.isPending && reconcile.variables === d ? "…" : `${d}d`}
                </button>
              ))}
            </div>
          </div>
          {reconcile.data && "error" in reconcile.data && (
            <div className="mt-3 rounded-sm border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
              {reconcile.data.error}
            </div>
          )}
          {reconcile.data && !("error" in reconcile.data) && (
            <div className="mt-3">
              <div className="text-xs text-foreground/70 mb-2">
                Ventana: {reconcile.data.windowDays}d · Stripe: {reconcile.data.checkedStripe} PIs · BD: {reconcile.data.checkedDb} pedidos ·{" "}
                <span className={reconcile.data.discrepancies.length ? "text-rose-700 font-semibold" : "text-emerald-700 font-semibold"}>
                  {reconcile.data.discrepancies.length} discrepancias
                </span>
              </div>
              {reconcile.data.discrepancies.length > 0 && (
                <div className="overflow-x-auto rounded-sm border border-foreground/15">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-widest text-foreground/70">
                      <tr>
                        <th className="p-2 text-left">Tipo</th>
                        <th className="p-2 text-left">Detalle</th>
                        <th className="p-2 text-right">Stripe</th>
                        <th className="p-2 text-right">BD</th>
                        <th className="p-2 text-left">Referencias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconcile.data.discrepancies.map((d, i) => (
                        <tr key={i} className="border-t border-foreground/10 align-top">
                          <td className="p-2">
                            <span className="rounded-sm border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] uppercase tracking-widest text-rose-800">
                              {d.kind.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="p-2">
                            <div>{d.detail}</div>
                            <div className="text-[11px] text-foreground/60">{d.customer ?? "—"} · {fmtDate(d.created)}</div>
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {d.stripeAmount != null ? fmtEUR(d.stripeAmount) : "—"}
                            {d.stripeRefunded ? <div className="text-[10px] text-amber-700">-{fmtEUR(d.stripeRefunded)}</div> : null}
                            <div className="text-[10px] text-foreground/50">{d.stripeStatus ?? "—"}</div>
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {d.dbAmount != null ? fmtEUR(d.dbAmount) : "—"}
                            {d.dbRefunded ? <div className="text-[10px] text-amber-700">-{fmtEUR(d.dbRefunded)}</div> : null}
                            <div className="text-[10px] text-foreground/50">{d.dbStatus ?? "—"}</div>
                          </td>
                          <td className="p-2 font-mono text-[10px] text-foreground/70">
                            {d.paymentIntentId && (
                              <button className="underline hover:text-primary" onClick={() => setDetailPi(d.paymentIntentId!)}>
                                {d.paymentIntentId}
                              </button>
                            )}
                            {d.orderId && <div className="text-foreground/50">{d.orderId.slice(0, 8)}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi label="En página" value={String(totals.count)} sub={`de ${total} totales`} />
          <Kpi label="Cobrado (pág.)" value={fmtEUR(totals.paid)} />
          <Kpi label="Reembolsado (pág.)" value={fmtEUR(totals.refunded)} />
          <Kpi label="Neto (pág.)" value={fmtEUR(totals.net)} />
        </div>

        {/* Filters */}
        <div className="rounded-sm border border-foreground/15 bg-card p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <Label text="Estado">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Label>
          <Label text="Desde">
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }}
              className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground" />
          </Label>
          <Label text="Hasta">
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }}
              className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground" />
          </Label>
          <Label text="Buscar">
            <input type="search" placeholder="Nombre, email, pi_..., cs_..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground" />
          </Label>
          <Label text="Por página">
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Label>
        </div>

        {/* Table */}
        <div className="relative overflow-x-auto rounded-sm border border-foreground/15 bg-card">
          {payments.isFetching && (
            <div className="absolute top-0 right-0 z-10 m-2 rounded-sm bg-primary/90 px-2 py-1 text-[10px] uppercase tracking-widest text-primary-foreground">
              Cargando…
            </div>
          )}
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
              {payments.data && payments.data.rows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-foreground/60">Sin resultados.</td></tr>
              )}
              {(payments.data?.rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-foreground/10 align-top hover:bg-muted/30">
                  <td className="p-3 whitespace-nowrap text-foreground/80">
                    {fmtDate(r.created_at)}
                    {r.payment_confirmed_at && <div className="text-[10px] text-emerald-700">✓ {fmtDate(r.payment_confirmed_at)}</div>}
                    {r.refunded_at && <div className="text-[10px] text-amber-700">↩ {fmtDate(r.refunded_at)}</div>}
                    {r.payment_failed_at && <div className="text-[10px] text-rose-700">✗ {fmtDate(r.payment_failed_at)}</div>}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-foreground/60">{r.email || r.phone}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block rounded-sm border px-2 py-0.5 text-[11px] uppercase tracking-widest ${STATUS_STYLE[r.payment_status] ?? "bg-neutral-100 border-neutral-300"}`}>
                      {r.payment_status ?? "—"}
                    </span>
                    {r.payment_failure_reason && <div className="text-[11px] text-rose-700 mt-1">{r.payment_failure_reason}</div>}
                  </td>
                  <td className="p-3 text-right">{fmtEUR(r.total_cents)}</td>
                  <td className="p-3 text-right text-emerald-800">{fmtEUR(r.amount_paid_cents)}</td>
                  <td className="p-3 text-right text-amber-800">{fmtEUR(r.amount_refunded_cents)}</td>
                  <td className="p-3 font-mono text-[11px] text-foreground/70">
                    {r.stripe_payment_intent_id && (
                      <button className="underline hover:text-primary" onClick={() => setDetailPi(r.stripe_payment_intent_id)}>
                        {r.stripe_payment_intent_id}
                      </button>
                    )}
                    {r.stripe_session_id && <div className="text-foreground/50">{r.stripe_session_id}</div>}
                    {!r.stripe_payment_intent_id && !r.stripe_session_id && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page} totalPages={totalPages} total={total} pageSize={pageSize}
          onPage={setPage}
        />

        {/* Webhook events log */}
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">Eventos webhook</h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-foreground/70">
                <input type="checkbox" checked={onlyEventErrors} onChange={(e) => { setOnlyEventErrors(e.target.checked); setEventsPage(0); }} />
                Solo con error
              </label>
              <select value={eventsPageSize} onChange={(e) => { setEventsPageSize(Number(e.target.value)); setEventsPage(0); }}
                className="rounded-sm border border-foreground/20 bg-background px-2 py-1 text-xs">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}/pág.</option>)}
              </select>
            </div>
          </div>
          <div className="relative overflow-x-auto rounded-sm border border-foreground/15 bg-card">
            {events.isFetching && (
              <div className="absolute top-0 right-0 z-10 m-2 rounded-sm bg-primary/90 px-2 py-1 text-[10px] uppercase tracking-widest text-primary-foreground">
                Cargando…
              </div>
            )}
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
                {events.isLoading && (
                  <tr><td colSpan={5} className="p-6 text-center text-foreground/60">Cargando…</td></tr>
                )}
                {(events.data?.rows ?? []).map((e: any) => (
                  <tr key={e.event_id} className="border-t border-foreground/10">
                    <td className="p-3 whitespace-nowrap">{fmtDate(e.received_at)}</td>
                    <td className="p-3 font-mono text-[11px]">{e.event_type}</td>
                    <td className="p-3 text-xs">{e.environment}</td>
                    <td className="p-3 whitespace-nowrap text-emerald-700">
                      {e.processed_at ? fmtDate(e.processed_at) : (e.error ? <span className="text-rose-700" title={e.error}>Error</span> : "—")}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-foreground/60">{e.event_id}</td>
                  </tr>
                ))}
                {events.data && events.data.rows.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-foreground/60">Sin eventos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={eventsPage} totalPages={eventsTotalPages} total={eventsTotal} pageSize={eventsPageSize}
            onPage={setEventsPage}
          />
        </section>
      </main>

      {detailPi && <PaymentDetailDrawer paymentIntentId={detailPi} onClose={() => setDetailPi(null)} />}

      <Footer />
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-sm border border-foreground/15 bg-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-foreground/60">{label}</div>
      <div className="mt-1 font-serif text-2xl">{value}</div>
      {sub && <div className="text-[10px] text-foreground/50 mt-1">{sub}</div>}
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="text-xs uppercase tracking-widest text-foreground/70 block">
      {text}
      {children}
    </label>
  );
}

function Pagination({
  page, totalPages, total, pageSize, onPage,
}: {
  page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void;
}) {
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/70">
      <div>{start}–{end} de {total}</div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(0)} disabled={page === 0}
          className="rounded-sm border border-foreground/20 px-2 py-1 disabled:opacity-40 hover:border-primary">« Inicio</button>
        <button onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0}
          className="rounded-sm border border-foreground/20 px-2 py-1 disabled:opacity-40 hover:border-primary">‹ Anterior</button>
        <span className="px-2">Pág. {page + 1} / {totalPages}</span>
        <button onClick={() => onPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
          className="rounded-sm border border-foreground/20 px-2 py-1 disabled:opacity-40 hover:border-primary">Siguiente ›</button>
        <button onClick={() => onPage(totalPages - 1)} disabled={page >= totalPages - 1}
          className="rounded-sm border border-foreground/20 px-2 py-1 disabled:opacity-40 hover:border-primary">Final »</button>
      </div>
    </div>
  );
}

function PaymentDetailDrawer({
  paymentIntentId, onClose,
}: { paymentIntentId: string; onClose: () => void }) {
  const detailFn = useServerFn(getPaymentDetail);
  const detail = useQuery({
    queryKey: ["payment-detail", paymentIntentId],
    queryFn: () => detailFn({ data: { environment: getStripeEnvironment(), paymentIntentId } }),
  });

  const kindClass: Record<string, string> = {
    info: "border-sky-300 bg-sky-50 text-sky-800",
    success: "border-emerald-300 bg-emerald-50 text-emerald-800",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
    danger: "border-rose-300 bg-rose-50 text-rose-800",
  };

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-xl overflow-y-auto bg-background border-l border-foreground/15 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl">Detalle de pago</h2>
          <button onClick={onClose} className="text-sm text-foreground/70 hover:text-foreground">Cerrar ✕</button>
        </div>
        <div className="font-mono text-xs text-foreground/60 mb-6 break-all">{paymentIntentId}</div>

        {detail.isLoading && <div className="text-sm text-foreground/60">Cargando desde Stripe…</div>}
        {detail.data && "error" in detail.data && (
          <div className="rounded-sm border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{detail.data.error}</div>
        )}
        {detail.data && !("error" in detail.data) && (
          <>
            {/* Resumen PI */}
            <section className="rounded-sm border border-foreground/15 bg-card p-4 mb-4">
              <div className="text-[11px] uppercase tracking-widest text-foreground/60 mb-2">PaymentIntent</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-foreground/60">Estado:</span> <strong>{detail.data.paymentIntent.status}</strong></div>
                <div><span className="text-foreground/60">Creado:</span> {fmtDate(detail.data.paymentIntent.created)}</div>
                <div><span className="text-foreground/60">Total:</span> {fmtEUR(detail.data.paymentIntent.amount, detail.data.paymentIntent.currency.toUpperCase())}</div>
                <div><span className="text-foreground/60">Cobrado:</span> {fmtEUR(detail.data.paymentIntent.amount_received, detail.data.paymentIntent.currency.toUpperCase())}</div>
                {detail.data.paymentIntent.receipt_email && <div className="col-span-2 truncate"><span className="text-foreground/60">Email:</span> {detail.data.paymentIntent.receipt_email}</div>}
              </div>
              {detail.data.charge && (
                <div className="mt-3 text-xs text-foreground/70">
                  Charge <span className="font-mono">{detail.data.charge.id}</span> · Método {detail.data.charge.method ?? "—"} ·{" "}
                  Reembolsado {fmtEUR(detail.data.charge.amount_refunded)}
                  {detail.data.charge.receipt_url && (
                    <> · <a className="underline" href={detail.data.charge.receipt_url} target="_blank" rel="noreferrer">Recibo</a></>
                  )}
                </div>
              )}
            </section>

            {/* Pedido asociado */}
            <section className="rounded-sm border border-foreground/15 bg-card p-4 mb-4">
              <div className="text-[11px] uppercase tracking-widest text-foreground/60 mb-2">Pedido asociado</div>
              {detail.data.order ? (
                <div className="text-sm space-y-1">
                  <div><strong>{(detail.data.order as any).name}</strong> · {(detail.data.order as any).email || (detail.data.order as any).phone}</div>
                  <div className="text-xs text-foreground/70">
                    Estado pago: <span className={`inline-block rounded-sm border px-2 py-0.5 text-[10px] uppercase ${STATUS_STYLE[(detail.data.order as any).payment_status] ?? ""}`}>
                      {(detail.data.order as any).payment_status}
                    </span> · Pedido: {(detail.data.order as any).status}
                  </div>
                  <div className="text-xs text-foreground/60">Total {fmtEUR((detail.data.order as any).total_cents)} · ID {(detail.data.order as any).id.slice(0, 8)}</div>
                </div>
              ) : (
                <div className="text-sm text-rose-700">Sin pedido en la BD para este PaymentIntent.</div>
              )}
            </section>

            {/* Timeline */}
            <section className="rounded-sm border border-foreground/15 bg-card p-4">
              <div className="text-[11px] uppercase tracking-widest text-foreground/60 mb-3">Timeline</div>
              <ol className="space-y-3">
                {detail.data.timeline.map((ev, i) => (
                  <li key={i} className="flex gap-3">
                    <div className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${kindClass[ev.kind]}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ev.label}</div>
                      <div className="text-[11px] text-foreground/60">{fmtDate(ev.at)}</div>
                      {ev.detail && <div className="text-xs text-foreground/70 mt-0.5">{ev.detail}</div>}
                    </div>
                  </li>
                ))}
                {detail.data.timeline.length === 0 && (
                  <li className="text-sm text-foreground/60">Sin eventos.</li>
                )}
              </ol>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}
