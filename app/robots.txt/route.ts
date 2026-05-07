export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wear.sistemaindumentaria.com'

  const content = `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

# Bots de redes sociales — acceso explícito para OG images
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: LinkedInBot
Allow: /

# Apple para iMessage
User-agent: Applebot
Allow: /

# OpenAI para ChatGPT
User-agent: GPTBot
Allow: /

User-agent: GPT-User
Allow: /

# Google para SEO
User-agent: Google-Extended
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