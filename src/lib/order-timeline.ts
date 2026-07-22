/**
 * Order status history — shared, browser-safe.
 * Both admin and customer surfaces render the same timeline.
 */

export interface TimelineEvent {
  key: string;
  label: string;
  detail?: string | null;
  at: string; // ISO
  kind: "info" | "success" | "warning" | "error";
}

function fmtEUR(cents: number | null | undefined): string {
  if (cents == null) return "";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

export interface ShopOrderTimelineInput {
  created_at?: string | null;
  payment_status?: string | null;
  payment_confirmed_at?: string | null;
  in_store_paid_at?: string | null;
  amount_paid_cents?: number | null;
  payment_failed_at?: string | null;
  payment_failed_reason?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  amount_refunded_cents?: number | null;
  refund_notified_at?: string | null;
  stripe_session_id?: string | null;
}

export function buildShopOrderTimeline(row: ShopOrderTimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (row.created_at) {
    const isReserve = row.payment_status === "pay_in_store";
    events.push({
      key: "created",
      label: isReserve ? "Reserva registrada (pago en tienda)" : "Pedido creado",
      at: row.created_at,
      kind: "info",
    });
  }
  if (row.stripe_session_id && row.payment_status !== "pay_in_store") {
    events.push({
      key: "stripe-session",
      label: "Checkout de Stripe iniciado",
      at: row.created_at ?? new Date(0).toISOString(),
      kind: "info",
    });
  }
  if (row.payment_confirmed_at && row.payment_status !== "pay_in_store") {
    events.push({
      key: "paid",
      label: "Pago confirmado por Stripe (webhook)",
      detail: row.amount_paid_cents ? `Importe: ${fmtEUR(row.amount_paid_cents)}` : null,
      at: row.payment_confirmed_at,
      kind: "success",
    });
  }
  if (row.in_store_paid_at) {
    events.push({
      key: "in-store-paid",
      label: "Cobrado en mostrador",
      detail: row.amount_paid_cents ? `Importe: ${fmtEUR(row.amount_paid_cents)}` : null,
      at: row.in_store_paid_at,
      kind: "success",
    });
  }
  if (row.payment_failed_at) {
    events.push({
      key: "failed",
      label: "Pago fallido",
      detail: row.payment_failed_reason ?? null,
      at: row.payment_failed_at,
      kind: "error",
    });
  }
  if (row.amount_refunded_cents && row.amount_refunded_cents > 0 && row.refund_notified_at) {
    events.push({
      key: "refund",
      label:
        row.payment_status === "refunded"
          ? "Reembolso completo emitido"
          : "Reembolso parcial emitido",
      detail: `Importe: ${fmtEUR(row.amount_refunded_cents)}`,
      at: row.refund_notified_at,
      kind: "warning",
    });
  }
  if (row.cancelled_at) {
    events.push({
      key: "cancelled",
      label: "Pedido cancelado",
      detail: row.cancellation_reason ?? null,
      at: row.cancelled_at,
      kind: "warning",
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export interface CustomOrderTimelineInput {
  created_at?: string | null;
  quote_sent_at?: string | null;
  quote_total_cents?: number | null;
  deposit_percent?: number | null;
  payment_status?: string | null;
  payment_mode?: string | null;
  amount_paid_cents?: number | null;
  paid_at?: string | null;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  status?: string | null;
  ready_at?: string | null;
  ready_notified_at?: string | null;
  in_store_paid_at?: string | null;
}

export function buildCustomOrderTimeline(row: CustomOrderTimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (row.created_at) {
    events.push({
      key: "requested",
      label: "Solicitud recibida",
      at: row.created_at,
      kind: "info",
    });
  }
  if (row.quote_sent_at) {
    const total = row.quote_total_cents ? fmtEUR(row.quote_total_cents) : "";
    const deposit = row.deposit_percent ? ` · Anticipo mínimo ${row.deposit_percent}%` : "";
    events.push({
      key: "quote",
      label: "Presupuesto enviado",
      detail: `${total}${deposit}`,
      at: row.quote_sent_at,
      kind: "info",
    });
  }
  if (row.paid_at) {
    const isDeposit = row.payment_mode === "deposit" && row.payment_status === "deposit_paid";
    events.push({
      key: "payment",
      label: isDeposit ? "Anticipo pagado" : "Pago completo recibido",
      detail: row.amount_paid_cents ? `Importe: ${fmtEUR(row.amount_paid_cents)}` : null,
      at: row.paid_at,
      kind: "success",
    });
  }
  if (
    row.stripe_payment_intent_id &&
    row.paid_at &&
    (row.payment_status === "paid" || row.payment_status === "deposit_paid")
  ) {
    events.push({
      key: "webhook",
      label: "Confirmado por webhook de Stripe",
      at: row.paid_at,
      kind: "success",
    });
  }
  if (row.status === "confirmed") {
    events.push({
      key: "confirmed",
      label: "Encargo confirmado",
      at: row.paid_at ?? row.quote_sent_at ?? row.created_at ?? new Date(0).toISOString(),
      kind: "success",
    });
  }
  if (row.status === "declined") {
    events.push({
      key: "declined",
      label: "Encargo rechazado",
      at: row.created_at ?? new Date(0).toISOString(),
      kind: "warning",
    });
  }
  // Dedupe by key (some paths add both payment + webhook + confirmed).
  const seen = new Set<string>();
  return events
    .filter((e) => {
      if (seen.has(e.key)) return false;
      seen.add(e.key);
      return true;
    })
    .sort((a, b) => a.at.localeCompare(b.at));
}
