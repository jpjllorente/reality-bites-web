import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

const StripeEnvSchema = z.enum(["sandbox", "live"]);

/**
 * Server fn used by the pro portal to gate access without exposing the
 * has_role internals to the client.
 */
export const amIPro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "pro",
    });
    return { isPro: Boolean(data) };
  });

/**
 * Get the pro customer profile of the current signed-in user (RLS-scoped).
 */
export const getMyProProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("pro_customers")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

/**
 * List the products visible in the PRO catalog.
 */
export const listProCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("products")
      .select(
        "id, slug, name, description, category, image_url, price_cents, wholesale_price_cents, tax_rate_percent, in_stock, variants, tags",
      )
      .eq("visible_pro", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CreateProOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty: z.number().int().min(1).max(9999),
        variant_id: z.string().max(60).nullable().optional(),
        portion: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(200),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  requested_delivery_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

/**
 * Pro user creates a new order. Prices are ALWAYS resolved server-side from
 * the products table (never trust client-supplied prices). Discount from
 * pro_customers is applied on top of wholesale price.
 */
export const createProOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateProOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    // 1. Load pro customer (RLS ensures own row).
    const { data: pro, error: proErr } = await (context.supabase as any)
      .from("pro_customers")
      .select("id, discount_percent, is_active, default_payment_method_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (proErr) throw new Error(proErr.message);
    if (!pro) throw new Error("No tienes perfil PRO.");
    if (!pro.is_active) throw new Error("Tu cuenta PRO está desactivada.");
    if (!pro.default_payment_method_id) {
      throw new Error(
        "Debes añadir un método de pago antes de realizar tu primer pedido.",
      );
    }

    // 2. Load all requested products via the caller's authenticated client
    // (RLS enforces visible_pro=true and pro role).
    const productIds = Array.from(new Set(data.items.map((i) => i.product_id)));
    const { data: products, error: pErr } = await (context.supabase as any)
      .from("products")
      .select(
        "id, name, slug, wholesale_price_cents, price_cents, portion_price_cents, tax_rate_percent, in_stock, variants, visible_pro",
      )
      .in("id", productIds);
    if (pErr) throw new Error(pErr.message);
    const byId = new Map<string, any>((products ?? []).map((p: any) => [p.id, p]));

    // 3. Build order lines with server-authoritative pricing.
    const lines: any[] = [];
    let subtotalCents = 0;
    let taxCents = 0;

    for (const item of data.items) {
      const p = byId.get(item.product_id);
      if (!p) throw new Error("Producto no disponible en catálogo PRO.");
      if (!p.visible_pro) throw new Error(`"${p.name}" no está en catálogo PRO.`);
      if (!p.in_stock) throw new Error(`"${p.name}" está agotado.`);

      // Resolve unit price: wholesale wins over public price.
      const baseCents =
        item.portion === true
          ? p.portion_price_cents ?? 0
          : p.wholesale_price_cents ?? p.price_cents ?? 0;
      if (baseCents <= 0) {
        throw new Error(`"${p.name}" no tiene precio profesional configurado.`);
      }
      // Apply per-customer discount.
      const discounted = Math.round(baseCents * (100 - pro.discount_percent)) / 100;
      const unitPriceCents = Math.max(1, Math.round(discounted));

      // Variant validation.
      let variantName: string | null = null;
      if (item.variant_id) {
        const vs = Array.isArray(p.variants) ? p.variants : [];
        const v = vs.find(
          (x: any) => x?.id === item.variant_id && x?.active !== false,
        );
        if (!v) throw new Error(`Variante inválida en "${p.name}".`);
        variantName = v.name;
      }

      const lineSubtotal = unitPriceCents * item.qty;
      const lineTax = Math.round((lineSubtotal * p.tax_rate_percent) / 100);
      subtotalCents += lineSubtotal;
      taxCents += lineTax;

      lines.push({
        product_id: p.id,
        slug: p.slug,
        name: p.name,
        qty: item.qty,
        unit_price_cents: unitPriceCents,
        base_price_cents: baseCents,
        tax_rate_percent: p.tax_rate_percent,
        variant_id: item.variant_id ?? null,
        variant: variantName,
        portion: item.portion === true,
      });
    }

    const totalCents = subtotalCents + taxCents;

    const { data: inserted, error: insertErr } = await (context.supabase as any)
      .from("pro_orders")
      .insert({
        pro_customer_id: pro.id,
        user_id: context.userId,
        items: lines,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        notes: data.notes || null,
        requested_delivery_date: data.requested_delivery_date || null,
      })
      .select("id")
      .single();
    if (insertErr) throw new Error(insertErr.message);
    return { ok: true, id: inserted.id };
  });

/**
 * Pro user's own orders (RLS-scoped).
 */
export const listMyProOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("pro_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Create a Stripe SetupIntent so the pro user can save a payment method
 * that will be used to auto-charge future invoices.
 */
export const createProSetupIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ environment: StripeEnvSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    try {
      const { data: pro, error } = await (context.supabase as any)
        .from("pro_customers")
        .select("stripe_customer_id")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!pro?.stripe_customer_id) throw new Error("No tienes cliente Stripe asociado.");

      const stripe = createStripeClient(data.environment);
      const intent = await stripe.setupIntents.create({
        customer: pro.stripe_customer_id,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: { user_id: context.userId },
      });
      return { clientSecret: intent.client_secret ?? "" };
    } catch (e) {
      console.error("[createProSetupIntent]", e);
      return { error: getStripeErrorMessage(e) };
    }
  });

/**
 * After a SetupIntent succeeds client-side, persist the resulting payment
 * method as the default for the pro customer + Stripe customer.
 */
export const attachProPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        environment: StripeEnvSchema,
        paymentMethodId: z.string().trim().min(3).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    try {
      const { data: pro, error } = await (context.supabase as any)
        .from("pro_customers")
        .select("id, stripe_customer_id")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!pro?.stripe_customer_id) throw new Error("Sin cliente Stripe.");

      const stripe = createStripeClient(data.environment);
      // Set as default on the customer.
      await stripe.customers.update(pro.stripe_customer_id, {
        invoice_settings: { default_payment_method: data.paymentMethodId },
      });
      // Persist on pro_customers via RLS-scoped update (own row).
      const { error: upErr } = await (context.supabase as any)
        .from("pro_customers")
        .update({ default_payment_method_id: data.paymentMethodId })
        .eq("id", pro.id);
      if (upErr) throw new Error(upErr.message);
      return { ok: true };
    } catch (e) {
      console.error("[attachProPaymentMethod]", e);
      return { error: getStripeErrorMessage(e) };
    }
  });

/**
 * List the pro user's saved payment methods.
 */
export const listMyProPaymentMethods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ environment: StripeEnvSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    try {
      const { data: pro, error } = await (context.supabase as any)
        .from("pro_customers")
        .select("stripe_customer_id, default_payment_method_id")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!pro?.stripe_customer_id) return { methods: [], defaultId: null };

      const stripe = createStripeClient(data.environment);
      const list = await stripe.paymentMethods.list({
        customer: pro.stripe_customer_id,
        type: "card",
        limit: 20,
      });
      return {
        methods: list.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand ?? "card",
          last4: pm.card?.last4 ?? "",
          exp_month: pm.card?.exp_month ?? 0,
          exp_year: pm.card?.exp_year ?? 0,
        })),
        defaultId: pro.default_payment_method_id ?? null,
      };
    } catch (e) {
      console.error("[listMyProPaymentMethods]", e);
      return { error: getStripeErrorMessage(e), methods: [], defaultId: null };
    }
  });
