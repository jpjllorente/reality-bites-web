import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

const StripeEnvSchema = z.enum(["sandbox", "live"]);

const CartItemSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  qty: z.number().int().min(1).max(99),
  variantId: z.string().trim().max(60).optional(),
  portion: z.boolean().optional(),
});

const CreateCheckoutSchema = z.object({
  environment: StripeEnvSchema,
  returnUrl: z.string().url().max(500),
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(3).max(40),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .optional()
      .or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  }),
  items: z.array(CartItemSchema).min(1).max(50),
});

type CheckoutResult =
  | { clientSecret: string; orderId: string }
  | { error: string };

type ProductVariantRow = { id: string; name: string; active?: boolean };

function resolveVariantName(variants: unknown, variantId?: string): string | null {
  if (!variantId || !Array.isArray(variants)) return null;
  const v = (variants as ProductVariantRow[]).find((x) => x?.id === variantId);
  if (!v || v.active === false) return null;
  return v.name ?? null;
}

export const createShopCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateCheckoutSchema.parse(data))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      // Resolve prices server-side from the DB to prevent tampering.
      const slugs = Array.from(new Set(data.items.map((i) => i.slug)));
      const { data: dbProducts, error: productsError } = await (supabaseAdmin
        .from("products") as any)
        .select("slug, name, price_cents, portion_price_cents, image_url, is_active, in_stock, variants")
        .in("slug", slugs);

      if (productsError) throw new Error(productsError.message);
      if (!dbProducts || dbProducts.length === 0) {
        return { error: "No se encontraron los productos del pedido." };
      }

      const bySlug = new Map<string, any>(dbProducts.map((p: any) => [p.slug, p]));
      const lineItems: Array<{
        name: string;
        qty: number;
        unit_amount: number;
        image?: string | null;
        slug: string;
        variantId?: string;
        portion?: boolean;
      }> = [];
      let totalCents = 0;

      for (const item of data.items) {
        const product = bySlug.get(item.slug);
        if (!product || !product.is_active || !product.in_stock) {
          return {
            error: !product ? `El producto "${item.slug}" ya no está disponible.` : `"${product.name}" está agotado o inactivo.`,
          };
        }
        const wantsPortion = item.portion === true;
        const portionCents = product.portion_price_cents as number | null;
        if (wantsPortion && (portionCents == null || portionCents <= 0)) {
          return { error: `"${product.name}" no tiene precio por porción.` };
        }
        const unitAmount = wantsPortion ? (portionCents as number) : (product.price_cents ?? 0);
        if (unitAmount < 30) {
          return { error: `El producto "${product.name}" tiene un precio inválido.` };
        }
        let variantLabel: string | null = null;
        if (item.variantId) {
          variantLabel = resolveVariantName(product.variants, item.variantId);
          if (!variantLabel) {
            return { error: `La variante seleccionada de "${product.name}" ya no está disponible.` };
          }
        }
        const displayName = [
          product.name,
          variantLabel ? `— ${variantLabel}` : null,
          wantsPortion ? "(porción)" : null,
        ].filter(Boolean).join(" ");
        totalCents += unitAmount * item.qty;
        lineItems.push({
          slug: product.slug,
          name: displayName,
          qty: item.qty,
          unit_amount: unitAmount,
          image: product.image_url,
          variantId: item.variantId,
          portion: wantsPortion,
        });
      }

      if (totalCents < 50) {
        return { error: "El importe mínimo de pago es 0,50 €." };
      }

      // Create the pending shop order before the Stripe session so we always
      // have a persistent record, even if the customer abandons checkout.
      const { data: order, error: orderError } = await supabaseAdmin
        .from("shop_orders")
        .insert({
          name: data.customer.name,
          phone: data.customer.phone,
          email: data.customer.email || null,
          notes: data.customer.notes || null,
          items: lineItems.map((li) => ({
            id: li.slug,
            name: li.name,
            qty: li.qty,
            price_cents: li.unit_amount,
            variant_id: li.variantId ?? null,
            portion: !!li.portion,
          })),
          total_cents: totalCents,
          payment_status: "unpaid",
        })
        .select("id")
        .single();

      if (orderError || !order) {
        console.error("[shop_orders] insert error", orderError);
        return { error: "No se pudo registrar el pedido." };
      }

      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        line_items: lineItems.map((li) => ({
          quantity: li.qty,
          price_data: {
            currency: "eur",
            unit_amount: li.unit_amount,
            product_data: {
              name: li.name,
              ...(li.image && /^https:\/\//i.test(li.image) ? { images: [li.image] } : {}),
            },
          },
        })),
        payment_intent_data: {
          description: `Pedido 144 Reality Bites — ${order.id.slice(0, 8)}`,
          metadata: { shop_order_id: order.id },
        },
        metadata: { shop_order_id: order.id },
        ...(data.customer.email ? { customer_email: data.customer.email } : {}),
      });

      await supabaseAdmin
        .from("shop_orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);

      return {
        clientSecret: session.client_secret ?? "",
        orderId: order.id,
      };
    } catch (error) {
      console.error("[stripe] createShopCheckoutSession", error);
      return { error: getStripeErrorMessage(error) };
    }
  });


