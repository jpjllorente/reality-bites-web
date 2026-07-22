/**
 * Custom-order mail dispatch. Server-only.
 * Idempotent: uses confirmation_sent_at as a claim slot per (order, event).
 */
import { sendTemplateEmail } from "./email-templates/send-email";

export async function sendCustomOrderPaidEmail(orderId: string): Promise<void> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data: order, error } = await supabaseAdmin
    .from("custom_orders")
    .select(
      "id, name, email, order_type, quote_total_cents, amount_paid_cents, payment_mode, confirmation_sent_at",
    )
    .eq("id", orderId)
    .single();
  if (error || !order) return;
  const row = order as unknown as {
    id: string;
    name: string;
    email: string | null;
    order_type: string;
    quote_total_cents: number | null;
    amount_paid_cents: number | null;
    payment_mode: "deposit" | "full" | null;
    confirmation_sent_at: string | null;
  };
  if (!row.email) return;

  // Notify admin every time (idempotency via Stripe event id upstream); the
  // customer confirmation email is single-shot via confirmation_sent_at.
  try {
    await sendTemplateEmail(
      "custom-order-notification",
      "hola@144reality.com",
      {
        idempotencyKey: `custom-paid-notify-${row.id}-${row.payment_mode}`,
        replyTo: row.email,
        templateData: {
          name: row.name,
          email: row.email,
          orderType: `${row.order_type} · ${row.payment_mode === "deposit" ? "ANTICIPO PAGADO" : "PAGO COMPLETO"}`,
          message: `Importe pagado: ${((row.amount_paid_cents ?? 0) / 100).toFixed(2)} €`,
        },
      },
    );
  } catch (e) {
    console.error("[custom-mailer] admin notify failed", e);
  }

  if (row.confirmation_sent_at) return;
  const claim = await (supabaseAdmin.from("custom_orders") as any)
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("confirmation_sent_at", null)
    .select("id");
  if (!claim.data || claim.data.length === 0) return;

  try {
    await sendTemplateEmail("custom-order-paid", row.email, {
      idempotencyKey: `custom-paid-${row.id}-${row.payment_mode}`,
      templateData: {
        name: row.name,
        orderType: row.order_type,
        amountPaidCents: row.amount_paid_cents ?? 0,
        totalCents: row.quote_total_cents ?? 0,
        mode: row.payment_mode ?? "full",
      },
    });
  } catch (e) {
    console.error("[custom-mailer] customer send failed", e);
    await (supabaseAdmin.from("custom_orders") as any)
      .update({ confirmation_sent_at: null })
      .eq("id", row.id);
  }
}
