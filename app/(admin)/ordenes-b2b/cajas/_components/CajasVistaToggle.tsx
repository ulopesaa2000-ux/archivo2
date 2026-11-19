// app/(admin)/ordenes-b2b/cajas/_components/CajasVistaToggle.tsx
'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container, FolderOpen, Package, Table } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/constants'

export function CajasVistaToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentVista = searchParams.get('vista') === 'tabla' ? 'tabla' : 'agrupado'
  const currentAgrupar = searchParams.get('agrupar') === 'producto' ? 'producto' : 'contenedor'

  const pushParams = (updater: (params: URLSearchParams) => void) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)
      params.delete('page')
      const qs = params.toString()
      router.push(
        qs ? `${ADMIN_ROUTES.ordenesB2B.cajas}?${qs}` : ADMIN_ROUTES.ordenesB2B.cajas,
        { scroll: false }
      )
    })
  }

  const setVista = (vista: 'agrupado' | 'tabla') => {
    if (vista === currentVista) return
    pushParams((params) => {
      if (vista === 'agrupado') {
        params.delete('vista')
      } else {
        params.set('vista', 'tabla')
      }
    })
  }

  const setAgrupar = (agrupar: 'contenedor' | 'producto') => {
    if (agrupar === currentAgrupar) return
    pushParams((params) => {
      if (agrupar === 'contenedor') {
        params.delete('agrupar')
      } else {
        params.set('agrupar', 'producto')
      }
    })
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 transition-opacity ${isPending ? 'opacity-70' : ''}`}>
      {/* Selector de agrupación (solo en modo agrupado) */}
      {currentVista === 'agrupado' && (
        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            disabled={isPending}
            className={`px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-colors ${
              currentAgrupar === 'contenedor'
                ? 'bg-primary/10 font-semibold text-primary'
                : 'hover:bg-muted/50 text-muted-foreground'
            }`}
            onClick={() => setAgrupar('contenedor')}
            title="Agrupar por contenedor"
          >
            <Container className="h-3.5 w-3.5" />
            <span>Por Contenedor</span>
          </button>
          <button
            type="button"
            disabled={isPending}
            className={`px-2.5 py-1.5 flex items-center gap-1.5 text-xs border-l transition-colors ${
              currentAgrupar === 'producto'
                ? 'bg-primary/10 font-semibold text-primary'
                : 'hover:bg-muted/50 text-muted-foreground'
            }`}
            onClick={() => setAgrupar('producto')}
            title="Agrupar por producto"
          >
            <Package className="h-3.5 w-3.5" />
            <span>Por Producto</span>
          </button>
        </div>
      )}

      {/* Toggle Agrupado | Tabla */}
      <div className="flex rounded-md border overflow-hidden">
        <button
          type="button"
          disabled={isPending}
          className={`px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors ${
            currentVista === 'agrupado'
              ? 'bg-muted font-medium text-foreground'
              : 'hover:bg-muted/50 text-muted-foreground'
          }`}
          onClick={() => setVista('agrupado')}
          title="Vista agrupada"
        >
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Agrupado</span>
        </button>
        <button
          type="button"
          disabled={isPending}
          className={`px-3 py-1.5 flex items-center gap-1.5 text-sm border-l transition-colors ${
            currentVista === 'tabla'
              ? 'bg-muted font-medium text-foreground'
              : 'hover:bg-muted/50 text-muted-foreground'
          }`}
          onClick={() => setVista('tabla')}
          title="Vista tabular por producto"
        >
          <Table className="h-4 w-4" />
          <span className="hidden sm:inline">Tabla</span>
        </button>
      </div>
    </div>
  )
}
