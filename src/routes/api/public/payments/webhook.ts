import { createFileRoute } from "@tanstack/react-router";
import {
  type StripeEnv,
  createStripeClient,
  verifyWebhook,
} from "@/lib/stripe.server";

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const orderId = session?.metadata?.shop_order_id as string | undefined;
  const stripe = createStripeClient(env);

  // Resolve the PaymentIntent id for reconciliation, even for one-off charges.
  const paymentIntentId =
    typeof session?.payment_intent === "string"
      ? session.payment_intent
      : session?.payment_intent?.id ?? null;

  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { sendShopOrderEmails, sendOrphanPaymentAlert } = await import(
    "@/lib/shop-order-mailer.server"
  );

  const paid = session?.payment_status === "paid";

  if (!orderId) {
    if (paid) {
      await sendOrphanPaymentAlert({
        sessionId: session.id,
        paymentIntentId,
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "EUR",
        customerEmail: session.customer_details?.email ?? null,
      });
    }
    return;
  }

  if (!paid) return;

  // Idempotent update: only flip unpaid → paid, stamp payment info.
  await (supabaseAdmin.from("shop_orders") as any)
    .update({
      payment_status: "paid",
      amount_paid_cents: session.amount_total ?? null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      payment_confirmed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .neq("payment_status", "paid");

  // Also stamp payment_intent alone if the row was already paid (finalize
  // ran first with just amount_paid_cents but no intent id).
  if (paymentIntentId) {
    await (supabaseAdmin.from("shop_orders") as any)
      .update({ stripe_payment_intent_id: paymentIntentId })
      .eq("id", orderId)
      .is("stripe_payment_intent_id", null);
  }

  await sendShopOrderEmails(orderId);

  // Suppress unused-import warning for stripe when we don't need retrieval.
  void stripe;
}

async function handleWebhookEvent(request: Request, env: StripeEnv) {
  const event = await verifyWebhook(request, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    default:
      console.log("[stripe webhook] unhandled event", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error(
            "[stripe webhook] invalid env query param:",
            rawEnv,
          );
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhookEvent(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[stripe webhook] error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
