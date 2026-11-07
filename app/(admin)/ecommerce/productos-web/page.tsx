// app/(admin)/ecommerce/productos-web/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchCatalogosParaFiltros } from '@/modules/catalogo/queries'
import { fetchProductosWebAdmin } from '@/modules/ecommerce/queries'
import { ProductosWebFilters } from '@/components/admin/ecommerce/ProductosWebFilters'
import { ProductosWebTable } from '@/components/admin/ecommerce/ProductosWebTable'
import type { FiltrosProductoWeb } from '@/modules/ecommerce/types'

export const metadata: Metadata = {
  title: 'Catálogo Web & Publicaciones | Admin',
}

interface PageProps {
  searchParams: Promise<{
    q?: string
    estado_web?: string
    tiene_foto?: string
    especial?: string
    marca_id?: string
    genero_id?: string
    tipo_prenda_id?: string
    ordenar_por?: string
    page?: string
  }>
}

/**
 * Componente asíncrono exclusivo para la tabla de resultados.
 * La barra de filtros permanece montada fuera de `<Suspense>` para no perder foco.
 */
async function ProductosWebResults({ filtros }: { filtros: FiltrosProductoWeb }) {
  const { productos, total } = await fetchProductosWebAdmin(filtros)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Mostrando <strong className="text-foreground">{productos.length}</strong> de{' '}
          <strong className="text-foreground">{total}</strong> productos registrados
        </span>
        <span className="italic">
          Orden por defecto: <strong>Con foto primero + Más recientes</strong>
        </span>
      </div>

      <ProductosWebTable productos={productos} total={total} />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-64 bg-muted animate-pulse rounded" />
      <div className="h-96 bg-muted animate-pulse rounded-xl" />
    </div>
  )
}

export default async function ProductosWebPage({ searchParams }: PageProps) {
  const [params, catalogos] = await Promise.all([
    searchParams,
    fetchCatalogosParaFiltros(),
  ])

  const filtros: FiltrosProductoWeb = {
    q: params.q,
    estado_web: params.estado_web as any,
    tiene_foto: params.tiene_foto as any,
    especial: (params.especial as any) || 'todos',
    marca_id: params.marca_id ? Number(params.marca_id) : undefined,
    genero_id: params.genero_id ? Number(params.genero_id) : undefined,
    tipo_prenda_id: params.tipo_prenda_id ? Number(params.tipo_prenda_id) : undefined,
    ordenar_por: (params.ordenar_por as any) || 'recientes_con_foto',
    page: params.page ? Number(params.page) : 1,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo Web & Publicación</h1>
        <p className="text-muted-foreground">
          Administra la visibilidad, estado y orden de los productos en tu tienda e-commerce.
        </p>
      </div>

      {/* Zona A: Filtros persistentes (fuera de Suspense, no pierden foco) */}
      <ProductosWebFilters
        marcas={catalogos.marcas || []}
        generos={catalogos.generos || []}
        tiposPrenda={catalogos.tipos_prenda || []}
      />

      {/* Zona B: Tabla de resultados con streaming */}
      <Suspense fallback={<TableSkeleton />}>
        <ProductosWebResults filtros={filtros} />
      </Suspense>
    </div>
  )
}
