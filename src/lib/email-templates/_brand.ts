// Shared brand styles for 144 Reality auth emails.
// Palette: vintage dark green #2f3d2f, sage #5a6b4a, cream #e8e2d5, terracotta #d4842a.
// Body background MUST stay #ffffff; inner surfaces use cream/green accents.

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Work Sans', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '32px 12px',
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#e8e2d5',
  border: '1px solid #2f3d2f',
  borderRadius: '2px',
  padding: '40px 36px',
}

export const brandBar = {
  fontFamily: "'Bebas Neue', Impact, sans-serif",
  fontSize: '11px',
  letterSpacing: '0.35em',
  color: '#5a6b4a',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
}

export const brandTitle = {
  fontFamily: "'Bebas Neue', Impact, sans-serif",
  fontSize: '28px',
  letterSpacing: '0.08em',
  color: '#2f3d2f',
  textTransform: 'uppercase' as const,
  margin: '0 0 24px',
  lineHeight: 1,
}

export const h1 = {
  fontFamily: "'Bebas Neue', Impact, sans-serif",
  fontSize: '38px',
  letterSpacing: '0.02em',
  color: '#2f3d2f',
  margin: '0 0 20px',
  lineHeight: 1.05,
  textTransform: 'uppercase' as const,
}

export const text = {
  fontSize: '15px',
  color: '#2f3d2f',
  lineHeight: 1.6,
  margin: '0 0 18px',
}

export const link = { color: '#d4842a', textDecoration: 'underline' }

export const button = {
  backgroundColor: '#2f3d2f',
  color: '#e8e2d5',
  fontSize: '12px',
  fontWeight: 700 as const,
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  borderRadius: '2px',
  padding: '14px 26px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 24px',
}

export const code = {
  display: 'inline-block',
  fontFamily: "'Courier New', monospace",
  fontSize: '28px',
  letterSpacing: '0.4em',
  color: '#2f3d2f',
  backgroundColor: '#ffffff',
  border: '1px solid #2f3d2f',
  padding: '14px 22px',
  borderRadius: '2px',
  margin: '8px 0 24px',
}

export const divider = {
  borderTop: '1px solid #2f3d2f',
  opacity: 0.25,
  margin: '28px 0 20px',
}

export const footer = {
  fontSize: '11px',
  color: '#5a6b4a',
  lineHeight: 1.6,
  margin: '20px 0 0',
  letterSpacing: '0.05em',
}
