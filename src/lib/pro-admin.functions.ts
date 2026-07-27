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

const ProCustomerSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().trim().email().max(254),
  legal_name: z.string().trim().min(1).max(200),
  trade_name: z.string().trim().max(200).optional().or(z.literal("")),
  tax_id: z.string().trim().min(3).max(40),
  billing_email: z.string().trim().email().max(254),
  contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address_line1: z.string().trim().min(1).max(200),
  address_line2: z.string().trim().max(200).optional().or(z.literal("")),
  postal_code: z.string().trim().min(3).max(20),
  city: z.string().trim().min(1).max(120),
  province: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(2).default("ES"),
  payment_terms_days: z.union([
    z.literal(0),
    z.literal(7),
    z.literal(15),
    z.literal(30),
    z.literal(60),
  ]).default(0),
  discount_percent: z.number().int().min(0).max(100).default(0),
  is_active: z.boolean().default(true),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

/**
 * Admin: list all pro customers.
 */
export const listProCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pro_customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Admin: create a pro customer.
 * - Creates (or reuses) the Supabase auth user via inviteUserByEmail.
 * - Assigns the 'pro' role.
 * - Creates a Stripe Customer.
 * - Inserts the pro_customers row.
 */
export const createProCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    ProCustomerSchema.extend({
      environment: StripeEnvSchema,
      returnUrl: z.string().url().max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. Create (or find) auth user via invite. If already exists, look them up.
      let authUserId: string;
      const invite = await (supabaseAdmin.auth.admin as any).inviteUserByEmail(
        data.email,
        { redirectTo: data.returnUrl },
      );
      if (invite.error) {
        // Email already exists → look them up.
        const listed = await (supabaseAdmin.auth.admin as any).listUsers({
          page: 1,
          perPage: 200,
        });
        const found = (listed.data?.users ?? []).find(
          (u: any) => u.email?.toLowerCase() === data.email.toLowerCase(),
        );
        if (!found) throw new Error(invite.error.message ?? "No se pudo invitar al usuario.");
        authUserId = found.id;
      } else {
        authUserId = invite.data.user.id;
      }

      // 2. Grant 'pro' role (idempotent).
      const { error: roleErr } = await (supabaseAdmin.from("user_roles") as any)
        .upsert({ user_id: authUserId, role: "pro" }, { onConflict: "user_id,role" });
      if (roleErr && (roleErr as any).code !== "23505") {
        throw new Error(`No se pudo asignar el rol PRO: ${roleErr.message}`);
      }

      // 3. Create Stripe customer.
      const stripe = createStripeClient(data.environment);
      const stripeCustomer = await stripe.customers.create({
        email: data.billing_email,
        name: data.legal_name,
        phone: data.phone || undefined,
        address: {
          line1: data.address_line1,
          line2: data.address_line2 || undefined,
          postal_code: data.postal_code,
          city: data.city,
          state: data.province || undefined,
          country: data.country,
        },
        metadata: {
          pro: "true",
          tax_id: data.tax_id,
          supabase_user_id: authUserId,
        },
        tax_id_data: [
          {
            type: /^ES/i.test(data.tax_id) ? "eu_vat" : "es_cif",
            value: data.tax_id,
          },
        ],
      });

      // 4. Insert pro_customers row.
      const { data: inserted, error: insertErr } = await (supabaseAdmin
        .from("pro_customers") as any)
        .insert({
          user_id: authUserId,
          stripe_customer_id: stripeCustomer.id,
          legal_name: data.legal_name,
          trade_name: data.trade_name || null,
          tax_id: data.tax_id,
          billing_email: data.billing_email,
          contact_name: data.contact_name || null,
          phone: data.phone || null,
          address_line1: data.address_line1,
          address_line2: data.address_line2 || null,
          postal_code: data.postal_code,
          city: data.city,
          province: data.province || null,
          country: data.country,
          payment_terms_days: data.payment_terms_days,
          discount_percent: data.discount_percent,
          is_active: data.is_active,
          notes: data.notes || null,
        })
        .select("id")
        .single();
      if (insertErr) throw new Error(insertErr.message);
      return { ok: true, id: inserted.id, userId: authUserId };
    } catch (e) {
      console.error("[createProCustomer]", e);
      return { error: e instanceof Error ? e.message : getStripeErrorMessage(e) };
    }
  });

/**
 * Admin: update pro customer.
 */
