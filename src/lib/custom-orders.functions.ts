import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./auth-admin.functions";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

const OrderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  orderType: z.string().trim().min(1).max(60),
  eventDate: z.string().trim().max(20).optional().or(z.literal("")),
  servings: z.number().int().min(1).max(1000).optional().nullable(),
  flavors: z.string().trim().max(500).optional().or(z.literal("")),
  allergens: z.string().trim().max(500).optional().or(z.literal("")),
  budgetRange: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const submitCustomOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => OrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inserted, error } = await supabaseAdmin
      .from("custom_orders")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        order_type: data.orderType,
        event_date: data.eventDate || null,
        servings: data.servings ?? null,
        flavors: data.flavors || null,
        allergens: data.allergens || null,
        budget_range: data.budgetRange || null,
        message: data.message || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[custom_orders] insert error", error);
      throw new Error("No se pudo guardar la solicitud.");
    }

    // Try to send an email notification. If the template registry / email
    // domain aren't ready yet, we don't fail the request — the row is safe.
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("custom-order-notification", "hola@144reality.com", {
        templateData: {
          name: data.name,
          email: data.email,
          phone: data.phone || "-",
          orderType: data.orderType,
          eventDate: data.eventDate || "-",
          servings: data.servings ? String(data.servings) : "-",
          flavors: data.flavors || "-",
          allergens: data.allergens || "-",
          budgetRange: data.budgetRange || "-",
          message: data.message || "-",
        },
        idempotencyKey: `custom-order-${inserted.id}`,
        replyTo: data.email,
      });
      await sendTemplateEmail("custom-order-confirmation", data.email, {
        templateData: { name: data.name, orderType: data.orderType },
        idempotencyKey: `custom-order-confirm-${inserted.id}`,
      });
    } catch (err) {
      console.error("[custom_orders] email send failed", err);
    }


    return { ok: true, id: inserted.id };
  });
