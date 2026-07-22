import { createStripeClient, getStripeErrorMessage } from "./stripe.server";

/**
 * Server-only helper: mirror a product row to Stripe (sandbox always; live
 * best-effort if a live key is configured). Never throws — returns a result
 * object so callers (upsert flows) can log and continue.
 */
export async function syncProductToStripeInternal(
  productId: string,
): Promise<
  | { ok: true; stripe_product_id: string; stripe_price_id: string }
  | { error: string }
> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: p } = await supabaseAdmin
    .from("products")
    .select(
      "id, name, description, image_url, price_cents, is_active, in_stock, stripe_product_id, stripe_price_id",
    )
    .eq("id", productId)
    .single();
  if (!p) return { error: "Producto no encontrado." };

  try {
    const stripe = createStripeClient("sandbox");
    const active = p.is_active && p.in_stock;
    const validImage =
      typeof p.image_url === "string" && /^https:\/\//i.test(p.image_url)
        ? p.image_url
        : null;
    const productPayload = {
      name: p.name,
      description: p.description || undefined,
      images: validImage ? [validImage] : undefined,
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

    let stripePriceId = p.stripe_price_id as string | null;
    const currentAmount = p.price_cents as number;
    if (stripePriceId) {
      const existing = await stripe.prices.retrieve(stripePriceId);
      if (existing.unit_amount !== currentAmount || existing.currency !== "eur") {
        await stripe.prices.update(stripePriceId, { active: false });
        const np = await stripe.prices.create({
          product: stripeProductId!,
          currency: "eur",
          unit_amount: currentAmount,
        });
        stripePriceId = np.id;
      }
    } else {
      const np = await stripe.prices.create({
        product: stripeProductId!,
        currency: "eur",
        unit_amount: currentAmount,
      });
      stripePriceId = np.id;
    }

    await (supabaseAdmin.from("products") as any)
      .update({
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      })
      .eq("id", p.id);

    if (process.env.STRIPE_LIVE_API_KEY) {
      try {
        const liveStripe = createStripeClient("live");
        const liveList = await liveStripe.products.search({
          query: `metadata['db_id']:'${p.id}'`,
          limit: 1,
        });
        const liveProductId = liveList.data[0]?.id;
        if (liveProductId) {
          await liveStripe.products.update(liveProductId, productPayload);
        } else {
          await liveStripe.products.create(productPayload);
        }
      } catch (e) {
        console.warn("[stripe-sync] live mirror failed", e);
      }
    }

    return {
      ok: true,
      stripe_product_id: stripeProductId!,
      stripe_price_id: stripePriceId!,
    };
  } catch (e) {
    console.error("[stripe-sync]", e);
    return { error: getStripeErrorMessage(e) };
  }
}
