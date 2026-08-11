// app/(admin)/configuracion/tablas-soporte/components/TablasSoporteTabs.tsx
'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Users,
  Tag,
  Ruler,
  Palette,
  Layers,
  UserCheck,
  Calendar,
  Shirt,
  ArrowLeftRight,
  CheckCircle2,
} from 'lucide-react'
import { TABLAS_SOPORTE_CONFIG, type TablaSoporteKey } from '@/modules/config/tablas-soporte/types'
import { cn } from '@/lib/utils'

const TAB_ICONS: Record<TablaSoporteKey, React.ComponentType<{ className?: string }>> = {
  personas: Users,
  cat_marcas: Tag,
  cat_tallas: Ruler,
  cat_colores: Palette,
  cat_telas: Layers,
  cat_generos: UserCheck,
  cat_edades: Calendar,
  cat_tipo_prenda: Shirt,
  cat_tipos_movimiento: ArrowLeftRight,
  cat_estados_nota: CheckCircle2,
}

export function TablasSoporteTabs({
  currentTabla,
  counts,
}: {
  currentTabla: TablaSoporteKey
  counts: Record<TablaSoporteKey, number>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const keys = Object.keys(TABLAS_SOPORTE_CONFIG) as TablaSoporteKey[]

  function handleSelectTab(key: TablaSoporteKey) {
    if (key === currentTabla) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('tabla', key)
    // reset pagination/search on tab change
    params.delete('q')
    params.delete('estado')

    startTransition(() => {
      router.push(`/configuracion/tablas-soporte?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="w-full border-b bg-background overflow-x-auto scrollbar-none">
      <div className="flex min-w-max items-center gap-1 p-1">
        {keys.map((key) => {
          const config = TABLAS_SOPORTE_CONFIG[key]
          const Icon = TAB_ICONS[key]
          const isSelected = currentTabla === key
          const count = counts[key] ?? 0

          return (
            <button
              key={key}
              onClick={() => handleSelectTab(key)}
              disabled={isPending}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all outline-none',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                isPending && 'opacity-70 cursor-wait'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{config.label}</span>
              <span
                className={cn(
                  'ml-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                  isSelected
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
