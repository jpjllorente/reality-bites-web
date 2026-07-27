import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin as assertAdminRole } from "./auth-admin.functions";

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  await assertAdminRole(context.supabase, context.userId);
}

/* ---------------- PRODUCTS ---------------- */

const VariantSchema = z.object({
  id: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/i, "Solo letras, números y guiones"),
  name: z.string().trim().min(1).max(120),
  active: z.boolean().default(true),
});

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  price_cents: z.number().int().min(0).max(100_000_000),
  portion_price_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  category: z.string().trim().min(1).max(60),
  image_url: z.string().trim().max(1000).default(""),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  in_stock: z.boolean().default(true),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  seo_title: z.string().trim().max(70).default(""),
  seo_description: z.string().trim().max(200).default(""),
  variants: z.array(VariantSchema).max(30).default([]),
  wholesale_price_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  visible_pro: z.boolean().default(false),
  tax_rate_percent: z.union([z.literal(0), z.literal(4), z.literal(10), z.literal(21)]).default(21),
});

export const listProductsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ensure variant ids are unique.
    const seen = new Set<string>();
    for (const v of data.variants) {
      if (seen.has(v.id)) throw new Error(`Variante duplicada: ${v.id}`);
      seen.add(v.id);
    }
    // Normalize portion price: null when 0 or missing.
    const portion = data.portion_price_cents && data.portion_price_cents > 0
      ? data.portion_price_cents
      : null;
    // Normalize wholesale price: null when 0 or missing.
    const wholesale = data.wholesale_price_cents && data.wholesale_price_cents > 0
      ? data.wholesale_price_cents
      : null;
    const payload = { ...data, portion_price_cents: portion, wholesale_price_cents: wholesale } as any;
    let productId: string;
    if (data.id) {
      const { id, ...rest } = payload;
      const { error } = await (supabaseAdmin.from("products") as any).update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      productId = id;
    } else {
      const { data: inserted, error } = await (supabaseAdmin
        .from("products") as any)
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      productId = inserted.id;
    }
    // Resolve caller origin so relative /api/public/media/* URLs become
    // https:// absolute URLs Stripe will accept.
    let origin: string | null = null;
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const proto = req.headers.get("x-forwarded-proto") ?? "https";
      const host = req.headers.get("host") ?? "";
      if (host) origin = `${proto}://${host}`;
    } catch {
      // Non-request contexts (unlikely here). Sync will just skip images.
    }
    // Fire-and-forget mirror to Stripe. Never block save on Stripe errors.
    try {
      const { syncProductToStripeInternal } = await import(
        "./stripe-product-sync.server"
      );
      await syncProductToStripeInternal(productId, origin);
    } catch (e) {
      console.warn("[upsertProduct] Stripe sync failed", e);
    }
    return { ok: true, id: productId };
  });


export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- GALLERY ---------------- */

const GallerySchema = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().trim().min(1).max(1000),
  alt: z.string().trim().max(200).default(""),
  caption: z.string().trim().max(500).default(""),
  tag: z.string().trim().max(60).default(""),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const listGalleryAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("gallery_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GallerySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await supabaseAdmin.from("gallery_items").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("gallery_items")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deleteGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("gallery_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- MEDIA UPLOAD ---------------- */

const UploadSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  content_type: z.string().trim().min(1).max(120),
  data_base64: z.string().min(1).max(15_000_000), // ~11MB decoded
});

export const uploadMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const originalBytes = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0));
    const safe = data.filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");

    // Intentamos mejorar la imagen con OpenAI. Si falla, subimos el original.
    let bytesToStore: Uint8Array = originalBytes;
    let contentType = data.content_type;
    let filename = safe;
    let enhanced = false;
    try {
      const { enhanceProductImage } = await import("./product-image-enhance.server");
      const improved = await enhanceProductImage(originalBytes, data.content_type);
      if (improved) {
        bytesToStore = improved.bytes;
        contentType = improved.contentType;
        filename =
          safe.replace(/\.[a-z0-9]+$/i, "") + `.enhanced.${improved.extension}`;
        enhanced = true;
      }
    } catch (e) {
      console.warn("[uploadMedia] enhance error, uso original", e);
    }

    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;
    const { error } = await supabaseAdmin.storage.from("media").upload(path, bytesToStore, {
      contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true, url: `/api/public/media/${path}`, path, enhanced };
  });

