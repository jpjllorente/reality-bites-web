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

export const createShopCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateCheckoutSchema.parse(data))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      // Resolve prices server-side from the DB to prevent tampering.
      const slugs = Array.from(new Set(data.items.map((i) => i.slug)));
      const { data: dbProducts, error: productsError } = await supabaseAdmin
        .from("products")
        .select("slug, name, price_cents, image_url, is_active")
        .in("slug", slugs);

      if (productsError) throw new Error(productsError.message);
      if (!dbProducts || dbProducts.length === 0) {
        return { error: "No se encontraron los productos del pedido." };
      }

      const bySlug = new Map(dbProducts.map((p) => [p.slug, p]));
      const lineItems: Array<{
        name: string;
        qty: number;
        unit_amount: number;
        image?: string | null;
        slug: string;
      }> = [];
      let totalCents = 0;

      for (const item of data.items) {
        const product = bySlug.get(item.slug);
        if (!product || !product.is_active) {
          return {
            error: `El producto "${item.slug}" ya no está disponible.`,
          };
        }
        const unitAmount = product.price_cents ?? 0;
        if (unitAmount < 30) {
          return {
            error: `El producto "${product.name}" tiene un precio inválido.`,
          };
        }
        totalCents += unitAmount * item.qty;
        lineItems.push({
          slug: product.slug,
          name: product.name,
          qty: item.qty,
          unit_amount: unitAmount,
          image: product.image_url,
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
              ...(li.image ? { images: [li.image] } : {}),
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
