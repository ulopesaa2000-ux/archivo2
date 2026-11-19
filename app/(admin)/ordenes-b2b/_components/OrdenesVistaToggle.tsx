// app/(admin)/ordenes-b2b/_components/OrdenesVistaToggle.tsx
'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Table, FolderOpen } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/constants'

export function OrdenesVistaToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentVista = searchParams.get('vista') === 'tabla' ? 'tabla' : 'agrupado'

  const setVista = (vista: 'tabla' | 'agrupado') => {
    if (vista === currentVista) return
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (vista === 'agrupado') {
        params.delete('vista')
      } else {
        params.set('vista', 'tabla')
      }
      params.delete('page')
      const qs = params.toString()
      router.push(qs ? `${ADMIN_ROUTES.ordenesB2B.lista}?${qs}` : ADMIN_ROUTES.ordenesB2B.lista, {
        scroll: false,
      })
    })
  }

  return (
    <div
      className={`flex rounded-md border overflow-hidden transition-opacity ${
        isPending ? 'opacity-70' : ''
      }`}
    >
      <button
        type="button"
        disabled={isPending}
        className={`px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors ${
          currentVista === 'agrupado'
            ? 'bg-muted font-medium text-foreground'
            : 'hover:bg-muted/50 text-muted-foreground'
        }`}
        onClick={() => setVista('agrupado')}
        title="Vista agrupada por contenedor"
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
        title="Vista tabular"
      >
        <Table className="h-4 w-4" />
        <span className="hidden sm:inline">Tabla</span>
      </button>
    </div>
  )
}
