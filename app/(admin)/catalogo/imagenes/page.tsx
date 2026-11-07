// app/(admin)/catalogo/imagenes/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Pagination } from '@/components/admin/Pagination'
import {
  fetchImagenesGlobales,
  fetchImagenesAgrupadas,
} from '@/modules/catalogo/imagenes/queries'
import { ImagenesFilters } from './components/ImagenesFilters'
import { ImagenesToolbar } from './components/ImagenesToolbar'
import { VistaGrid } from './components/VistaGrid'
import { VistaAgrupada } from './components/VistaAgrupada'
import { VistaTabla } from './components/VistaTabla'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Gestor de Imágenes',
}

const PAGE_SIZE_AGRUPADO = 24
const PAGE_SIZE_INDIVIDUAL = 24

type SearchParams = {
  q?: string
  uso_imagen?: string
  origen?: string
  principal?: string
  page?: string
  vista?: string
}

function parseOptionalInt(value?: string) {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

function parseBool(value?: string): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function ImagenesSkeleton({ vista = 'grid' }: { vista?: 'grid' | 'agrupado' | 'tabla' }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-40" />

      {vista === 'agrupado' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="text-xs font-medium text-primary animate-pulse">
              Agrupando imágenes de lo más reciente a lo más antiguo...
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 rounded-xl border bg-muted/20 animate-pulse p-3 space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-48 bg-muted/40 rounded-lg" />
                <div className="h-3 w-36 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}

async function ImagenesContent({
  filtros,
  vista,
}: {
  filtros: {
    q?: string
    uso_imagen?: string
    origen?: 'local' | 'url_externa'
    es_principal?: boolean
    page?: number
  }
  vista: 'grid' | 'agrupado' | 'tabla'
}) {
  if (vista === 'agrupado') {
    const { grupos, totalGrupos, totalImagenes } = await fetchImagenesAgrupadas(
      filtros,
      filtros.page,
      PAGE_SIZE_AGRUPADO
    )

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {totalGrupos} producto{totalGrupos !== 1 ? 's' : ''} agrupado{totalGrupos !== 1 ? 's' : ''} ({totalImagenes} fotos en total)
        </p>

        <VistaAgrupada
          grupos={grupos}
          totalGrupos={totalGrupos}
          totalImagenes={totalImagenes}
        />

        <Pagination total={totalGrupos} pageSize={PAGE_SIZE_AGRUPADO} />
      </div>
    )
  }

  const { imagenes, total } = await fetchImagenesGlobales(
    filtros,
    PAGE_SIZE_INDIVIDUAL
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total} imagen{total !== 1 ? 'es' : ''} encontrada{total !== 1 ? 's' : ''}
      </p>

      {vista === 'grid' ? (
        <VistaGrid imagenes={imagenes} />
      ) : (
        <VistaTabla imagenes={imagenes} />
      )}

      <Pagination total={total} pageSize={PAGE_SIZE_INDIVIDUAL} />
    </div>
  )
}

export default async function ImagenesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const filtros = {
    q: params.q,
    uso_imagen: params.uso_imagen,
    origen: params.origen as 'local' | 'url_externa' | undefined,
    es_principal: parseBool(params.principal),
    page: parseOptionalInt(params.page) ?? 1,
  }

  const vista = params.vista === 'agrupado' ? 'agrupado' : params.vista === 'tabla' ? 'tabla' : 'grid'

  return (
    <div className="space-y-4">
      {/* ── Encabezado y Toolbar fijos (NUNCA se desmontan al buscar) ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestor de Imágenes</h1>
        </div>
        <ImagenesToolbar />
      </div>

      {/* ── Filtros fijos y estables ── */}
      <ImagenesFilters />

      {/* ── Solo la galería/tabla se suspende dinámicamente ── */}
      <Suspense fallback={<ImagenesSkeleton vista={vista} />}>
        <ImagenesContent filtros={filtros} vista={vista} />
      </Suspense>
    </div>
  )
}
