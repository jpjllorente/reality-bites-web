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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Restablece tu contraseña de {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>— 144 Reality</Text>
        <Text style={brandTitle}>Bites &amp; Coffee</Text>
        <Heading style={h1}>Restablecer contraseña</Heading>
        <Text style={text}>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en{' '}
          <strong>{siteName}</strong>. Pulsa el botón para elegir una nueva:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Cambiar contraseña
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
          Si no solicitaste este cambio, ignora este correo — tu contraseña seguirá igual.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