const FinalizeSchema = z.object({
  environment: StripeEnvSchema,
  sessionId: z.string().min(1).max(200),
});

type FinalizeResult =
  | {
      status: "paid" | "pending" | "failed";
      orderId: string | null;
      total_cents: number;
      items: Array<{ id: string; name: string; qty: number; price_cents: number }>;
      customer: { name: string; phone: string; email: string | null; notes: string | null };
    }
  | { error: string };

export const finalizeShopCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => FinalizeSchema.parse(data))
  .handler(async ({ data }): Promise<FinalizeResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);

      const paid = session.payment_status === "paid";
      const orderId =
        (session.metadata?.shop_order_id as string | undefined) ?? null;

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      if (paid && orderId) {
        await (supabaseAdmin.from("shop_orders") as any)
          .update({
            payment_status: "paid",
            amount_paid_cents: session.amount_total ?? null,
            payment_confirmed_at: new Date().toISOString(),
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent as any)?.id ?? null,
          })
          .eq("id", orderId)
          .neq("payment_status", "paid");

        // Fire-and-forget: dispatch emails as a fallback in case the
        // webhook hasn't landed yet. sendShopOrderEmails is idempotent.
        try {
          const { sendShopOrderEmails } = await import(
            "@/lib/shop-order-mailer.server"
          );
          await sendShopOrderEmails(orderId);
        } catch (e) {
          console.error("[finalize] email dispatch failed", e);
        }
      }

      if (!orderId) {
        return {
          status: paid ? "paid" : session.payment_status === "unpaid" ? "pending" : "failed",
          orderId: null,
          total_cents: session.amount_total ?? 0,
          items: [],
          customer: { name: "", phone: "", email: null, notes: null },
        };
      }

      const { data: order, error } = await supabaseAdmin
        .from("shop_orders")
        .select("id, name, phone, email, notes, items, total_cents, payment_status")
        .eq("id", orderId)
        .single();

      if (error || !order) {
        return { error: "No se encontró el pedido." };
      }

      const status: "paid" | "pending" | "failed" =
        order.payment_status === "paid"
          ? "paid"
          : session.payment_status === "unpaid"
            ? "pending"
            : "failed";

      return {
        status,
        orderId: order.id,
        total_cents: order.total_cents,
        items: (order.items as Array<{
          id: string;
          name: string;
          qty: number;
          price_cents: number;
        }>) ?? [],
        customer: {
          name: order.name,
          phone: order.phone,
          email: order.email,
          notes: order.notes,
        },
      };
    } catch (error) {
      console.error("[stripe] finalizeShopCheckout", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

// ---------- Reserva sin pago (pagar en tienda) ----------

const InStoreSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(3).max(40),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  }),
  items: z.array(CartItemSchema).min(1).max(50),
});

