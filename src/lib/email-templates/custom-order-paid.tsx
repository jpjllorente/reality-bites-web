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
  orderType?: string;
  amountPaidCents?: number;
  totalCents?: number;
  mode?: "deposit" | "full";
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
  amountPaidCents = 0,
  totalCents = 0,
  mode = "full",
}: Props) => {
  const remaining = Math.max(0, totalCents - amountPaidCents);
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Pago confirmado para {orderType}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>144 REALITY — BITES &amp; COFFEE</Text>
          <Heading style={h1}>
            ¡Recibido{name ? `, ${name.split(" ")[0]}` : ""}!
          </Heading>
          <Text style={paragraph}>
            Hemos confirmado tu pago para <strong>{orderType}</strong>. Ya
            tenemos tu encargo reservado.
          </Text>

          <Section style={card}>
            <Text style={rowLabel}>Importe pagado</Text>
            <Text style={total}>{fmt(amountPaidCents)}</Text>
            {mode === "deposit" && remaining > 0 ? (
              <>
                <Hr style={hr} />
                <Text style={rowLabel}>Pendiente en la entrega</Text>
                <Text style={pending}>{fmt(remaining)}</Text>
              </>
            ) : null}
          </Section>

          <Text style={paragraph}>
            Nos pondremos en contacto contigo para confirmar los últimos
            detalles (fecha, recogida, sabores…) antes de la entrega.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            144 Reality Bites &amp; Coffee · hola@144reality.com · +34 681 634 623
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Pago recibido — ${d?.orderType ?? "tu encargo"} · 144 Reality`,
  displayName: "Encargo · pago confirmado",
  previewData: {
    name: "María",
    orderType: "Tarta de boda",
    amountPaidCents: 7500,
    totalCents: 25000,
    mode: "deposit",
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
const total = { color: "#2f3d2f", fontSize: "24px", fontWeight: 700, margin: 0 };
const pending = { color: "#d4842a", fontSize: "20px", fontWeight: 700, margin: 0 };
const hr = { borderColor: "#e8e2d5", margin: "16px 0" };
const footer = { color: "#888", fontSize: "12px", textAlign: "center" as const };
