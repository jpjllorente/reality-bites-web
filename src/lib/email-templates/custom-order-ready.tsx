import * as React from "react";
import {
  Body,
  Button,
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
  orderType?: string;
  remainingCents?: number;
  totalCents?: number;
  amountPaidCents?: number;
  paymentUrl?: string;
  pickupInfo?: string;
}

function fmt(cents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format((cents ?? 0) / 100);
}

const Email = ({
  name = "",
  orderType = "tu encargo",
  remainingCents = 0,
  totalCents = 0,
  amountPaidCents = 0,
  paymentUrl = "#",
  pickupInfo = "Calle Francisco González Conde, 37 · Bullas",
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu encargo está listo para recoger</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>144 REALITY — BITES &amp; COFFEE</Text>
        <Heading style={h1}>
          ¡Listo para recoger{name ? `, ${name.split(" ")[0]}` : ""}!
        </Heading>
        <Text style={paragraph}>
          Tu <strong>{orderType}</strong> ya está preparado. Puedes pasar a
          recogerlo por <strong>{pickupInfo}</strong>.
        </Text>

        {remainingCents > 0 ? (
          <>
            <Section style={card}>
              <Text style={rowLabel}>Total del encargo</Text>
              <Text style={muted}>{fmt(totalCents)}</Text>
              <Hr style={hr} />
              <Text style={rowLabel}>Anticipo pagado</Text>
              <Text style={muted}>{fmt(amountPaidCents)}</Text>
              <Hr style={hr} />
              <Text style={rowLabel}>Pendiente</Text>
              <Text style={pending}>{fmt(remainingCents)}</Text>
            </Section>

            <Text style={paragraph}>
              Puedes abonar el importe restante ahora online o al recoger en el
              local, lo que prefieras.
            </Text>

            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Button href={paymentUrl} style={button}>
                Pagar el resto online
              </Button>
            </Section>

            <Text style={hint}>
              Si el botón no funciona, copia este enlace en tu navegador:{" "}
              <a href={paymentUrl} style={link}>{paymentUrl}</a>
            </Text>
          </>
        ) : (
          <Section style={card}>
            <Text style={rowLabel}>Estado del pago</Text>
            <Text style={muted}>Completado ({fmt(amountPaidCents)})</Text>
          </Section>
        )}

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
    `Tu encargo está listo — ${d?.orderType ?? "144 Reality"}`,
  displayName: "Encargo · listo para recoger",
  previewData: {
    name: "María",
    orderType: "Tarta de boda",
    remainingCents: 17500,
    totalCents: 25000,
    amountPaidCents: 7500,
    paymentUrl: "https://144reality.com/encargos/pagar/token-demo",
    pickupInfo: "Calle Francisco González Conde, 37 · Bullas",
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
const h1 = { color: "#2f3d2f", fontSize: "28px", margin: "0 0 12px" };
const paragraph = {
  color: "#333",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0 0 12px",
};
const card = {
  border: "1px solid #e8e2d5",
  borderRadius: "4px",
  padding: "20px",
  margin: "20px 0",
  backgroundColor: "#faf7f0",
};
const rowLabel = {
  color: "#2f3d2f",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.15em",
  margin: "0 0 4px",
};
const muted = { color: "#2f3d2f", fontSize: "18px", fontWeight: 700, margin: "0 0 4px" };
const pending = { color: "#d4842a", fontSize: "22px", fontWeight: 700, margin: 0 };
const button = {
  backgroundColor: "#2f3d2f",
  color: "#ffffff",
  padding: "14px 28px",
  borderRadius: "3px",
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  textDecoration: "none",
  display: "inline-block",
};
const hr = { borderColor: "#e8e2d5", margin: "16px 0" };
const link = { color: "#d4842a", textDecoration: "underline" };
const hint = { color: "#666", fontSize: "12px", lineHeight: "18px", margin: "8px 0 0" };
const footer = { color: "#888", fontSize: "12px", textAlign: "center" as const };
