// components/shared/TikTokIcon.tsx
import type { SVGProps } from 'react'

export function TikTokIcon({ className = 'h-5 w-5 shrink-0', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Círculo negro sólido */}
      <circle cx="12" cy="12" r="12" fill="#000000" />
      {/* Nota musical blanca de TikTok */}
      <path
        fill="#FFFFFF"
        d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.5 2.82 2.82 0 0 1 .49.04v-3.2a5.77 5.77 0 0 0-.49-.02A5.77 5.77 0 1 0 15.63 15.5V9.45a7.51 7.51 0 0 0 4.37 1.39V7.61a4.34 4.34 0 0 1-3.4-1.79z"
      />
    </svg>
  )
}
