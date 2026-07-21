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
}

const Email = ({ name = "", orderType = "tu encargo" }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Hemos recibido tu solicitud de {orderType}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={eyebrow}>144 REALITY — BITES &amp; COFFEE</Text>
          <Heading style={h1}>¡Gracias{name ? `, ${name}` : ""}!</Heading>
        </Section>

        <Section style={body}>
          <Text style={paragraph}>
            Hemos recibido tu solicitud de <strong>{orderType}</strong>. Nuestro
            equipo la está revisando y te contactaremos en menos de 24 horas
            para confirmar los detalles, presupuesto y fecha de entrega.
          </Text>
          <Text style={paragraph}>
            Si necesitas añadir información o modificar algo, simplemente
            responde a este email o escríbenos por WhatsApp al{" "}
            <strong>+34 681 63 46 23</strong>.
          </Text>

          <Hr style={hr} />

          <Text style={signature}>
            Un saludo,
            <br />
            El equipo de 144 Reality
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Calle Francisco González Conde, 37 · Bullas, Murcia
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Hemos recibido tu solicitud — 144 Reality",
  displayName: "Confirmación de encargo (cliente)",
  previewData: { name: "María", orderType: "Tarta de boda" },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    'ui-sans-serif, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};
const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "40px 24px",
};
const header = { paddingBottom: "8px" };
const eyebrow = {
  fontSize: "11px",
  letterSpacing: "0.24em",
  color: "#5a6b4a",
  margin: "0 0 12px",
  fontWeight: 700,
};
const h1 = {
  fontSize: "32px",
  lineHeight: "1.1",
  color: "#2f3d2f",
  margin: "0 0 8px",
  fontWeight: 700,
};
const body = { paddingTop: "16px" };
const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#2f3d2f",
  margin: "0 0 16px",
};
const hr = {
  border: "none",
  borderTop: "1px solid #e8e2d5",
  margin: "24px 0",
};
const signature = { fontSize: "14px", color: "#5a6b4a", margin: 0 };
const footer = { paddingTop: "24px" };
const footerText = {
  fontSize: "12px",
  color: "#5a6b4a",
  margin: 0,
  textAlign: "center" as const,
};
