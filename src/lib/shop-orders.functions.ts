import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "./admin";

const ItemSchema = z.object({
  id: z.string().max(80),
  name: z.string().max(120),
  qty: z.number().int().min(1).max(999),
  price_cents: z.number().int().min(0).max(1_000_000),
});

const ShopOrderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(40),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(ItemSchema).min(1).max(100),
  total_cents: z.number().int().min(0).max(100_000_000),
});

export const submitShopOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ShopOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: inserted, error } = await supabaseAdmin
      .from("shop_orders")
      .insert({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        notes: data.notes || null,
        items: data.items,
        total_cents: data.total_cents,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[shop_orders] insert error", error);
      throw new Error("No se pudo guardar el pedido.");
    }

    return { ok: true, id: inserted.id };
  });

const SHOP_STATUS = z.enum(["new", "contacted", "confirmed", "completed", "cancelled"]);
const CUSTOM_STATUS = z.enum(["new", "reviewing", "confirmed", "declined"]);

export const listAllOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string })?.email;
    if (!isAdminEmail(email)) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const [custom, shop] = await Promise.all([
      supabaseAdmin
        .from("custom_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("shop_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (custom.error) throw new Error(custom.error.message);
    if (shop.error) throw new Error(shop.error.message);
    return { custom: custom.data ?? [], shop: shop.data ?? [] };
  });

const UpdateStatusSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("shop"), id: z.string().uuid(), status: SHOP_STATUS }),
  z.object({ kind: z.literal("custom"), id: z.string().uuid(), status: CUSTOM_STATUS }),
]);

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UpdateStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string })?.email;
    if (!isAdminEmail(email)) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const table = data.kind === "custom" ? "custom_orders" : "shop_orders";
    const { error } = await (supabaseAdmin.from(table) as any)
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
