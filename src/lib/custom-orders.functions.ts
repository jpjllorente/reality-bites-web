import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./auth-admin.functions";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

const OrderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  orderType: z.string().trim().min(1).max(60),
  eventDate: z.string().trim().max(20).optional().or(z.literal("")),
  servings: z.number().int().min(1).max(1000).optional().nullable(),
  flavors: z.string().trim().max(500).optional().or(z.literal("")),
  allergens: z.string().trim().max(500).optional().or(z.literal("")),
  budgetRange: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const submitCustomOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => OrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inserted, error } = await supabaseAdmin
      .from("custom_orders")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        order_type: data.orderType,
        event_date: data.eventDate || null,
        servings: data.servings ?? null,
        flavors: data.flavors || null,
        allergens: data.allergens || null,
        budget_range: data.budgetRange || null,
        message: data.message || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[custom_orders] insert error", error);
      throw new Error("No se pudo guardar la solicitud.");
    }

    // Try to send an email notification. If the template registry / email
    // domain aren't ready yet, we don't fail the request — the row is safe.
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("custom-order-notification", "hola@144reality.com", {
        templateData: {
          name: data.name,
          email: data.email,
          phone: data.phone || "-",
          orderType: data.orderType,
          eventDate: data.eventDate || "-",
          servings: data.servings ? String(data.servings) : "-",
          flavors: data.flavors || "-",
          allergens: data.allergens || "-",
          budgetRange: data.budgetRange || "-",
          message: data.message || "-",
        },
        idempotencyKey: `custom-order-${inserted.id}`,
        replyTo: data.email,
      });
      await sendTemplateEmail("custom-order-confirmation", data.email, {
        templateData: { name: data.name, orderType: data.orderType },
        idempotencyKey: `custom-order-confirm-${inserted.id}`,
      });
    } catch (err) {
      console.error("[custom_orders] email send failed", err);
    }


    return { ok: true, id: inserted.id };
  });

// =============================================================
// Quote + payment link flow
// =============================================================

const StripeEnvSchema = z.enum(["sandbox", "live"]);

const SendQuoteSchema = z.object({
  orderId: z.string().uuid(),
  totalCents: z.number().int().min(50).max(100_000_000),
  depositPercent: z.number().int().min(1).max(100),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  publicOrigin: z.string().url().max(500),
});

export const sendCustomOrderQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendQuoteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await (supabaseAdmin
      .from("custom_orders") as any)
      .update({
        quote_total_cents: data.totalCents,
        deposit_percent: data.depositPercent,
        quote_notes: data.notes || null,
        quote_sent_at: new Date().toISOString(),
        payment_status: "unpaid",
        status: "reviewing",
      })
      .eq("id", data.orderId)
      .select("id, name, email, order_type, payment_token")
      .single();
    if (error || !order) return { error: "No se pudo guardar el presupuesto." };

    const depositCents = Math.max(
      50,
      Math.round((data.totalCents * data.depositPercent) / 100),
    );
    const paymentUrl = `${data.publicOrigin.replace(/\/$/, "")}/encargos/pagar/${order.payment_token}`;

    try {
      const { sendTemplateEmail } = await import(
        "@/lib/email-templates/send-email"
      );
      await sendTemplateEmail("custom-order-quote", order.email, {
        idempotencyKey: `custom-quote-${order.id}-${Date.now()}`,
        templateData: {
          name: order.name,
          orderType: order.order_type,
          totalCents: data.totalCents,
          depositPercent: data.depositPercent,
          depositCents,
          paymentUrl,
          notes: data.notes || "",
        },
      });
    } catch (e) {
      console.error("[custom_orders] quote email failed", e);
      return { error: "Presupuesto guardado, pero no se pudo enviar el email." };
    }

    return { ok: true, paymentUrl };
  });

// ---------- Public: read a quote by token ----------

const TokenSchema = z.object({
  token: z.string().uuid(),
});

