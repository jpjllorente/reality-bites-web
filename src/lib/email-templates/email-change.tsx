import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'
import {
  brandBar,
  brandTitle,
  button,
  container,
  divider,
  footer,
  h1,
  link,
  main,
  text,
} from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma el cambio de email en {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>— 144 Reality</Text>
        <Text style={brandTitle}>Bites &amp; Coffee</Text>
        <Heading style={h1}>Confirma tu nuevo email</Heading>
        <Text style={text}>
          Hemos recibido una solicitud para cambiar el email de tu cuenta en{' '}
          <strong>{siteName}</strong>
          {oldEmail ? <> de <strong>{oldEmail}</strong></> : null>
          {newEmail ? <> a <strong>{newEmail}</strong></> : null>.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar cambio
        </Button>
        <Text style={text}>
          Si el botón no funciona:
          <br />
          <Link href={confirmationUrl} style={link}>
            {confirmationUrl}
          </Link>
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Si no solicitaste este cambio, ignora este correo — tu email seguirá igual.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
