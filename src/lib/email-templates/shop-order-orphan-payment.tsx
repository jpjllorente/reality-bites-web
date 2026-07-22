import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  sessionId?: string;
  paymentIntentId?: string;
  amountCents?: number;
  currency?: string;
  customerEmail?: string | null;
  reason?: string;
}

function fmt(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
  }).format((cents ?? 0) / 100);
}

const Email = ({
  sessionId = "",
  paymentIntentId = "",
  amountCents = 0,
  currency = "EUR",
  customerEmail,
  reason = "El pago se completó en Stripe pero no encontramos un pedido asociado en la base de datos.",
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Pago sin pedido asociado — revisar en Stripe</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>⚠️ ALERTA DE PAGO</Text>
        <Heading style={h1}>Pago sin pedido asociado</Heading>
        <Text style={p}>{reason}</Text>

        <Section style={card}>
          <Text style={p}>
            <strong>Importe:</strong> {fmt(amountCents, currency)}
          </Text>
          {customerEmail ? (
            <Text style={p}>
              <strong>Email del cliente:</strong> {customerEmail}
            </Text>
          ) : null}
          <Text style={pMono}>Session: {sessionId}</Text>
          {paymentIntentId ? (
            <Text style={pMono}>PaymentIntent: {paymentIntentId}</Text>
          ) : null}
        </Section>

        <Text style={p}>
          Revisa esta operación en el panel de Stripe y contacta con el cliente
          si es necesario. Si procede, tramita un reembolso desde Stripe.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "⚠️ 144 Reality — Pago recibido sin pedido asociado",
  displayName: "Alerta pago huérfano",
  to: "hola@144reality.com",
  previewData: {
    sessionId: "cs_test_abc",
    paymentIntentId: "pi_test_abc",
    amountCents: 1500,
    currency: "EUR",
    customerEmail: "cliente@example.com",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Georgia, serif" };
const container = { margin: "0 auto", padding: "24px", maxWidth: "600px" };
const eyebrow = {
  fontFamily: "monospace",
  fontSize: "10px",
  letterSpacing: "0.3em",
  color: "#a12b2b",
  margin: "0 0 6px",
};
const h1 = { color: "#2f3d2f", fontSize: "22px", margin: "0 0 12px" };
const p = { color: "#222", fontSize: "14px", lineHeight: "22px", margin: "6px 0" };
const pMono = {
  color: "#666",
  fontSize: "12px",
  fontFamily: "monospace",
  margin: "6px 0",
};
const card = {
  border: "1px solid #e8e2d5",
  borderRadius: "4px",
  padding: "12px 16px",
  backgroundColor: "#fdf5f5",
};
