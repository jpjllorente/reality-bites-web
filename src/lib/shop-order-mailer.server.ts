/**
 * Shop-order mail dispatch. Server-only.
 *
 * Idempotency contract: both the Stripe webhook and the return-page
 * finalize server fn can trigger email sends. To avoid duplicates we
 * atomically "claim" the send by updating a timestamp column with a
 * WHERE ... IS NULL predicate; only the first winner sends the email.
 */

import { sendTemplateEmail } from "./email-templates/send-email";

interface ShopOrderRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  items: Array<{ id: string; name: string; qty: number; price_cents: number }>;
  total_cents: number;
  amount_paid_cents: number | null;
  stripe_payment_intent_id: string | null;
  confirmation_sent_at: string | null;
  notification_sent_at: string | null;
}

const WHATSAPP_HREF = "https://wa.me/34681634623";

export async function sendShopOrderEmails(orderId: string): Promise<void> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const { data: order, error } = await supabaseAdmin
    .from("shop_orders")
    .select(
      "id, name, phone, email, notes, items, total_cents, amount_paid_cents, stripe_payment_intent_id, confirmation_sent_at, notification_sent_at",
    )
    .eq("id", orderId)
    .single();

  if (error || !order) {
    console.error("[mailer] order not found", orderId, error);
    return;
  }

  const row = order as unknown as ShopOrderRow;

  // Customer confirmation — only if we have an email and no prior send.
  if (row.email && !row.confirmation_sent_at) {
    const claim = await (supabaseAdmin.from("shop_orders") as any)
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("confirmation_sent_at", null)
      .select("id");
    if (claim.data && claim.data.length > 0) {
      try {
        await sendTemplateEmail("shop-order-confirmation", row.email, {
          idempotencyKey: `shop-confirmation-${row.id}`,
          templateData: {
            name: row.name,
            orderId: row.id,
            items: row.items ?? [],
            totalCents: row.total_cents,
            whatsappHref: WHATSAPP_HREF,
          },
        });
      } catch (e) {
        console.error("[mailer] confirmation send failed", row.id, e);
        // Roll back the claim so a later retry can try again.
        await (supabaseAdmin.from("shop_orders") as any)
          .update({ confirmation_sent_at: null })
          .eq("id", row.id);
      }
    }
  }

  // Admin notification — always, regardless of customer email presence.
  if (!row.notification_sent_at) {
    const claim = await (supabaseAdmin.from("shop_orders") as any)
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("notification_sent_at", null)
      .select("id");
    if (claim.data && claim.data.length > 0) {
      try {
        await sendTemplateEmail(
          "shop-order-notification",
          "hola@144reality.com",
          {
            idempotencyKey: `shop-notification-${row.id}`,
            replyTo: row.email || undefined,
            templateData: {
              orderId: row.id,
              name: row.name,
              phone: row.phone,
              email: row.email,
              notes: row.notes,
              items: row.items ?? [],
              totalCents: row.total_cents,
              amountPaidCents: row.amount_paid_cents ?? undefined,
              paymentIntentId: row.stripe_payment_intent_id ?? undefined,
            },
          },
        );
      } catch (e) {
        console.error("[mailer] notification send failed", row.id, e);
        await (supabaseAdmin.from("shop_orders") as any)
          .update({ notification_sent_at: null })
          .eq("id", row.id);
      }
    }
  }
}

export async function sendOrphanPaymentAlert(input: {
  sessionId: string;
  paymentIntentId?: string | null;
  amountCents: number;
  currency?: string;
  customerEmail?: string | null;
  reason?: string;
}): Promise<void> {
  try {
    await sendTemplateEmail(
      "shop-order-orphan-payment",
      "hola@144reality.com",
      {
        idempotencyKey: `orphan-${input.sessionId}`,
        templateData: {
          sessionId: input.sessionId,
          paymentIntentId: input.paymentIntentId ?? "",
          amountCents: input.amountCents,
          currency: input.currency ?? "EUR",
          customerEmail: input.customerEmail ?? null,
          reason: input.reason,
        },
      },
    );
  } catch (e) {
    console.error("[mailer] orphan alert failed", input.sessionId, e);
  }
}
