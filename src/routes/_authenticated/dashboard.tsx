import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { listAllOrders, updateOrderStatus } from "@/lib/shop-orders.functions";
import {
  markInStorePaid,
  refundShopOrder,
  cancelShopOrder,
} from "@/lib/payments.functions";
import { amIAdmin } from "@/lib/auth-admin.functions";
import {
  sendCustomOrderQuote,
  markCustomOrderReadyForPickup,
  markCustomOrderInStorePaid,
} from "@/lib/custom-orders.functions";
import { NavTabs } from "./productos";
import { OrderTimeline } from "@/components/site/OrderTimeline";
import { buildShopOrderTimeline, buildCustomOrderTimeline } from "@/lib/order-timeline";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — 144 Reality" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

const SHOP_STATUSES = ["new", "contacted", "confirmed", "completed", "cancelled"] as const;
const CUSTOM_STATUSES = ["new", "reviewing", "confirmed", "declined"] as const;
type ShopStatus = (typeof SHOP_STATUSES)[number];
type CustomStatus = (typeof CUSTOM_STATUSES)[number];
type AnyStatus = ShopStatus | CustomStatus;

const STATUS_LABEL: Record<AnyStatus, string> = {
  new: "Nuevo",
  reviewing: "Revisando",
  contacted: "Contactado",
  confirmed: "Confirmado",
  declined: "Rechazado",
  completed: "Completado",
  cancelled: "Cancelado",
};