type InStoreResult = { orderId: string } | { error: string };

export const createInStoreOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InStoreSchema.parse(data))
  .handler(async ({ data }): Promise<InStoreResult> => {
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const slugs = Array.from(new Set(data.items.map((i) => i.slug)));
      const { data: dbProducts, error: productsError } = await (supabaseAdmin
        .from("products") as any)
        .select("slug, name, price_cents, portion_price_cents, image_url, is_active, in_stock, variants")
        .in("slug", slugs);
      if (productsError) throw new Error(productsError.message);
      if (!dbProducts || dbProducts.length === 0) {
        return { error: "No se encontraron los productos del pedido." };
      }

      const bySlug = new Map<string, any>(dbProducts.map((p: any) => [p.slug, p]));
      const lineItems: Array<{
        id: string;
        name: string;
        qty: number;
        price_cents: number;
        variant_id: string | null;
        variant_name: string | null;
        portion: boolean;
      }> = [];
      let totalCents = 0;
      for (const item of data.items) {
        const product = bySlug.get(item.slug);
        if (!product || !product.is_active || !product.in_stock) {
          return { error: !product ? `El producto "${item.slug}" ya no está disponible.` : `"${product.name}" está agotado o inactivo.` };
        }
        const wantsPortion = item.portion === true;
        const portionCents = product.portion_price_cents as number | null;
        if (wantsPortion && (portionCents == null || portionCents <= 0)) {
          return { error: `"${product.name}" no tiene precio por porción.` };
        }
        const unit = wantsPortion ? (portionCents as number) : (product.price_cents ?? 0);
        let variantLabel: string | null = null;
        if (item.variantId) {
          variantLabel = resolveVariantName(product.variants, item.variantId);
          if (!variantLabel) {
            return { error: `La variante seleccionada de "${product.name}" ya no está disponible.` };
          }
        }
        const displayName = [
          product.name,
          variantLabel ? `— ${variantLabel}` : null,
          wantsPortion ? "(porción)" : null,
        ].filter(Boolean).join(" ");
        totalCents += unit * item.qty;
        lineItems.push({
          id: product.slug,
          name: displayName,
          qty: item.qty,
          price_cents: unit,
          variant_id: item.variantId ?? null,
          variant_name: variantLabel,
          portion: wantsPortion,
        });
      }

      const { data: order, error: orderError } = await supabaseAdmin
        .from("shop_orders")
        .insert({
          name: data.customer.name,
          phone: data.customer.phone,
          email: data.customer.email || null,
          notes: data.customer.notes || null,
          items: lineItems,
          total_cents: totalCents,
          payment_status: "pay_in_store",
        })
        .select("id")
        .single();
      if (orderError || !order) {
        return { error: "No se pudo registrar la reserva." };
      }

      try {
        const { sendInStoreOrderEmails } = await import(
          "@/lib/shop-order-mailer.server"
        );
        await sendInStoreOrderEmails(order.id);
      } catch (e) {
        console.error("[in-store] email dispatch failed", e);
      }

      return { orderId: order.id };
    } catch (error) {
      console.error("[in-store] createInStoreOrder", error);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo crear la reserva.",
      };
    }
  });

// ============ Admin lifecycle ops ============

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin as assertAdminRole } from "./auth-admin.functions";

const OrderIdSchema = z.object({ orderId: z.string().uuid() });

export const markInStorePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrderIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("shop_orders")
      .select("id, payment_status, total_cents")
      .eq("id", data.orderId)
      .single();
    if (error || !order) return { error: "Pedido no encontrado." };
    if (order.payment_status === "paid" || order.payment_status === "refunded") {
      return { error: "El pedido ya está cerrado." };
    }
    const now = new Date().toISOString();
    const { error: uErr } = await (supabaseAdmin.from("shop_orders") as any)
      .update({
        payment_status: "paid",
        amount_paid_cents: order.total_cents,
        payment_confirmed_at: now,
        in_store_paid_at: now,
        status: "completed",
      })
      .eq("id", data.orderId);
    if (uErr) return { error: uErr.message };
    try {
      const { sendInStorePaidNotification } = await import("./shop-order-mailer.server");
      await sendInStorePaidNotification(data.orderId);
    } catch (e) { console.error("[markInStorePaid] mail failed", e); }
    return { ok: true };
  });

