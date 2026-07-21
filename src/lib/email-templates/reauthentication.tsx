import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import {
  brandBar,
  brandTitle,
  code,
  container,
  divider,
  footer,
  h1,
  main,
  text,
} from './_brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({
  token,
}: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>— 144 Reality</Text>
        <Text style={brandTitle}>Bites &amp; Coffee</Text>
        <Heading style={h1}>Código de verificación</Heading>
        <Text style={text}>
          Usa este código para confirmar tu identidad. Caduca en unos minutos.
        </Text>
        <Text style={code}>{token}</Text>
        <Hr style={divider} />
        <Text style={footer}>
          Si no solicitaste este código, ignora este correo y considera cambiar tu contraseña.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
