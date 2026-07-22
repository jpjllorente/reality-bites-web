import { createStripeClient, getStripeErrorMessage } from "./stripe.server";

/**
 * Resolve an image URL to something Stripe accepts (https:// absolute).
 * Media uploaded via the admin panel is stored as `/api/public/media/<path>`
 * — we prepend the caller's origin to make it absolute. Anything that
 * isn't https after resolution is dropped so Stripe doesn't reject the call.
 */
function resolveStripeImage(raw: string | null | undefined, origin?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/") && origin && /^https:\/\//i.test(origin)) {
    return `${origin.replace(/\/$/, "")}${trimmed}`;
  }
  return null;
}

/**
 * Server-only helper: mirror a product row to Stripe (sandbox always; live
 * best-effort if a live key is configured). Never throws — returns a result
 * object so callers (upsert flows) can log and continue.
 */
export async function syncProductToStripeInternal(
  productId: string,
  origin?: string | null,
): Promise<
  | { ok: true; stripe_product_id: string; stripe_price_id: string; stripe_portion_price_id: string | null }
  | { error: string }
> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: p } = await (supabaseAdmin
    .from("products") as any)
    .select(
      "id, name, description, image_url, price_cents, portion_price_cents, is_active, in_stock, stripe_product_id, stripe_price_id, stripe_portion_price_id",
    )
    .eq("id", productId)
    .single();
  if (!p) return { error: "Producto no encontrado." };

  try {
    const stripe = createStripeClient("sandbox");
    const active = p.is_active && p.in_stock;
    const resolvedImage = resolveStripeImage(p.image_url as string | null, origin);
    const productPayload = {
      name: p.name,
      description: p.description || undefined,
      images: resolvedImage ? [resolvedImage] : undefined,
      active,
      metadata: { db_id: p.id },
    };

    let stripeProductId = p.stripe_product_id as string | null;
    if (stripeProductId) {
      await stripe.products.update(stripeProductId, productPayload);
    } else {
      const created = await stripe.products.create(productPayload);
      stripeProductId = created.id;
    }

    async function ensurePrice(
      currentId: string | null,
      amountCents: number,
    ): Promise<string> {
      if (currentId) {
        const existing = await stripe.prices.retrieve(currentId);
        if (existing.unit_amount === amountCents && existing.currency === "eur" && existing.active) {
          return currentId;
        }
        await stripe.prices.update(currentId, { active: false });
      }
      const np = await stripe.prices.create({
        product: stripeProductId!,
        currency: "eur",
        unit_amount: amountCents,
      });
      return np.id;
    }

    const stripePriceId = await ensurePrice(
      p.stripe_price_id as string | null,
      p.price_cents as number,
    );

    let stripePortionPriceId: string | null = null;
    const portionCents = p.portion_price_cents as number | null;
    if (portionCents != null && portionCents > 0) {
      stripePortionPriceId = await ensurePrice(
        p.stripe_portion_price_id as string | null,
        portionCents,
      );
    } else if (p.stripe_portion_price_id) {
      // Portion price removed → archive the stale Stripe price.
      try {
        await stripe.prices.update(p.stripe_portion_price_id as string, { active: false });
      } catch (e) {
        console.warn("[stripe-sync] failed to archive portion price", e);
      }
    }

    await (supabaseAdmin.from("products") as any)
      .update({
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
        stripe_portion_price_id: stripePortionPriceId,
      })
      .eq("id", p.id);

    return {
      ok: true,
      stripe_product_id: stripeProductId!,
      stripe_price_id: stripePriceId,
      stripe_portion_price_id: stripePortionPriceId,
    };
  } catch (e) {
    console.error("[stripe-sync]", e);
    return { error: getStripeErrorMessage(e) };
  }
}