export const getCustomOrderQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error } = await supabaseAdmin
      .from("custom_orders")
      .select(
        "id, name, order_type, event_date, quote_total_cents, deposit_percent, quote_notes, quote_sent_at, payment_status, amount_paid_cents, payment_mode",
      )
      .eq("payment_token", data.token)
      .maybeSingle();
    if (error) return { error: "No se pudo cargar el presupuesto." };
    if (!row || row.quote_total_cents == null) {
      return { error: "Presupuesto no disponible." };
    }
    return { ok: true as const, quote: row };
  });

// ---------- Public: create Stripe checkout for a quote ----------

const CreateQuoteCheckoutSchema = z.object({
  token: z.string().uuid(),
  mode: z.enum(["deposit", "full"]),
  environment: StripeEnvSchema,
  returnUrl: z.string().url().max(500),
});

export const createCustomOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateQuoteCheckoutSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: row, error } = await supabaseAdmin
        .from("custom_orders")
        .select(
          "id, name, email, order_type, quote_total_cents, deposit_percent, payment_status",
        )
        .eq("payment_token", data.token)
        .maybeSingle();
      if (error || !row) return { error: "Presupuesto no disponible." };
      if (row.quote_total_cents == null || row.deposit_percent == null) {
        return { error: "Presupuesto no disponible." };
      }
      if (row.payment_status === "paid") {
        return { error: "Este encargo ya está pagado por completo." };
      }
      if (row.payment_status === "deposit_paid" && data.mode === "deposit") {
        return { error: "El anticipo ya fue abonado." };
      }

      const total = row.quote_total_cents;
      const deposit = Math.max(50, Math.round((total * row.deposit_percent) / 100));
      const amount = data.mode === "deposit" ? deposit : total;
      if (amount < 50) return { error: "Importe demasiado bajo." };

      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: amount,
              product_data: {
                name:
                  data.mode === "deposit"
                    ? `Anticipo (${row.deposit_percent}%) — ${row.order_type}`
                    : `Encargo completo — ${row.order_type}`,
                description: `Cliente: ${row.name}`,
              },
            },
          },
        ],
        payment_intent_data: {
          description: `Encargo 144 Reality — ${row.id.slice(0, 8)} (${data.mode === "deposit" ? "anticipo" : "total"})`,
          metadata: { custom_order_id: row.id, payment_mode: data.mode },
        },
        metadata: { custom_order_id: row.id, payment_mode: data.mode },
        ...(row.email ? { customer_email: row.email } : {}),
      });

      await (supabaseAdmin.from("custom_orders") as any)
        .update({ stripe_session_id: session.id, payment_mode: data.mode })
        .eq("id", row.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      console.error("[custom_orders] createCustomOrderPayment", e);
      return { error: getStripeErrorMessage(e) };
    }
  });

// ---------- Public: finalize (return page) ----------

const FinalizeQuoteSchema = z.object({
  sessionId: z.string().min(1).max(200),
  environment: StripeEnvSchema,
});

export const finalizeCustomOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FinalizeQuoteSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      const orderId = session.metadata?.custom_order_id as string | undefined;
      const mode = (session.metadata?.payment_mode as "deposit" | "full" | undefined) ?? "full";
      const paid = session.payment_status === "paid";

      if (paid && orderId) {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const nextStatus = mode === "full" ? "paid" : "deposit_paid";
        await (supabaseAdmin.from("custom_orders") as any)
          .update({
            payment_status: nextStatus,
            amount_paid_cents: session.amount_total ?? null,
            paid_at: new Date().toISOString(),
            payment_mode: mode,
            status: "confirmed",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent as any)?.id ?? null,
          })
          .eq("id", orderId)
          .neq("payment_status", "paid");

        try {
          const { sendCustomOrderPaidEmail } = await import(
            "@/lib/custom-order-mailer.server"
          );
          await sendCustomOrderPaidEmail(orderId);
        } catch (e) {
          console.error("[finalize custom] mail failed", e);
        }
      }

      return {
        status: paid ? ("paid" as const) : session.payment_status === "unpaid" ? ("pending" as const) : ("failed" as const),
        mode,
        amountCents: session.amount_total ?? 0,
      };
    } catch (e) {
      console.error("[custom_orders] finalize", e);
      return { error: getStripeErrorMessage(e) };
    }
  });
