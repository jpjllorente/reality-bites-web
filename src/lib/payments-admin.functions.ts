import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./auth-admin.functions";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

const StripeEnvSchema = z.enum(["sandbox", "live"]);

const FiltersSchema = z.object({
  status: z
    .enum(["all", "paid", "refunded", "partially_refunded", "failed", "unpaid", "in_store_paid"])
    .default("all"),
  from: z.string().datetime().nullable().optional(),
  to: z.string().datetime().nullable().optional(),
  search: z.string().trim().max(200).nullable().optional(),
  limit: z.number().int().min(10).max(500).default(50),
  offset: z.number().int().min(0).max(100_000).default(0),
});

export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => FiltersSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    let q = (supabaseAdmin.from("shop_orders") as any)
      .select(
        "id, created_at, name, email, phone, total_cents, amount_paid_cents, amount_refunded_cents, payment_status, payment_method, stripe_session_id, stripe_payment_intent_id, payment_confirmed_at, refunded_at, payment_failed_at, payment_failure_reason, status",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.status !== "all") q = q.eq("payment_status", data.status);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, "");
      q = q.or(
        `name.ilike.%${s}%,email.ilike.%${s}%,stripe_session_id.ilike.%${s}%,stripe_payment_intent_id.ilike.%${s}%`,
      );
    }
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0 };
  });

const EventsFiltersSchema = z.object({
  limit: z.number().int().min(10).max(500).default(50),
  offset: z.number().int().min(0).max(100_000).default(0),
  onlyErrors: z.boolean().default(false),
});

export const listWebhookEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EventsFiltersSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    let q = (supabaseAdmin
      .from("stripe_webhook_events") as any)
      .select("event_id, event_type, environment, received_at, processed_at, error", { count: "exact" })
      .order("received_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.onlyErrors) q = q.not("error", "is", null);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0 };
  });

// ============ Reconciliation ============

const ReconcileSchema = z.object({
  environment: StripeEnvSchema,
  days: z.number().int().min(1).max(90).default(7),
});

type Discrepancy = {
  kind:
    | "stripe_paid_not_in_db"
    | "db_paid_not_in_stripe"
    | "amount_mismatch"
    | "refund_mismatch"
    | "status_mismatch";
  paymentIntentId: string | null;
  sessionId: string | null;
  orderId: string | null;
  stripeAmount: number | null;
  dbAmount: number | null;
  stripeRefunded: number | null;
  dbRefunded: number | null;
  stripeStatus: string | null;
  dbStatus: string | null;
  customer: string | null;
  created: string | null;
  detail: string;
};

