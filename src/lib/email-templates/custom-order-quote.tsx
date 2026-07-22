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
  totalCents?: number;
  depositPercent?: number;
  depositCents?: number;
  paymentUrl?: string;
  notes?: string;
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
  totalCents = 0,
  depositPercent = 100,
  depositCents = 0,
  paymentUrl = "#",
  notes = "",
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Presupuesto listo para {orderType}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>144 REALITY — BITES &amp; COFFEE</Text>
        <Heading style={h1}>
          Presupuesto listo{name ? `, ${name.split(" ")[0]}` : ""}
        </Heading>
        <Text style={paragraph}>
          Hemos preparado el presupuesto para <strong>{orderType}</strong>. Aquí tienes
          el detalle y el enlace para reservar tu encargo.
        </Text>

        <Section style={card}>
          <Text style={rowLabel}>Total del encargo</Text>
          <Text style={totalPrice}>{fmt(totalCents)}</Text>
          <Hr style={hr} />
          <Text style={rowLabel}>Anticipo mínimo ({depositPercent}%)</Text>
          <Text style={depositPrice}>{fmt(depositCents)}</Text>
          <Text style={hint}>
            Puedes pagar el anticipo para reservar la fecha o abonar el importe
            completo, lo que prefieras.
          </Text>
        </Section>

        {notes ? (
          <Section>
            <Text style={rowLabel}>Notas del presupuesto</Text>
            <Text style={paragraph}>{notes}</Text>
          </Section>
        ) : null}

        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={paymentUrl} style={button}>
            Ver presupuesto y pagar
          </Button>
        </Section>

        <Text style={hint}>
          Si el botón no funciona, copia este enlace en tu navegador:{" "}
          <a href={paymentUrl} style={link}>{paymentUrl}</a>
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
    `Presupuesto para ${d?.orderType ?? "tu encargo"} — 144 Reality`,
  displayName: "Presupuesto de encargo",
  previewData: {
    name: "María",
    orderType: "Tarta de boda",
    totalCents: 25000,
    depositPercent: 30,
    depositCents: 7500,
    paymentUrl: "https://144reality.com/encargos/pagar/token-demo",
    notes: "Incluye entrega el sábado 12:00.",
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
const totalPrice = {
  color: "#2f3d2f",
  fontSize: "26px",
  fontWeight: 700,
  margin: "0 0 12px",
};
const depositPrice = {
  color: "#d4842a",
  fontSize: "22px",
  fontWeight: 700,
  margin: "0 0 8px",
};
const hint = { color: "#666", fontSize: "12px", lineHeight: "18px", margin: "8px 0 0" };
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
const footer = { color: "#888", fontSize: "12px", textAlign: "center" as const };
