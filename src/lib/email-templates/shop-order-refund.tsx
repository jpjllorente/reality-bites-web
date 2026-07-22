import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  orderId?: string;
  amountRefundedCents?: number;
  amountPaidCents?: number;
  isPartial?: boolean;
}

function fmt(cents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format((cents ?? 0) / 100);
}

const Email = ({
  name = "",
  orderId = "",
  amountRefundedCents = 0,
  amountPaidCents = 0,
  isPartial = false,
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Hemos procesado un reembolso de tu pedido en 144 Reality</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>144 REALITY — BITES &amp; COFFEE</Text>
        <Heading style={h1}>
          {isPartial ? "Reembolso parcial procesado" : "Reembolso procesado"}
        </Heading>
        <Text style={lead}>
          Hola{name ? ` ${name.split(" ")[0]}` : ""}, te confirmamos que hemos
          emitido un reembolso de tu pedido
          {orderId ? ` #${orderId.slice(0, 8)}` : ""}.
        </Text>

        <Section style={card}>
          <Section style={row}>
            <Text style={rowText}>Importe reembolsado</Text>
            <Text style={rowPriceStrong}>{fmt(amountRefundedCents)}</Text>
          </Section>
          {isPartial && amountPaidCents ? (
            <Section style={row}>
              <Text style={rowText}>Importe original</Text>
              <Text style={rowPrice}>{fmt(amountPaidCents)}</Text>
            </Section>
          ) : null}
        </Section>

        <Text style={paragraph}>
          El dinero volverá a tu método de pago en los próximos días laborables,
          según los tiempos de tu banco (habitualmente 3-10 días).
        </Text>
        <Text style={paragraph}>
          Si tienes cualquier duda, respóndenos a este correo o escríbenos por
          WhatsApp al +34 681 634 623.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          144 Reality Bites &amp; Coffee · hola@144reality.com · +34 681 634 623
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `${d?.isPartial ? "Reembolso parcial" : "Reembolso"} de tu pedido en 144 Reality${d?.orderId ? ` #${String(d.orderId).slice(0, 8)}` : ""}`,
  displayName: "Reembolso pedido tienda",
  previewData: {
    name: "María",
    orderId: "abcdef12-3456-7890-abcd-1234567890ab",
    amountRefundedCents: 1180,
    amountPaidCents: 1180,
    isPartial: false,
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Georgia, serif" };
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "560px" };
const eyebrow = {
  fontFamily: "monospace",
  letterSpacing: "0.3em",
  fontSize: "10px",
  color: "#5a6b4a",
  margin: "0 0 8px",
};
const h1 = { color: "#2f3d2f", fontSize: "28px", margin: "0 0 8px" };
const lead = { color: "#333", fontSize: "15px", lineHeight: "22px", margin: 0 };
const card = {
  border: "1px solid #e8e2d5",
  borderRadius: "4px",
  padding: "16px 20px",
  margin: "20px 0",
  backgroundColor: "#faf7f0",
};
const row = { display: "flex", justifyContent: "space-between", margin: "6px 0" };
const rowText = { color: "#333", fontSize: "14px", margin: 0 };
const rowPrice = { color: "#333", fontSize: "14px", margin: 0, fontFamily: "monospace" };
const rowPriceStrong = { color: "#2f3d2f", fontSize: "18px", margin: 0, fontWeight: 700 };
const paragraph = { color: "#333", fontSize: "14px", lineHeight: "22px", margin: "0 0 8px" };
const hr = { borderColor: "#e8e2d5", margin: "20px 0" };
const footer = { color: "#888", fontSize: "12px", textAlign: "center" as const };