export const reconcileWithStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReconcileSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    try {
      const stripe = createStripeClient(data.environment);
      const since = Math.floor(Date.now() / 1000) - data.days * 86400;

      // Fetch recent PaymentIntents (paginated up to 500).
      const stripePIs: any[] = [];
      let starting_after: string | undefined;
      for (let i = 0; i < 5; i++) {
        const page = await stripe.paymentIntents.list({
          created: { gte: since },
          limit: 100,
          ...(starting_after ? { starting_after } : {}),
        });
        stripePIs.push(...page.data);
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1]?.id;
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sinceIso = new Date(since * 1000).toISOString();
      const { data: orders } = await supabaseAdmin
        .from("shop_orders")
        .select(
          "id, name, email, created_at, total_cents, amount_paid_cents, amount_refunded_cents, payment_status, stripe_payment_intent_id, stripe_session_id",
        )
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false });

      const ordersByPi = new Map<string, any>();
      for (const o of orders ?? []) {
        if (o.stripe_payment_intent_id) ordersByPi.set(o.stripe_payment_intent_id, o);
      }

      const discrepancies: Discrepancy[] = [];
      const seenPis = new Set<string>();

      // Fetch charges lazily to compute refunds where PI has charges expanded.
      for (const pi of stripePIs) {
        seenPis.add(pi.id);
        const order = ordersByPi.get(pi.id);
        const stripePaid = pi.status === "succeeded";
        const stripeAmount = pi.amount_received ?? pi.amount ?? 0;
        // Aggregate refunds from latest_charge if available; else 0 (best-effort).
        let stripeRefunded = 0;
        const latestCharge = pi.latest_charge;
        if (typeof latestCharge === "string" && stripePaid) {
          try {
            const ch = await stripe.charges.retrieve(latestCharge);
            stripeRefunded = ch.amount_refunded ?? 0;
          } catch {
            /* ignore */
          }
        }
        const created = new Date((pi.created ?? 0) * 1000).toISOString();

        if (!order) {
          if (stripePaid) {
            discrepancies.push({
              kind: "stripe_paid_not_in_db",
              paymentIntentId: pi.id,
              sessionId: null,
              orderId: (pi.metadata?.shop_order_id as string) ?? null,
              stripeAmount,
              dbAmount: null,
              stripeRefunded,
              dbRefunded: null,
              stripeStatus: pi.status,
              dbStatus: null,
              customer: pi.receipt_email ?? null,
              created,
              detail: "Pago en Stripe sin pedido asociado en la BD.",
            });
          }
          continue;
        }

        const dbPaid =
          order.payment_status === "paid" ||
          order.payment_status === "partially_refunded" ||
          order.payment_status === "refunded";

        if (stripePaid && !dbPaid) {
          discrepancies.push({
            kind: "status_mismatch",
            paymentIntentId: pi.id,
            sessionId: order.stripe_session_id,
            orderId: order.id,
            stripeAmount,
            dbAmount: order.amount_paid_cents ?? 0,
            stripeRefunded,
            dbRefunded: order.amount_refunded_cents ?? 0,
            stripeStatus: pi.status,
            dbStatus: order.payment_status,
            customer: order.email ?? order.name,
            created,
            detail: "Stripe marca pagado pero la BD no.",
          });
        } else if (stripePaid && (order.amount_paid_cents ?? 0) !== stripeAmount) {
          discrepancies.push({
            kind: "amount_mismatch",
            paymentIntentId: pi.id,
            sessionId: order.stripe_session_id,
            orderId: order.id,
            stripeAmount,
            dbAmount: order.amount_paid_cents ?? 0,
            stripeRefunded,
            dbRefunded: order.amount_refunded_cents ?? 0,
            stripeStatus: pi.status,
            dbStatus: order.payment_status,
            customer: order.email ?? order.name,
            created,
            detail: "Importe cobrado no coincide con Stripe.",
          });
        }

        if (stripeRefunded !== (order.amount_refunded_cents ?? 0)) {
          discrepancies.push({
            kind: "refund_mismatch",
            paymentIntentId: pi.id,
            sessionId: order.stripe_session_id,
            orderId: order.id,
            stripeAmount,
            dbAmount: order.amount_paid_cents ?? 0,
            stripeRefunded,
            dbRefunded: order.amount_refunded_cents ?? 0,
            stripeStatus: pi.status,
            dbStatus: order.payment_status,
            customer: order.email ?? order.name,
            created,
            detail: "El importe reembolsado difiere entre Stripe y la BD.",
          });
        }
      }

      // DB says paid but PI is not in the recent Stripe list → orphan or old.
      for (const o of orders ?? []) {
        if (
          o.stripe_payment_intent_id &&
          !seenPis.has(o.stripe_payment_intent_id) &&
          (o.payment_status === "paid" || o.payment_status === "partially_refunded")
        ) {
          // Only report if created within the window (already filtered above).
          discrepancies.push({
            kind: "db_paid_not_in_stripe",
            paymentIntentId: o.stripe_payment_intent_id,
            sessionId: o.stripe_session_id,
            orderId: o.id,
            stripeAmount: null,
            dbAmount: o.amount_paid_cents ?? 0,
            stripeRefunded: null,
            dbRefunded: o.amount_refunded_cents ?? 0,
            stripeStatus: null,
            dbStatus: o.payment_status,
            customer: o.email ?? o.name,
            created: o.created_at,
            detail: "La BD marca pagado pero no aparece en la lista reciente de Stripe.",
          });
        }
      }

      return {
        checkedStripe: stripePIs.length,
        checkedDb: orders?.length ?? 0,
        windowDays: data.days,
        discrepancies,
      };
    } catch (e) {
      console.error("[reconcileWithStripe]", e);
      return { error: getStripeErrorMessage(e) };
    }
  });

// ============ Payment detail ============

const DetailSchema = z.object({
  environment: StripeEnvSchema,
  paymentIntentId: z.string().trim().min(3).max(200),
});

