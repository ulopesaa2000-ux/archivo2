// components/admin/ClearFilters.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function ClearFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Solo mostrar si hay filtros activos (excluyendo 'page')
  const hasFilters = Array.from(searchParams.entries()).some(
    ([key]) => key !== 'page'
  )

  if (!hasFilters) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          router.push(pathname, { scroll: false })
        })
      }}
    >
      <X className="h-3 w-3 mr-1" />
      Limpiar filtros
    </Button>
  )
}
