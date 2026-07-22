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

interface Item {
  name: string;
  qty: number;
  price_cents: number;
  variant_name?: string | null;
  portion?: boolean;
}

interface Props {
  orderId?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  notes?: string | null;
  items?: Item[];
  totalCents?: number;
  amountPaidCents?: number;
  paymentIntentId?: string;
}

function fmt(cents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format((cents ?? 0) / 100);
}

const Email = ({
  orderId = "",
  name = "",
  phone = "",
  email = null,
  notes = null,
  items = [],
  totalCents = 0,
  amountPaidCents,
  paymentIntentId,
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Nuevo pedido pagado #{orderId.slice(0, 8)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>PEDIDO PAGADO — TIENDA ONLINE</Text>
        <Heading style={h1}>Pedido #{orderId.slice(0, 8)}</Heading>

        <Section style={card}>
          <Text style={p}><strong>Cliente:</strong> {name}</Text>
          <Text style={p}><strong>Teléfono:</strong> {phone}</Text>
          {email ? <Text style={p}><strong>Email:</strong> {email}</Text> : null}
          {notes ? <Text style={p}><strong>Notas:</strong> {notes}</Text> : null}
        </Section>

        <Heading as="h2" style={h2}>Artículos</Heading>
        <Section style={card}>
          {items.map((it, i) => (
            <Section key={i} style={{ margin: "4px 0" }}>
              <Text style={p}>
                {it.qty} × {it.name} — {fmt(it.qty * it.price_cents)}
              </Text>
              {(it.variant_name || it.portion) && (
                <Text style={pMeta}>
                  {it.variant_name ? `Variante: ${it.variant_name}` : ""}
                  {it.variant_name && it.portion ? " · " : ""}
                  {it.portion ? "Tamaño: porción" : ""}
                </Text>
              )}
            </Section>
          ))}
          <Hr style={hr} />
          <Text style={p}><strong>Total pedido:</strong> {fmt(totalCents)}</Text>
          {typeof amountPaidCents === "number" ? (
            <Text style={p}>
              <strong>Importe cobrado por Stripe:</strong> {fmt(amountPaidCents)}
            </Text>
          ) : null}
          {paymentIntentId ? (
            <Text style={pMono}>PaymentIntent: {paymentIntentId}</Text>
          ) : null}
        </Section>

        <Text style={footer}>
          Revisa el pedido en el dashboard interno para marcarlo como completado
          cuando el cliente pase a recogerlo.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `🧾 Nuevo pedido pagado #${String(d?.orderId ?? "").slice(0, 8)} — ${d?.name ?? ""}`,
  displayName: "Notificación pedido tienda (interno)",
  to: "hola@144reality.com",
  previewData: {
    orderId: "abcdef12-3456-7890-abcd-1234567890ab",
    name: "María López",
    phone: "+34 600 000 000",
    email: "maria@example.com",
    notes: "Recojo a las 19h",
    items: [{ name: "Cheesecake frutos rojos", qty: 2, price_cents: 590 }],
    totalCents: 1180,
    amountPaidCents: 1180,
    paymentIntentId: "pi_3ABC",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Georgia, serif" };
const container = { margin: "0 auto", padding: "24px", maxWidth: "600px" };
const eyebrow = {
  fontFamily: "monospace",
  fontSize: "10px",
  letterSpacing: "0.3em",
  color: "#5a6b4a",
  margin: "0 0 6px",
};
const h1 = { color: "#2f3d2f", fontSize: "22px", margin: "0 0 16px" };
const h2 = { color: "#2f3d2f", fontSize: "16px", margin: "16px 0 8px" };
const card = {
  border: "1px solid #e8e2d5",
  borderRadius: "4px",
  padding: "12px 16px",
  backgroundColor: "#faf7f0",
};
const p = { color: "#222", fontSize: "14px", lineHeight: "22px", margin: "4px 0" };
const pMeta = { color: "#555", fontSize: "12px", margin: "0 0 4px 12px", fontStyle: "italic" as const };
const pMono = {
  color: "#666",
  fontSize: "12px",
  fontFamily: "monospace",
  margin: "8px 0 0",
};
const hr = { borderColor: "#e8e2d5", margin: "10px 0" };
const footer = { color: "#666", fontSize: "12px", marginTop: "16px" };
