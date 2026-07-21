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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma tu email para acceder a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>— 144 Reality</Text>
        <Text style={brandTitle}>Bites &amp; Coffee</Text>
        <Heading style={h1}>Confirma tu email</Heading>
        <Text style={text}>
          Gracias por registrarte en{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Confirma tu dirección ({recipient}) pulsando el botón:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verificar email
        </Button>
        <Text style={text}>
          Si el botón no funciona, copia y pega esta URL en tu navegador:
          <br />
          <Link href={confirmationUrl} style={link}>
            {confirmationUrl}
          </Link>
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Si no creaste esta cuenta, puedes ignorar este correo sin problema.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
