// components/store/SkuPill.tsx
'use client'

import Link from 'next/link'

interface SkuPillProps {
  href: string
  sku: string
  color?: 'emerald' | 'amber'
}

export function SkuPill({ href, sku, color = 'emerald' }: SkuPillProps) {
  const colorClass =
    color === 'amber'
      ? 'text-amber-300 hover:bg-amber-800/80'
      : 'text-emerald-300 hover:bg-emerald-800/80'

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 ${colorClass} text-[10px] font-mono font-semibold bg-black/60 px-2.5 py-1 rounded-full hover:text-white transition-colors whitespace-nowrap`}
    >
      {sku}
    </Link>
  )
}
