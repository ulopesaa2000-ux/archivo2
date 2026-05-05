export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wear.sistemaindumentaria.com'

  const content = `
User-agent: *
Allow: /
Disallow: /admin/

# Bots de redes sociales — acceso explícito permitido
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: LinkedInBot
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
  `.trim()

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}