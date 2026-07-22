import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./auth-admin.functions";

const FiltersSchema = z.object({
  status: z
    .enum(["all", "paid", "refunded", "partially_refunded", "failed", "unpaid", "in_store_paid"])
    .default("all"),
  from: z.string().datetime().nullable().optional(),
  to: z.string().datetime().nullable().optional(),
  search: z.string().trim().max(200).nullable().optional(),
});

export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => FiltersSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    let q = (supabaseAdmin.from("shop_orders") as any)
      .select(
        "id, created_at, name, email, phone, total_cents, amount_paid_cents, amount_refunded_cents, payment_status, payment_method, stripe_session_id, stripe_payment_intent_id, payment_confirmed_at, refunded_at, payment_failed_at, payment_failure_reason, status",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.status !== "all") q = q.eq("payment_status", data.status);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, "");
      q = q.or(
        `name.ilike.%${s}%,email.ilike.%${s}%,stripe_session_id.ilike.%${s}%,stripe_payment_intent_id.ilike.%${s}%`,
      );
    }
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const listWebhookEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("stripe_webhook_events")
      .select("event_id, event_type, environment, received_at, processed_at, error")
      .order("received_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });
