// app/(admin)/catalogo/imagenes/page.tsx
import type { Metadata } from 'next'
import { Pagination } from '@/components/admin/Pagination'
import { fetchImagenesGlobales } from '@/modules/catalogo/imagenes/queries'
import { ImagenesFilters } from './components/ImagenesFilters'
import { ImagenesToolbar } from './components/ImagenesToolbar'
import { VistaGrid } from './components/VistaGrid'
import { VistaTabla } from './components/VistaTabla'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Gestor de Imágenes',
}

const PAGE_SIZE = 20

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

function ImagenesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted" />
        ))}
      </div>
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
  vista: 'grid' | 'tabla'
}) {
  const { imagenes, total, page, totalPages } = await fetchImagenesGlobales(filtros)

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestor de Imágenes
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} imagen{total !== 1 ? 'es' : ''} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <ImagenesToolbar total={total} />
      </div>

      <ImagenesFilters />

      {vista === 'grid' ? (
        <VistaGrid imagenes={imagenes} />
      ) : (
        <VistaTabla imagenes={imagenes} />
      )}

      <Pagination total={total} />
    </>
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

  const vista = params.vista === 'tabla' ? 'tabla' : 'grid'

  return (
    <div className="space-y-4">
      <Suspense fallback={<ImagenesSkeleton />}>
        <ImagenesContent filtros={filtros} vista={vista} />
      </Suspense>
    </div>
  )
}