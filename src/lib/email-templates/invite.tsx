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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Te han invitado al panel de {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>— 144 Reality</Text>
        <Text style={brandTitle}>Bites &amp; Coffee</Text>
        <Heading style={h1}>Tienes una invitación</Heading>
        <Text style={text}>
          Has sido invitado a unirte a{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Acepta la invitación y crea tu cuenta desde el botón:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Aceptar invitación
        </Button>
        <Hr style={divider} />
        <Text style={footer}>
          Si no esperabas esta invitación, puedes ignorar este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