const RefundSchema = z.object({
  orderId: z.string().uuid(),
  amountCents: z.number().int().min(1).max(100_000_000).optional(),
  reason: z.string().trim().max(500).optional(),
  environment: StripeEnvSchema.default("sandbox"),
});

export const refundShopOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RefundSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("shop_orders")
      .select("id, stripe_payment_intent_id, amount_paid_cents, amount_refunded_cents, payment_status")
      .eq("id", data.orderId)
      .single();
    if (!order) return { error: "Pedido no encontrado." };
    if (!order.stripe_payment_intent_id) {
      return { error: "Este pedido no tiene pago en Stripe (posible cobro en tienda)." };
    }
    if (order.payment_status !== "paid" && order.payment_status !== "partially_refunded") {
      return { error: "El pedido no está en un estado reembolsable." };
    }
    try {
      const stripe = createStripeClient(data.environment);
      await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        ...(data.amountCents ? { amount: data.amountCents } : {}),
        ...(data.reason ? { metadata: { reason: data.reason } } : {}),
      });
      // The webhook charge.refunded will update the row + notify the customer.
      return { ok: true };
    } catch (e) {
      console.error("[refundShopOrder]", e);
      return { error: getStripeErrorMessage(e) };
    }
  });

const CancelSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
  refundAmountCents: z.number().int().min(0).max(100_000_000).optional(),
  environment: StripeEnvSchema.default("sandbox"),
});

export const cancelShopOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CancelSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("shop_orders")
      .select("id, stripe_payment_intent_id, amount_paid_cents, amount_refunded_cents, payment_status")
      .eq("id", data.orderId)
      .single();
    if (!order) return { error: "Pedido no encontrado." };

    let refundedCents = 0;
    const isPaid = order.payment_status === "paid" || order.payment_status === "partially_refunded";
    const wantRefund = (data.refundAmountCents ?? 0) > 0;

    if (isPaid && wantRefund && order.stripe_payment_intent_id) {
      try {
        const stripe = createStripeClient(data.environment);
        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: data.refundAmountCents,
          ...(data.reason ? { metadata: { reason: data.reason } } : {}),
        });
        refundedCents = refund.amount ?? data.refundAmountCents ?? 0;
      } catch (e) {
        console.error("[cancelShopOrder refund]", e);
        return { error: getStripeErrorMessage(e) };
      }
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: "cancelled",
      cancelled_at: now,
      cancellation_reason: data.reason || null,
    };
    // If unpaid or pay_in_store, mark payment as cancelled outright.
    if (!isPaid) {
      updates.payment_status = "cancelled";
    }
    const { error: uErr } = await (supabaseAdmin.from("shop_orders") as any)
      .update(updates)
      .eq("id", data.orderId);
    if (uErr) return { error: uErr.message };

    try {
      const { sendCancellationNotification } = await import("./shop-order-mailer.server");
      // Refund email is sent by the webhook when Stripe confirms; here we send
      // a cancellation notice with the intended refund amount for context.
      await sendCancellationNotification({
        orderId: data.orderId,
        reason: data.reason,
        refundedCents,
      });
    } catch (e) { console.error("[cancelShopOrder] mail failed", e); }

    return { ok: true, refundedCents };
  });

// ============ Product ↔ Stripe mirror ============

const SyncProductSchema = z.object({ productId: z.string().uuid() });

export const syncProductToStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SyncProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.supabase, context.userId);
    const { syncProductToStripeInternal } = await import(
      "./stripe-product-sync.server"
    );
    return syncProductToStripeInternal(data.productId);
  });
