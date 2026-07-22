import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  orderId?: string;
  reason?: string;
  refundedCents?: number;
}

function fmt(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format((cents ?? 0) / 100);
}

const Email = ({ name = "", orderId = "", reason = "", refundedCents = 0 }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Hemos cancelado tu pedido en 144 Reality</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>144 REALITY — BITES &amp; COFFEE</Text>
        <Heading style={h1}>Pedido cancelado</Heading>
        <Text style={lead}>
          Hola{name ? ` ${name.split(" ")[0]}` : ""}, te confirmamos que hemos cancelado tu
          pedido{orderId ? ` #${orderId.slice(0, 8)}` : ""}.
        </Text>
        {reason ? (
          <Text style={paragraph}><strong>Motivo:</strong> {reason}</Text>
        ) : null}
        {refundedCents > 0 ? (
          <Text style={paragraph}>
            Hemos emitido un reembolso de <strong>{fmt(refundedCents)}</strong> a tu método
            de pago. Suele reflejarse en 3-10 días laborables según tu banco.
          </Text>
        ) : (
          <Text style={paragraph}>
            No se había cobrado ningún importe, así que no hay ningún reembolso pendiente.
          </Text>
        )}
        <Text style={paragraph}>
          Si tienes cualquier duda, respóndenos a este correo o escríbenos al WhatsApp
          +34 681 634 623.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>144 Reality Bites &amp; Coffee · hola@144reality.com · +34 681 634 623</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Pedido cancelado en 144 Reality${d?.orderId ? ` #${String(d.orderId).slice(0, 8)}` : ""}`,
  displayName: "Cancelación pedido tienda",
  previewData: {
    name: "María",
    orderId: "abcdef12-3456-7890-abcd-1234567890ab",
    reason: "No podemos servir el pedido en la fecha solicitada.",
    refundedCents: 1180,
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Georgia, serif" };
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "560px" };
const eyebrow = { fontFamily: "monospace", letterSpacing: "0.3em", fontSize: "10px", color: "#5a6b4a", margin: "0 0 8px" };
const h1 = { color: "#2f3d2f", fontSize: "26px", margin: "0 0 8px" };
const lead = { color: "#333", fontSize: "15px", lineHeight: "22px", margin: 0 };
const paragraph = { color: "#333", fontSize: "14px", lineHeight: "22px", margin: "12px 0" };
const hr = { borderColor: "#e8e2d5", margin: "20px 0" };
const footer = { color: "#888", fontSize: "12px", textAlign: "center" as const };
