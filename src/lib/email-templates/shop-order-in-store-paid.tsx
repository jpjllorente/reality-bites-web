import * as React from "react";
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Item { name: string; qty: number; price_cents: number }
interface Props { name?: string; orderId?: string; items?: Item[]; totalCents?: number }

function fmt(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format((cents ?? 0) / 100);
}

const Email = ({ name = "", orderId = "", items = [], totalCents = 0 }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Pago recibido en tienda — 144 Reality</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>144 REALITY — BITES &amp; COFFEE</Text>
        <Heading style={h1}>
          ¡Gracias{name ? `, ${name.split(" ")[0]}` : ""}!
        </Heading>
        <Text style={lead}>
          Hemos registrado el cobro en mostrador de tu pedido
          {orderId ? ` #${orderId.slice(0, 8)}` : ""}. Un placer tenerte por aquí.
        </Text>
        <Section style={card}>
          {items.map((it, i) => (
            <Section key={i} style={row}>
              <Text style={rowText}>{it.qty} × {it.name}</Text>
              <Text style={rowPrice}>{fmt(it.qty * it.price_cents)}</Text>
            </Section>
          ))}
          <Hr style={hr} />
          <Section style={row}>
            <Text style={totalLabel}>Total pagado</Text>
            <Text style={totalPrice}>{fmt(totalCents)}</Text>
          </Section>
        </Section>
        <Text style={paragraph}>
          Este correo hace las veces de recibo. Si necesitas factura, respóndenos y te la
          preparamos.
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
    `Pago recibido en 144 Reality${d?.orderId ? ` #${String(d.orderId).slice(0, 8)}` : ""}`,
  displayName: "Pago en mostrador confirmado",
  previewData: {
    name: "María",
    orderId: "abcdef12-3456-7890-abcd-1234567890ab",
    items: [{ name: "Cheesecake", qty: 2, price_cents: 590 }],
    totalCents: 1180,
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Georgia, serif" };
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "560px" };
const eyebrow = { fontFamily: "monospace", letterSpacing: "0.3em", fontSize: "10px", color: "#5a6b4a", margin: "0 0 8px" };
const h1 = { color: "#2f3d2f", fontSize: "28px", margin: "0 0 8px" };
const lead = { color: "#333", fontSize: "15px", lineHeight: "22px", margin: 0 };
const card = { border: "1px solid #e8e2d5", borderRadius: "4px", padding: "16px 20px", margin: "20px 0", backgroundColor: "#faf7f0" };
const row = { display: "flex", justifyContent: "space-between", margin: "6px 0" };
const rowText = { color: "#333", fontSize: "14px", margin: 0 };
const rowPrice = { color: "#333", fontSize: "14px", margin: 0, fontFamily: "monospace" };
const totalLabel = { color: "#2f3d2f", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", margin: "8px 0 0" };
const totalPrice = { color: "#2f3d2f", fontSize: "20px", fontWeight: 700, margin: "8px 0 0" };
const paragraph = { color: "#333", fontSize: "14px", lineHeight: "22px", margin: "0 0 8px" };
const hr = { borderColor: "#e8e2d5", margin: "20px 0" };
const footer = { color: "#888", fontSize: "12px", textAlign: "center" as const };