export const getPaymentDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DetailSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    try {
      const stripe = createStripeClient(data.environment);
      const pi = await stripe.paymentIntents.retrieve(data.paymentIntentId, {
        expand: ["latest_charge", "latest_charge.refunds"],
      });

      const charge: any = pi.latest_charge && typeof pi.latest_charge !== "string" ? pi.latest_charge : null;
      const refunds: any[] = charge?.refunds?.data ?? [];

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: order } = await supabaseAdmin
        .from("shop_orders")
        .select(
          "id, created_at, name, email, phone, notes, items, total_cents, amount_paid_cents, amount_refunded_cents, payment_status, status, stripe_session_id, stripe_payment_intent_id, payment_confirmed_at, refunded_at, payment_failed_at, payment_failure_reason, cancelled_at, cancellation_reason, in_store_paid_at",
        )
        .eq("stripe_payment_intent_id", data.paymentIntentId)
        .maybeSingle();

      type TimelineEvent = { at: string; label: string; kind: "info" | "success" | "warning" | "danger"; detail?: string };
      const timeline: TimelineEvent[] = [];

      timeline.push({
        at: new Date((pi.created ?? 0) * 1000).toISOString(),
        label: "PaymentIntent creado",
        kind: "info",
        detail: `${pi.id} · ${(pi.amount ?? 0) / 100} ${pi.currency?.toUpperCase()}`,
      });

      if (charge) {
        timeline.push({
          at: new Date((charge.created ?? 0) * 1000).toISOString(),
          label: charge.paid ? "Cobro confirmado" : "Cobro creado",
          kind: charge.paid ? "success" : "info",
          detail: charge.payment_method_details?.type
            ? `Método: ${charge.payment_method_details.type}`
            : undefined,
        });
        if (charge.failure_message) {
          timeline.push({
            at: new Date((charge.created ?? 0) * 1000).toISOString(),
            label: "Cobro fallido",
            kind: "danger",
            detail: charge.failure_message,
          });
        }
      }

      for (const r of refunds) {
        timeline.push({
          at: new Date((r.created ?? 0) * 1000).toISOString(),
          label: `Reembolso ${r.status}`,
          kind: r.status === "succeeded" ? "warning" : r.status === "failed" ? "danger" : "info",
          detail: `${(r.amount ?? 0) / 100} ${(r.currency ?? "eur").toUpperCase()}${r.reason ? ` · ${r.reason}` : ""}`,
        });
      }

      if (order) {
        if (order.payment_confirmed_at) {
          timeline.push({
            at: order.payment_confirmed_at,
            label: "BD: pedido confirmado",
            kind: "success",
          });
        }
        if (order.refunded_at) {
          timeline.push({
            at: order.refunded_at,
            label: "BD: reembolso registrado",
            kind: "warning",
          });
        }
        if (order.payment_failed_at) {
          timeline.push({
            at: order.payment_failed_at,
            label: "BD: pago fallido",
            kind: "danger",
            detail: order.payment_failure_reason ?? undefined,
          });
        }
        if (order.cancelled_at) {
          timeline.push({
            at: order.cancelled_at,
            label: "BD: pedido cancelado",
            kind: "warning",
            detail: order.cancellation_reason ?? undefined,
          });
        }
      }

      timeline.sort((a, b) => a.at.localeCompare(b.at));

      return {
        paymentIntent: {
          id: pi.id,
          status: pi.status,
          amount: pi.amount ?? 0,
          amount_received: pi.amount_received ?? 0,
          currency: pi.currency ?? "eur",
          created: new Date((pi.created ?? 0) * 1000).toISOString(),
          receipt_email: pi.receipt_email ?? null,
          description: pi.description ?? null,
        },
        charge: charge
          ? {
              id: charge.id,
              amount: charge.amount ?? 0,
              amount_refunded: charge.amount_refunded ?? 0,
              paid: !!charge.paid,
              status: charge.status,
              receipt_url: charge.receipt_url ?? null,
              method: charge.payment_method_details?.type ?? null,
            }
          : null,
        refunds: refunds.map((r) => ({
          id: r.id,
          amount: r.amount ?? 0,
          currency: r.currency ?? "eur",
          status: r.status,
          reason: r.reason ?? null,
          created: new Date((r.created ?? 0) * 1000).toISOString(),
        })),
        order,
        timeline,
      };
    } catch (e) {
      console.error("[getPaymentDetail]", e);
      return { error: getStripeErrorMessage(e) };
    }
  });
