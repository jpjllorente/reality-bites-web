import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  email?: string;
  phone?: string;
  orderType?: string;
  eventDate?: string;
  servings?: string;
  flavors?: string;
  allergens?: string;
  budgetRange?: string;
  message?: string;
}

const rowFields: Array<{ key: keyof Props; label: string }> = [
  { key: "name", label: "Nombre" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Teléfono" },
  { key: "orderType", label: "Tipo" },
  { key: "eventDate", label: "Fecha" },
  { key: "servings", label: "Personas" },
  { key: "flavors", label: "Sabores" },
  
  { key: "budgetRange", label: "Presupuesto" },
];

const Email = (props: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Nuevo encargo de {props.name || "cliente"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>144 REALITY — NUEVO ENCARGO</Text>
        <Heading style={h1}>Nueva solicitud de encargo</Heading>

        <Section style={card}>
          {rowFields.map((f) => (
            <Row key={f.key} style={row}>
              <Column style={label}>{f.label}</Column>
              <Column style={value}>{(props[f.key] as string) || "—"}</Column>
            </Row>
          ))}
        </Section>

        {props.message && props.message !== "-" ? (
          <>
            <Text style={sectionTitle}>Mensaje</Text>
            <Text style={messageBox}>{props.message}</Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={foot}>
          Responde directamente a {props.email || "el cliente"} para confirmar.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Nuevo encargo · ${data.orderType || "custom"} · ${data.name || "cliente"}`,
  displayName: "Notificación de encargo (interno)",
  to: "hola@144reality.com",
  previewData: {
    name: "María López",
    email: "maria@example.com",
    phone: "+34 600 000 000",
    orderType: "Tarta de boda",
    eventDate: "2026-09-14",
    servings: "80",
    flavors: "Chocolate, frutos rojos",
    
    budgetRange: "200 – 400 €",
    message: "Tres pisos, temática botánica.",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    'ui-sans-serif, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};
const container = { maxWidth: "600px", margin: "0 auto", padding: "40px 24px" };
const eyebrow = {
  fontSize: "11px",
  letterSpacing: "0.24em",
  color: "#5a6b4a",
  margin: "0 0 12px",
  fontWeight: 700,
};
const h1 = {
  fontSize: "26px",
  lineHeight: "1.2",
  color: "#2f3d2f",
  margin: "0 0 20px",
  fontWeight: 700,
};
const card = {
  border: "1px solid #e8e2d5",
  borderRadius: "4px",
  padding: "8px 16px",
  marginBottom: "16px",
};
const row = { borderBottom: "1px solid #f0ece3" };
const label = {
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "#5a6b4a",
  padding: "10px 8px 10px 0",
  width: "35%",
  verticalAlign: "top" as const,
};
const value = {
  fontSize: "14px",
  color: "#2f3d2f",
  padding: "10px 0",
  verticalAlign: "top" as const,
};
const sectionTitle = {
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "#5a6b4a",
  margin: "16px 0 6px",
  fontWeight: 700,
};
const messageBox = {
  fontSize: "14px",
  color: "#2f3d2f",
  background: "#f7f4ec",
  padding: "12px 14px",
  borderRadius: "4px",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
};
const hr = { border: "none", borderTop: "1px solid #e8e2d5", margin: "24px 0" };
const foot = { fontSize: "12px", color: "#5a6b4a", margin: 0 };