export const updateProCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    ProCustomerSchema.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, email: _email, ...rest } = data as any;
    const { error } = await (supabaseAdmin.from("pro_customers") as any)
      .update({
        legal_name: rest.legal_name,
        trade_name: rest.trade_name || null,
        tax_id: rest.tax_id,
        billing_email: rest.billing_email,
        contact_name: rest.contact_name || null,
        phone: rest.phone || null,
        address_line1: rest.address_line1,
        address_line2: rest.address_line2 || null,
        postal_code: rest.postal_code,
        city: rest.city,
        province: rest.province || null,
        country: rest.country,
        payment_terms_days: rest.payment_terms_days,
        discount_percent: rest.discount_percent,
        is_active: rest.is_active,
        notes: rest.notes || null,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin: list pro orders (with customer info).
 */
export const listProOrdersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pro_orders")
      .select(
        "*, pro_customer:pro_customers(id, legal_name, trade_name, billing_email, tax_id, payment_terms_days, stripe_customer_id, default_payment_method_id)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Admin: confirm order + issue Stripe Invoice.
 * - Creates invoice items (one per order line, with tax rate).
 * - Creates the Invoice (auto-advance) with the customer's default payment method.
 * - Finalizes the invoice.
 * - Persists invoice ids and moves order to 'facturado' (paid webhook flips to 'pagado').
 */
export const confirmAndInvoiceProOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        environment: StripeEnvSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("pro_orders")
        .select(
          "*, pro_customer:pro_customers(stripe_customer_id, default_payment_method_id, payment_terms_days, billing_email)",
        )
        .eq("id", data.orderId)
        .single();
      if (orderErr || !order) throw new Error("Pedido no encontrado.");
      if ((order as any).status !== "nuevo" && (order as any).status !== "confirmado") {
        throw new Error("El pedido ya está facturado o cerrado.");
      }
      const proCustomer = (order as any).pro_customer;
      if (!proCustomer?.stripe_customer_id) {
        throw new Error("El cliente PRO no tiene Stripe customer.");
      }

      const stripe = createStripeClient(data.environment);
      const items = (order as any).items as Array<{
        product_id?: string;
        name: string;
        qty: number;
        unit_price_cents: number;
        tax_rate_percent: number;
        variant?: string | null;
        portion?: boolean;
      }>;

      // Group tax rates → create Stripe TaxRate objects on-demand (cached by percent).
      const taxRateCache = new Map<number, string>();
      async function getTaxRate(percent: number): Promise<string | null> {
        if (percent === 0) return null;
        if (taxRateCache.has(percent)) return taxRateCache.get(percent)!;
        const list = await stripe.taxRates.list({ active: true, limit: 100 });
        const found = list.data.find(
          (t) => t.percentage === percent && t.inclusive === false && t.country === "ES",
        );
        if (found) {
          taxRateCache.set(percent, found.id);
          return found.id;
        }
        const created = await stripe.taxRates.create({
          display_name: "IVA",
          percentage: percent,
          inclusive: false,
          country: "ES",
          jurisdiction: "ES",
        });
        taxRateCache.set(percent, created.id);
        return created.id;
      }

      // Create pending invoice items.
      for (const item of items) {
        const taxRateId = await getTaxRate(item.tax_rate_percent);
        const desc = [
          item.name,
          item.variant ? `— ${item.variant}` : null,
          item.portion ? "(porción)" : null,
        ]
          .filter(Boolean)
          .join(" ");
        await stripe.invoiceItems.create({
          customer: proCustomer.stripe_customer_id,
          amount: item.unit_price_cents * item.qty,
          currency: "eur",
          description: `${desc} × ${item.qty}`,
          ...(taxRateId ? { tax_rates: [taxRateId] } : {}),
          metadata: { pro_order_id: (order as any).id },
        });
      }

      const daysUntilDue = proCustomer.payment_terms_days ?? 0;
      const collectionMethod =
        daysUntilDue > 0 ? "send_invoice" : "charge_automatically";

      const invoice = await stripe.invoices.create({
        customer: proCustomer.stripe_customer_id,
        auto_advance: true,
        collection_method: collectionMethod,
        ...(collectionMethod === "send_invoice"
          ? { days_until_due: daysUntilDue }
          : {}),
        ...(collectionMethod === "charge_automatically" &&
        proCustomer.default_payment_method_id
          ? { default_payment_method: proCustomer.default_payment_method_id }
          : {}),
        description: `Pedido PRO #${(order as any).id.slice(0, 8)}`,
        metadata: { pro_order_id: (order as any).id },
      });

      const invoiceId = (invoice as any).id;
      if (!invoiceId) throw new Error("Stripe no devolvió invoice.id.");

      // Finalize so it moves to "open" (auto_advance also charges/sends).
      const finalized = await stripe.invoices.finalizeInvoice(invoiceId);

      await (supabaseAdmin.from("pro_orders") as any)
        .update({
          status: "facturado",
          confirmed_at: (order as any).confirmed_at ?? new Date().toISOString(),
          invoiced_at: new Date().toISOString(),
          stripe_invoice_id: finalized.id,
          stripe_invoice_url: finalized.hosted_invoice_url ?? null,
          stripe_invoice_pdf: finalized.invoice_pdf ?? null,
          stripe_invoice_status: finalized.status ?? "open",
        })
        .eq("id", (order as any).id);

      return {
        ok: true,
        invoiceId: finalized.id,
        hostedUrl: finalized.hosted_invoice_url,
      };
    } catch (e) {
      console.error("[confirmAndInvoiceProOrder]", e);
      return { error: getStripeErrorMessage(e) };
    }
  });

/**
 * Admin: mark pro order as delivered.
 */
export const markProOrderDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin.from("pro_orders") as any)
      .update({
        status: "entregado",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin: cancel a pro order (before it is invoiced or delivered).
 */
export const cancelProOrderAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin.from("pro_orders") as any)
      .update({
        status: "cancelado",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: data.reason || null,
      })
      .eq("id", data.orderId)
      .in("status", ["nuevo", "confirmado"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
