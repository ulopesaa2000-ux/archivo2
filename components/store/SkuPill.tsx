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
      ? 'text-amber-300 border-amber-500/30 hover:bg-amber-950/80 hover:text-amber-200'
      : 'text-emerald-300 border-emerald-500/30 hover:bg-emerald-950/80 hover:text-emerald-200'

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={`absolute bottom-3 right-3 z-20 ${colorClass} text-[10px] font-mono font-semibold bg-black/75 backdrop-blur-xs border px-2.5 py-1 rounded-full hover:text-white transition-all shadow-md whitespace-nowrap flex items-center gap-1`}
      title={`Ver producto ${sku}`}
    >
      <span>SKU:</span>
      <span>{sku}</span>
    </Link>
  )
}
