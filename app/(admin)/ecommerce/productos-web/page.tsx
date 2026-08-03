// app/(admin)/ecommerce/productos-web/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
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
    marca_id?: string
    genero_id?: string
    tipo_prenda_id?: string
    ordenar_por?: string
    page?: string
  }>
}

async function ProductosWebSection({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const filtros: FiltrosProductoWeb = {
    q: params.q,
    estado_web: params.estado_web as any,
    tiene_foto: params.tiene_foto as any,
    marca_id: params.marca_id ? Number(params.marca_id) : undefined,
    genero_id: params.genero_id ? Number(params.genero_id) : undefined,
    tipo_prenda_id: params.tipo_prenda_id ? Number(params.tipo_prenda_id) : undefined,
    ordenar_por: (params.ordenar_por as any) || 'recientes_con_foto',
    page: params.page ? Number(params.page) : 1,
  }

  const [
    { productos, total },
    { data: marcasData },
    { data: generosData },
    { data: tiposPrendaData },
  ] = await Promise.all([
    fetchProductosWebAdmin(filtros),
    supabase.from('cat_marcas').select('id, nombre').eq('activo', true).order('nombre', { ascending: true }),
    supabase.from('cat_generos').select('id, nombre').eq('activo', true).order('nombre', { ascending: true }),
    supabase.from('cat_tipo_prenda').select('id, nombre').eq('activo', true).order('nombre', { ascending: true }),
  ])

  return (
    <div className="space-y-6">
      {/* Zona A: Filtros persistentes */}
      <ProductosWebFilters
        marcas={marcasData || []}
        generos={generosData || []}
        tiposPrenda={tiposPrendaData || []}
      />

      {/* Contador y Estado */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Mostrando <strong className="text-foreground">{productos.length}</strong> de <strong className="text-foreground">{total}</strong> productos registrados
        </span>
        <span className="italic">
          Orden por defecto: <strong>Con foto primero + Más recientes</strong>
        </span>
      </div>

      {/* Zona B: Tabla de Productos */}
      <ProductosWebTable productos={productos} total={total} />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-20 bg-muted animate-pulse rounded-xl" />
      <div className="h-96 bg-muted animate-pulse rounded-xl" />
    </div>
  )
}

export default function ProductosWebPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo Web & Publicación</h1>
        <p className="text-muted-foreground">
          Administra la visibilidad, estado y orden de los productos en tu tienda e-commerce.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <ProductosWebSection searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
