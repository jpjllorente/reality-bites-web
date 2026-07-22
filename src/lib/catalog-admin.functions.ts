import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./auth-admin.functions";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { syncProductToStripeInternal } from "./stripe-product-sync.server";

const StripeEnvSchema = z.enum(["sandbox", "live"]);

/** Resolve request origin for absolute image URLs during sync. */
async function resolveOrigin(): Promise<string | null> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("host") ?? "";
    return host ? `${proto}://${host}` : null;
  } catch {
    return null;
  }
}

// ============ Force sync a single product ============

export const forceSyncProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const origin = await resolveOrigin();
    return await syncProductToStripeInternal(data.id, origin);
  });

// ============ Reconcile products vs Stripe ============

export type ProductDiscrepancy = {
  productId: string;
  slug: string;
  name: string;
  kind:
    | "missing_stripe_product"
    | "missing_stripe_price"
    | "missing_stripe_portion_price"
    | "orphan_portion_price"
    | "stripe_product_not_found"
    | "stripe_price_not_found"
    | "name_mismatch"
    | "active_mismatch"
    | "price_amount_mismatch"
    | "price_inactive"
    | "portion_price_amount_mismatch"
    | "portion_price_inactive"
    | "variants_not_synced";
  severity: "error" | "warning" | "info";
  detail: string;
  dbValue?: string | number | null;
  stripeValue?: string | number | null;
};

const ReconcileProductsSchema = z.object({
  environment: StripeEnvSchema,
});

export const reconcileProductsWithStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReconcileProductsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: products, error } = await (supabaseAdmin
        .from("products") as any)
        .select(
          "id, slug, name, is_active, in_stock, price_cents, portion_price_cents, variants, stripe_product_id, stripe_price_id, stripe_portion_price_id",
        )
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);

      const stripe = createStripeClient(data.environment);
      const discrepancies: ProductDiscrepancy[] = [];
      let checked = 0;

      for (const p of products ?? []) {
        checked += 1;
        const base = {
          productId: p.id as string,
          slug: (p.slug as string) ?? "",
          name: (p.name as string) ?? "",
        };
        const dbActive = (p.is_active ?? true) && (p.in_stock ?? true);

        // 1. Stripe product presence
        if (!p.stripe_product_id) {
          discrepancies.push({
            ...base,
            kind: "missing_stripe_product",
            severity: "error",
            detail: "El producto no está sincronizado con Stripe.",
          });
        } else {
          let sp: any = null;
          try {
            sp = await stripe.products.retrieve(p.stripe_product_id as string);
          } catch {
            discrepancies.push({
              ...base,
              kind: "stripe_product_not_found",
              severity: "error",
              detail: `El producto Stripe ${p.stripe_product_id} no existe.`,
            });
          }
          if (sp) {
            if ((sp.name ?? "") !== (p.name ?? "")) {
              discrepancies.push({
                ...base,
                kind: "name_mismatch",
                severity: "warning",
                detail: "El nombre en Stripe no coincide con la BD.",
                dbValue: p.name,
                stripeValue: sp.name,
              });
            }
            if (Boolean(sp.active) !== dbActive) {
              discrepancies.push({
                ...base,
                kind: "active_mismatch",
                severity: "warning",
                detail: `Estado activo distinto (Stripe: ${sp.active}, BD: ${dbActive}).`,
                dbValue: String(dbActive),
                stripeValue: String(sp.active),
              });
            }
          }
        }

        // 2. Main price
        if (!p.stripe_price_id) {
          discrepancies.push({
            ...base,
            kind: "missing_stripe_price",
            severity: "error",
            detail: "Falta el precio principal en Stripe.",
          });
        } else {
          try {
            const sPrice = await stripe.prices.retrieve(p.stripe_price_id as string);
            if (sPrice.unit_amount !== p.price_cents) {
              discrepancies.push({
                ...base,
                kind: "price_amount_mismatch",
                severity: "error",
                detail: "El importe del precio principal difiere.",
                dbValue: (p.price_cents ?? 0) / 100,
                stripeValue: (sPrice.unit_amount ?? 0) / 100,
              });
            }
            if (!sPrice.active) {
              discrepancies.push({
                ...base,
                kind: "price_inactive",
                severity: "warning",
                detail: "El precio en Stripe está archivado.",
              });
            }
          } catch {
            discrepancies.push({
              ...base,
              kind: "stripe_price_not_found",
              severity: "error",
              detail: `El precio Stripe ${p.stripe_price_id} no existe.`,
            });
          }
        }

        // 3. Portion price
        const portion = p.portion_price_cents as number | null;
        if (portion && portion > 0) {
          if (!p.stripe_portion_price_id) {
            discrepancies.push({
              ...base,
              kind: "missing_stripe_portion_price",
              severity: "error",
              detail: "Falta el precio por porción en Stripe.",
            });
          } else {
            try {
              const sPrice = await stripe.prices.retrieve(
                p.stripe_portion_price_id as string,
              );
              if (sPrice.unit_amount !== portion) {
                discrepancies.push({
                  ...base,
                  kind: "portion_price_amount_mismatch",
                  severity: "error",
                  detail: "El importe del precio por porción difiere.",
                  dbValue: portion / 100,
                  stripeValue: (sPrice.unit_amount ?? 0) / 100,
                });
              }
              if (!sPrice.active) {
                discrepancies.push({
                  ...base,
                  kind: "portion_price_inactive",
                  severity: "warning",
                  detail: "El precio por porción está archivado en Stripe.",
                });
              }
            } catch {
              discrepancies.push({
                ...base,
                kind: "stripe_price_not_found",
                severity: "error",
                detail: `El precio Stripe ${p.stripe_portion_price_id} no existe.`,
              });
            }
          }
        } else if (p.stripe_portion_price_id) {
          discrepancies.push({
            ...base,
            kind: "orphan_portion_price",
            severity: "warning",
            detail: "En Stripe existe precio por porción, pero se ha eliminado en la BD.",
          });
        }

        // 4. Variants (DB-only)
        const variants = Array.isArray(p.variants) ? p.variants : [];
        if (variants.length > 0) {
          discrepancies.push({
            ...base,
            kind: "variants_not_synced",
            severity: "info",
            detail: `${variants.length} variante(s) sólo en la BD (Stripe cobra el precio base).`,
          });
        }
      }

      return { checked, discrepancies };
    } catch (e) {
      console.error("[reconcileProductsWithStripe]", e);
      return { error: getStripeErrorMessage(e) };
    }
  });