function formatEUR(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function Dashboard() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const fetchAll = useServerFn(listAllOrders);
  const fetchAmIAdmin = useServerFn(amIAdmin);
  const updateStatus = useServerFn(updateOrderStatus);
  const [tab, setTab] = useState<"custom" | "shop">("custom");

  const { data: adminCheck, isLoading: adminLoading } = useQuery({
    queryKey: ["am-i-admin", user?.id],
    queryFn: () => fetchAmIAdmin(),
  });
  const isAdmin = Boolean(adminCheck?.isAdmin);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: () => fetchAll(),
    enabled: isAdmin,
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  async function onChangeStatus(kind: "custom" | "shop", id: string, status: AnyStatus) {
    try {
      await updateStatus({ data: { kind, id, status } });
      toast.success("Estado actualizado");
      refetch();
    } catch {
      toast.error("No se pudo actualizar el estado");
    }
  }

  if (adminLoading) {
    return (
      <>
        <Header />
        <main className="grain bg-background py-24">
          <p className="mx-auto max-w-md px-4 text-center text-sm text-muted-foreground">
            Comprobando permisos…
          </p>
        </main>
        <Footer />
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <main className="grain bg-background py-24">
          <div className="mx-auto max-w-md px-4 text-center">
            <h1 className="font-display text-4xl text-primary">Acceso restringido</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Tu cuenta ({user?.email}) no está autorizada para este panel.
            </p>
            <button
              onClick={signOut}
              className="mt-6 rounded-sm border border-primary px-4 py-2 text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Cerrar sesión
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const custom = data?.custom ?? [];
  const shop = data?.shop ?? [];

  return (
    <>
      <Header />
      <main className="grain bg-background py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
                — Panel interno
              </p>
              <h1 className="font-display text-5xl leading-none text-primary sm:text-6xl">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sesión: {user?.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NavTabs current="dashboard" />
              <button
                onClick={() => refetch()}
                className="rounded-sm border border-foreground/20 px-4 py-2 text-xs uppercase tracking-widest text-foreground hover:border-primary hover:text-primary"
              >
                Refrescar
              </button>
              <button
                onClick={signOut}
                className="rounded-sm border border-foreground/20 px-4 py-2 text-xs uppercase tracking-widest text-foreground hover:border-primary hover:text-primary"
              >
                Salir
              </button>
            </div>

          </div>

          <div className="mt-8 flex gap-2">
            <TabBtn active={tab === "custom"} onClick={() => setTab("custom")}>
              Encargos a medida ({custom.length})
            </TabBtn>
            <TabBtn active={tab === "shop"} onClick={() => setTab("shop")}>
              Pedidos de tienda ({shop.length})
            </TabBtn>
          </div>

          {isLoading && (
            <p className="mt-10 text-sm text-muted-foreground">Cargando…</p>
          )}
          {error && (
            <p className="mt-10 text-sm text-destructive">
              Error cargando datos. Comprueba que tu email está en la whitelist.
            </p>
          )}

          {!isLoading && !error && tab === "custom" && (
            <CustomOrdersTable rows={custom} onStatus={(id, s) => onChangeStatus("custom", id, s)} />
          )}
          {!isLoading && !error && tab === "shop" && (
            <ShopOrdersTable rows={shop} onStatus={(id, s) => onChangeStatus("shop", id, s)} onRefresh={() => refetch()} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-foreground/20 text-foreground/70 hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function StatusSelect<T extends AnyStatus>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (s: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

type CustomRow = {
  id: string;
  created_at: string;
  status: CustomStatus;
  name: string;
  email: string;
  phone: string | null;
  order_type: string;
  event_date: string | null;
  servings: number | null;
  budget_range: string | null;
  flavors: string | null;
  allergens: string | null;
  message: string | null;
  quote_total_cents?: number | null;
  deposit_percent?: number | null;
  quote_notes?: string | null;
  quote_sent_at?: string | null;
  payment_status?: string | null;
  payment_mode?: string | null;
  amount_paid_cents?: number | null;
  payment_token?: string | null;
  ready_at?: string | null;
  ready_notified_at?: string | null;
  in_store_paid_at?: string | null;
};

function CustomOrdersTable({
  rows,
  onStatus,
}: {
  rows: CustomRow[];
  onStatus: (id: string, s: CustomStatus) => void;
}) {
  if (rows.length === 0)
    return <p className="mt-10 text-sm text-muted-foreground">Sin encargos todavía.</p>;
  return (
    <div className="mt-8 space-y-3">
      {rows.map((r) => (
        <details
          key={r.id}
          className="group rounded-sm border border-foreground/15 bg-card p-4 open:border-primary"
        >
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-serif text-base font-semibold text-foreground">
                {r.name} <span className="text-muted-foreground">· {r.order_type}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(r.created_at)} · {r.email}
                {r.phone ? ` · ${r.phone}` : ""}
              </p>
            </div>
            <div onClick={(e) => e.preventDefault()}>
              <StatusSelect
                value={r.status}
                options={CUSTOM_STATUSES}
                onChange={(s) => onStatus(r.id, s)}
              />
            </div>
          </summary>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <Info label="Fecha evento" value={r.event_date ?? "—"} />
            <Info label="Personas" value={r.servings ? String(r.servings) : "—"} />
            <Info label="Presupuesto" value={r.budget_range ?? "—"} />
            <Info label="Sabores" value={r.flavors ?? "—"} />
            <Info label="Alérgenos" value={r.allergens ?? "—"} />
          </dl>
          {r.message && (
            <div className="mt-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Mensaje
              </p>
              <p className="mt-1 whitespace-pre-wrap rounded-sm bg-muted/50 p-3 text-sm">
                {r.message}
              </p>
            </div>
          )}
          <QuotePanel row={r} />
          <div className="mt-4">
            <OrderTimeline events={buildCustomOrderTimeline(r as any)} />
          </div>
        </details>
      ))}
    </div>
  );
}

function QuotePanel({ row }: { row: CustomRow }) {
  const sendQuote = useServerFn(sendCustomOrderQuote);
  const router = useRouter();
  const [total, setTotal] = useState(
    row.quote_total_cents != null ? (row.quote_total_cents / 100).toFixed(2) : "",
  );
  const [pct, setPct] = useState(String(row.deposit_percent ?? 30));
  const [notes, setNotes] = useState(row.quote_notes ?? "");
  const [busy, setBusy] = useState(false);
  const paymentUrl =
    typeof window !== "undefined" && row.payment_token
      ? `${window.location.origin}/encargos/pagar/${row.payment_token}`
      : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(total.replace(",", ".")) * 100);
    const percent = parseInt(pct, 10);
    if (!Number.isFinite(cents) || cents < 50) {
      toast.error("Introduce un total válido (mínimo 0,50 €).");
      return;
    }
    if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
      toast.error("El porcentaje de anticipo debe estar entre 1 y 100.");
      return;
    }
    setBusy(true);
    try {
      const res = await sendQuote({
        data: {
          orderId: row.id,
          totalCents: cents,
          depositPercent: percent,
          notes,
          publicOrigin: window.location.origin,
        },
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
      } else {
        toast.success("Presupuesto enviado al cliente.");
        router.invalidate();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-sm border border-primary/30 bg-primary/5 p-4"
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
        Presupuesto y link de pago
      </p>
      {row.quote_sent_at && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Enviado el {formatDate(row.quote_sent_at)}
          {row.payment_status && row.payment_status !== "unpaid"
            ? ` · Estado: ${row.payment_status}${row.amount_paid_cents ? ` (${formatEUR(row.amount_paid_cents)})` : ""}`
            : ""}
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs">
          <span className="block text-muted-foreground">Total (EUR)</span>
          <input
            type="text"
            inputMode="decimal"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-2 py-1.5 text-sm"
            placeholder="120.00"
          />
        </label>
        <label className="text-xs">
          <span className="block text-muted-foreground">Anticipo mínimo (%)</span>
          <input
            type="number"
            min={1}
            max={100}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-sm bg-secondary px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
          >
            {busy ? "Enviando…" : row.quote_sent_at ? "Reenviar presupuesto" : "Enviar presupuesto"}
          </button>
        </div>
      </div>
      <label className="mt-3 block text-xs">
        <span className="block text-muted-foreground">Notas para el cliente</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-sm border border-foreground/20 bg-background px-2 py-1.5 text-sm"
        />
      </label>
      {paymentUrl && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-[11px] text-muted-foreground">Link de pago:</p>
          <code className="rounded-sm bg-background px-2 py-1 text-[11px]">{paymentUrl}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(paymentUrl);
              toast.success("Enlace copiado.");
            }}
            className="rounded-sm border border-foreground/20 px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-muted"
          >
            Copiar
          </button>
        </div>
      )}
      <PickupControls row={row} />
    </form>
  );
}

function PickupControls({ row }: { row: CustomRow }) {
  const router = useRouter();
  const markReady = useServerFn(markCustomOrderReadyForPickup);
  const markPaid = useServerFn(markCustomOrderInStorePaid);
  const [busy, setBusy] = useState<"ready" | "instore" | null>(null);

  const total = row.quote_total_cents ?? 0;
  const paid = row.amount_paid_cents ?? 0;
  const remaining = Math.max(0, total - paid);
  const quoted = row.quote_total_cents != null;
  const fullyPaid = row.payment_status === "paid";

  if (!quoted) return null;

  async function onReady(notify: boolean) {
    setBusy("ready");
    try {
      const res = await markReady({
        data: {
          orderId: row.id,
          publicOrigin: window.location.origin,
          notify,
        },
      });
      if ("error" in res && res.error) toast.error(res.error);
      else {
        toast.success(
          notify ? "Cliente avisado por email." : "Marcado como listo.",
        );
        router.invalidate();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error.");
    } finally {
      setBusy(null);
    }
  }

  async function onInStorePaid() {
    if (!confirm(`¿Confirmar cobro en mostrador de ${formatEUR(remaining)}?`)) return;
    setBusy("instore");
    try {
      const res = await markPaid({ data: { orderId: row.id } });
      if ("error" in res && res.error) toast.error(res.error);
      else {
        toast.success("Cobro registrado.");
        router.invalidate();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 rounded-sm border border-foreground/15 bg-background/50 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Entrega y cobro final
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Pagado: {formatEUR(paid)} · Pendiente:{" "}
        <span className={remaining > 0 ? "text-secondary font-semibold" : ""}>
          {formatEUR(remaining)}
        </span>
        {row.ready_at ? ` · Listo desde ${formatDate(row.ready_at)}` : ""}
        {row.in_store_paid_at ? " · Cobrado en mostrador" : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onReady(true)}
          className="rounded-sm bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy === "ready"
            ? "Enviando…"
            : row.ready_notified_at
              ? "Reenviar aviso de recogida"
              : remaining > 0
                ? "Listo · avisar y enviar link del resto"
                : "Listo · avisar al cliente"}
        </button>
        {!row.ready_at && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onReady(false)}
            className="rounded-sm border border-foreground/20 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-muted disabled:opacity-50"
          >
            Marcar listo sin avisar
          </button>
        )}
        {!fullyPaid && remaining > 0 && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={onInStorePaid}
            className="rounded-sm bg-secondary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
          >
            {busy === "instore" ? "Guardando…" : `Cobrado en mostrador (${formatEUR(remaining)})`}
          </button>
        )}
      </div>
    </div>
  );
}

type ShopItem = {
  id: string;
  name: string;
  qty: number;
  price_cents: number;
  variant_name?: string | null;
  portion?: boolean | null;
};
type ShopRow = {
  id: string;
  created_at: string;
  status: ShopStatus;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  items: unknown;
  total_cents: number;
  payment_status?: string | null;
  amount_paid_cents?: number | null;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  payment_confirmed_at?: string | null;
};

function PaymentBadge({ row }: { row: ShopRow }) {
  const status = row.payment_status ?? "unpaid";
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Pagado", cls: "bg-primary/15 text-primary border-primary/30" },
    unpaid: {
      label: "Sin pagar",
      cls: "bg-muted text-muted-foreground border-foreground/20",
    },
    refunded: {
      label: "Reembolsado",
      cls: "bg-destructive/10 text-destructive border-destructive/30",
    },
    partially_refunded: {
      label: "Reemb. parcial",
      cls: "bg-orange-500/10 text-orange-700 border-orange-500/30",
    },
    pay_in_store: {
      label: "Pago en tienda",
      cls: "bg-secondary/15 text-secondary border-secondary/40",
    },
    failed: {
      label: "Fallido",
      cls: "bg-destructive/10 text-destructive border-destructive/30",
    },
  };
  const cfg = map[status] ?? map.unpaid;
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cfg.cls}`}
    >
      {cfg.label}
      {row.amount_paid_cents ? ` · ${formatEUR(row.amount_paid_cents)}` : ""}
    </span>
  );
}

function ShopOrdersTable({
  rows,
  onStatus,
  onRefresh,
}: {
  rows: ShopRow[];
  onStatus: (id: string, s: ShopStatus) => void;
  onRefresh: () => void;
}) {
  const markPaidFn = useServerFn(markInStorePaid);
  const refundFn = useServerFn(refundShopOrder);
  const cancelFn = useServerFn(cancelShopOrder);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<ShopRow | null>(null);

  async function onMarkInStorePaid(id: string) {
    if (!confirm("¿Confirmar cobro en mostrador?")) return;
    setBusy(id);
    try {
      const r = (await markPaidFn({ data: { orderId: id } })) as any;
      if (r?.error) toast.error(r.error);
      else { toast.success("Cobro registrado y aviso enviado."); onRefresh(); }
    } finally { setBusy(null); }
  }

  async function onRefund(row: ShopRow) {
    const paid = row.amount_paid_cents ?? 0;
    const already = (row as any).amount_refunded_cents ?? 0;
    const remaining = Math.max(0, paid - already);
    if (remaining <= 0) return toast.error("Nada que reembolsar.");
    const input = prompt(
      `Importe a reembolsar en € (máx ${(remaining / 100).toFixed(2)}). Vacío = total.`,
    );
    if (input === null) return;
    let cents: number | undefined;
    if (input.trim() !== "") {
      const v = parseFloat(input.replace(",", "."));
      if (isNaN(v) || v <= 0) return toast.error("Importe inválido.");
      cents = Math.round(v * 100);
      if (cents > remaining) return toast.error("Excede el importe cobrado.");
    }
    setBusy(row.id);
    try {
      const r = (await refundFn({
        data: { orderId: row.id, amountCents: cents, environment: "sandbox" },
      })) as any;
      if (r?.error) toast.error(r.error);
      else { toast.success("Reembolso enviado a Stripe."); onRefresh(); }
    } finally { setBusy(null); }
  }

  if (rows.length === 0)
    return <p className="mt-10 text-sm text-muted-foreground">Sin pedidos todavía.</p>;

  return (
    <div className="mt-8 space-y-3">
      {rows.map((r) => {
        const items = (Array.isArray(r.items) ? r.items : []) as ShopItem[];
        const ps = r.payment_status ?? "unpaid";
        const canMarkInStorePaid = ps === "pay_in_store" || ps === "unpaid";
        const canRefund =
          (ps === "paid" || ps === "partially_refunded") && !!r.stripe_payment_intent_id;
        const canCancel = r.status !== "cancelled" && r.status !== "completed";
        return (
          <details
            key={r.id}
            className="group rounded-sm border border-foreground/15 bg-card p-4 open:border-primary"
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-serif text-base font-semibold text-foreground">
                    {r.name}{" "}
                    <span className="text-secondary">· {formatEUR(r.total_cents)}</span>
                  </p>
                  <PaymentBadge row={r} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(r.created_at)} · {r.phone}
                  {r.email ? ` · ${r.email}` : ""}
                </p>
              </div>
              <div onClick={(e) => e.preventDefault()}>
                <StatusSelect
                  value={r.status}
                  options={SHOP_STATUSES}
                  onChange={(s) => onStatus(r.id, s)}
                />
              </div>
            </summary>
            <ul className="mt-4 divide-y divide-foreground/10 text-sm">
              {items.map((it, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <span>{it.qty} × {it.name}</span>
                    {(it.variant_name || it.portion) && (
                      <p className="text-xs text-muted-foreground">
                        {it.variant_name ? `Variante: ${it.variant_name}` : ""}
                        {it.variant_name && it.portion ? " · " : ""}
                        {it.portion ? "Tamaño: porción" : ""}
                      </p>
                    )}
                  </div>
                  <span className="font-mono">{formatEUR(it.qty * it.price_cents)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <OrderTimeline events={buildShopOrderTimeline(r as any)} />
            </div>
            {r.stripe_payment_intent_id && (
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                PaymentIntent: {r.stripe_payment_intent_id}
              </p>
            )}
            {r.notes && (
              <div className="mt-3">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Notas
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded-sm bg-muted/50 p-3 text-sm">
                  {r.notes}
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {canMarkInStorePaid && (
                <button
                  disabled={busy === r.id}
                  onClick={() => onMarkInStorePaid(r.id)}
                  className="rounded-sm bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Cobrado en mostrador
                </button>
              )}
              {canRefund && (
                <button
                  disabled={busy === r.id}
                  onClick={() => onRefund(r)}
                  className="rounded-sm border border-orange-500/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-orange-700 hover:bg-orange-500/10 disabled:opacity-50"
                >
                  Reembolsar
                </button>
              )}
              {canCancel && (
                <button
                  disabled={busy === r.id}
                  onClick={() => setCancelling(r)}
                  className="rounded-sm border border-destructive/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  Cancelar pedido
                </button>
              )}
            </div>
          </details>
        );
      })}
      {cancelling && (
        <CancelDialog
          row={cancelling}
          onClose={() => setCancelling(null)}
          onConfirm={async ({ reason, refundCents }) => {
            setBusy(cancelling.id);
            try {
              const r = (await cancelFn({
                data: {
                  orderId: cancelling.id,
                  reason,
                  refundAmountCents: refundCents,
                  environment: "sandbox",
                },
              })) as any;
              if (r?.error) toast.error(r.error);
              else { toast.success("Pedido cancelado."); setCancelling(null); onRefresh(); }
            } finally { setBusy(null); }
          }}
        />
      )}
    </div>
  );
}

function CancelDialog({
  row,
  onClose,
  onConfirm,
}: {
  row: ShopRow;
  onClose: () => void;
  onConfirm: (v: { reason?: string; refundCents?: number }) => void;
}) {
  const paid = row.amount_paid_cents ?? 0;
  const already = (row as any).amount_refunded_cents ?? 0;
  const remaining = Math.max(0, paid - already);
  const canRefund = remaining > 0 && !!row.stripe_payment_intent_id;
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"none" | "full" | "partial">(canRefund ? "full" : "none");
  const [amount, setAmount] = useState((remaining / 100).toFixed(2));

  function confirm() {
    let refundCents: number | undefined;
    if (mode === "full") refundCents = remaining;
    if (mode === "partial") {
      const v = parseFloat(amount.replace(",", "."));
      if (isNaN(v) || v <= 0 || Math.round(v * 100) > remaining) {
        toast.error("Importe de reembolso inválido.");
        return;
      }
      refundCents = Math.round(v * 100);
    }
    onConfirm({ reason: reason.trim() || undefined, refundCents });
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-primary/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-sm border border-foreground/15 bg-background p-6">
        <h2 className="font-display text-3xl text-primary">Cancelar pedido</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.name} · {formatEUR(row.total_cents)}
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Motivo (opcional, se incluirá en el email al cliente)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        {canRefund ? (
          <fieldset className="mt-4">
            <legend className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Reembolso (disponible: {formatEUR(remaining)})
            </legend>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "full"} onChange={() => setMode("full")} />
                Reembolso total ({formatEUR(remaining)})
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "partial"} onChange={() => setMode("partial")} />
                Parcial
                {mode === "partial" && (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="ml-2 w-24 rounded-sm border border-foreground/20 bg-background px-2 py-1 text-sm"
                  />
                )}
                €
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "none"} onChange={() => setMode("none")} />
                Sin reembolso
              </label>
            </div>
          </fieldset>
        ) : (
          <p className="mt-4 rounded-sm bg-muted/40 p-3 text-xs text-muted-foreground">
            No hay importe cobrado por Stripe, así que no se enviará reembolso.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-sm border border-foreground/20 px-4 py-2 text-xs uppercase tracking-widest"
          >
            Volver
          </button>
          <button
            onClick={confirm}
            className="rounded-sm bg-destructive px-4 py-2 text-xs font-bold uppercase tracking-widest text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}


function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  );
}
