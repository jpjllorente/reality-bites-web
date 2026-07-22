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

async function handleChargeRefunded(charge: any, env: StripeEnv) {
  const paymentIntentId =
    typeof charge?.payment_intent === "string"
      ? charge.payment_intent
      : charge?.payment_intent?.id ?? null;
  if (!paymentIntentId) {
    console.warn("[stripe webhook] charge.refunded without payment_intent");
    return;
  }

  const amountRefunded = charge?.amount_refunded ?? 0;
  const amountCaptured = charge?.amount_captured ?? charge?.amount ?? 0;
  const isFullyRefunded = amountRefunded >= amountCaptured;

  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { sendRefundNotification } = await import(
    "@/lib/shop-order-mailer.server"
  );

  const { data: rows } = await supabaseAdmin
    .from("shop_orders")
    .select("id, amount_paid_cents, amount_refunded_cents")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .limit(1);

  const row = rows?.[0] as
    | { id: string; amount_paid_cents: number | null; amount_refunded_cents: number | null }
    | undefined;
  if (!row) {
    console.warn(
      "[stripe webhook] refund for unknown payment_intent",
      paymentIntentId,
    );
    return;
  }

  // Idempotent: only update if refund amount grew
  const prevRefunded = row.amount_refunded_cents ?? 0;
  if (amountRefunded <= prevRefunded) return;

  await (supabaseAdmin.from("shop_orders") as any)
    .update({
      payment_status: isFullyRefunded ? "refunded" : "partially_refunded",
      amount_refunded_cents: amountRefunded,
      refunded_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  await sendRefundNotification({
    orderId: row.id,
    amountRefundedCents: amountRefunded,
    amountPaidCents: row.amount_paid_cents ?? amountCaptured,
    isPartial: !isFullyRefunded,
  });
}

async function handlePaymentFailed(
  session: any,
  reason: string | null,
) {
  const orderId = session?.metadata?.shop_order_id as string | undefined;
  if (!orderId) return;
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { sendPaymentFailedNotification } = await import(
    "@/lib/shop-order-mailer.server"
  );
  await (supabaseAdmin.from("shop_orders") as any)
    .update({
      payment_status: "failed",
      payment_failed_at: new Date().toISOString(),
      payment_failure_reason: reason || "Pago no completado",
    })
    .eq("id", orderId)
    .not("payment_status", "in", "(paid,refunded,partially_refunded)");
  await sendPaymentFailedNotification({ orderId, reason: reason || undefined });
}

async function handleWebhookEvent(request: Request, env: StripeEnv) {
  const event = await verifyWebhook(request, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "charge.refunded":
    case "charge.refund.updated":
      await handleChargeRefunded(event.data.object, env);
      break;
    case "checkout.session.async_payment_failed":
      await handlePaymentFailed(event.data.object, "Pago asíncrono rechazado");
      break;
    case "checkout.session.expired":
      await handlePaymentFailed(event.data.object, "Checkout expirado sin completar");
      break;
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      const orderId = pi?.metadata?.shop_order_id as string | undefined;
      if (orderId) {
        await handlePaymentFailed(
          { metadata: { shop_order_id: orderId } },
          pi?.last_payment_error?.message || "Pago rechazado",
        );
      }
      break;
    }
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
