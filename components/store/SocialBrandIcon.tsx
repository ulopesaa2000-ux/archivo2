// components/store/SocialBrandIcon.tsx
'use client'

import { useState } from 'react'
import { Globe, Instagram, Phone, Youtube, Send } from 'lucide-react'

function TikTokSvg({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

function FacebookSvg({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  )
}

function XSvg({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function SocialBrandIcon({
  plataforma,
  className = 'h-4 w-4',
}: {
  plataforma: string
  className?: string
}) {
  const [imgError, setImgError] = useState(false)
  const slug = (plataforma || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

  if (slug === 'instagram') return <Instagram className={`${className} text-pink-600 shrink-0`} />
  if (slug === 'tiktok') return <TikTokSvg className={`${className} shrink-0`} />
  if (slug === 'whatsapp') return <Phone className={`${className} text-[#25D366] shrink-0`} />
  if (slug === 'facebook') return <FacebookSvg className={`${className} text-[#1877F2] shrink-0`} />
  if (slug === 'youtube') return <Youtube className={`${className} text-[#FF0000] shrink-0`} />
  if (slug === 'x' || slug === 'twitter') return <XSvg className={`${className} shrink-0`} />
  if (slug === 'telegram') return <Send className={`${className} text-[#26A5E4] shrink-0`} />

  if (slug && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://cdn.simpleicons.org/${slug}`}
        alt={slug}
        width={18}
        height={18}
        className={`${className} shrink-0 dark:invert`}
        onError={() => setImgError(true)}
      />
    )
  }

  return <Globe className={`${className} text-muted-foreground shrink-0`} />
}
