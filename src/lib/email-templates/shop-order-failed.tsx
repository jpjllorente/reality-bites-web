import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props { name?: string; orderId?: string; reason?: string }

const Email = ({ name = "", orderId = "", reason = "" }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>No hemos podido cobrar tu pedido en 144 Reality</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>144 REALITY — BITES &amp; COFFEE</Text>
        <Heading style={h1}>No hemos podido completar el pago</Heading>
        <Text style={lead}>
          Hola{name ? ` ${name.split(" ")[0]}` : ""}, tu pedido
          {orderId ? ` #${orderId.slice(0, 8)}` : ""} no llegó a confirmarse porque el
          pago fue rechazado o no se completó a tiempo.
        </Text>
        {reason ? (
          <Text style={paragraph}>
            <strong>Motivo:</strong> {reason}
          </Text>
        ) : null}
        <Text style={paragraph}>
          Si quieres reintentar, vuelve a la tienda y añade los productos al carrito. También
          puedes escribirnos por WhatsApp al +34 681 634 623 y lo gestionamos contigo.
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
    `Pago no completado en 144 Reality${d?.orderId ? ` #${String(d.orderId).slice(0, 8)}` : ""}`,
  displayName: "Pago fallido pedido tienda",
  previewData: { name: "María", orderId: "abcdef12-3456-7890-abcd-1234567890ab", reason: "Tarjeta rechazada" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Georgia, serif" };
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "560px" };
const eyebrow = { fontFamily: "monospace", letterSpacing: "0.3em", fontSize: "10px", color: "#5a6b4a", margin: "0 0 8px" };
const h1 = { color: "#2f3d2f", fontSize: "26px", margin: "0 0 8px" };
const lead = { color: "#333", fontSize: "15px", lineHeight: "22px", margin: 0 };
const paragraph = { color: "#333", fontSize: "14px", lineHeight: "22px", margin: "12px 0" };
const hr = { borderColor: "#e8e2d5", margin: "20px 0" };
const footer = { color: "#888", fontSize: "12px", textAlign: "center" as const };
