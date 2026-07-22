import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin as assertAdminRole } from "./auth-admin.functions";

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  await assertAdminRole(context.supabase, context.userId);
}

/* ---------------- PRODUCTS ---------------- */

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  price_cents: z.number().int().min(0).max(100_000_000),
  category: z.string().trim().min(1).max(60),
  image_url: z.string().trim().max(1000).default(""),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  seo_title: z.string().trim().max(70).default(""),
  seo_description: z.string().trim().max(200).default(""),
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
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await supabaseAdmin.from("products").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("products")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
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
    const bytes = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0));
    const safe = data.filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { error } = await supabaseAdmin.storage.from("media").upload(path, bytes, {
      contentType: data.content_type,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true, url: `/api/public/media/${path}`, path };
  });
