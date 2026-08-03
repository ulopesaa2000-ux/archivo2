// app/(admin)/ecommerce/config/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ConfigForm } from '@/components/admin/ecommerce/ConfigForm'
import { CategoryBannersManager } from '@/components/admin/ecommerce/CategoryBannersManager'
import { fetchConfigEcommerce } from '@/modules/ecommerce/queries'
import { fetchBannersCategorias } from '@/modules/ecommerce/banners'
import { fetchCatalogosParaFiltros } from '@/modules/catalogo/queries'

export const metadata: Metadata = {
  title: 'Configuración Ecommerce & Banners',
}

async function ConfigContentSection() {
  const supabase = await createClient()

  const [config, banners, catalogos, { data: productosData }] = await Promise.all([
    fetchConfigEcommerce(),
    fetchBannersCategorias(),
    fetchCatalogosParaFiltros(),
    supabase
      .from('productos')
      .select('id, nombre, sku_base')
      .eq('activo', true)
      .order('sku_base', { ascending: true }),
  ])

  const generos = catalogos.marcas ? catalogos.marcas.map(m => ({ id: m.id, nombre: m.nombre })) : [] // fallback placeholder
  
  // Obtenemos los géneros reales
  const { data: generosData } = await supabase
    .from('cat_generos')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  // Obtenemos los tipos de prenda reales
  const { data: tiposPrendaData } = await supabase
    .from('cat_tipo_prenda')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  return (
    <div className="space-y-8">
      {/* Formulario de Configuración General de la Tienda */}
      <ConfigForm config={config || undefined} />

      {/* Administrador de Banners Promocionales de Categoría */}
      <CategoryBannersManager
        banners={banners}
        generos={generosData || []}
        tiposPrenda={tiposPrendaData || []}
        productos={(productosData || []).map(p => ({
          id: p.id,
          nombre: p.nombre || p.sku_base,
          sku_base: p.sku_base,
        }))}
      />
    </div>
  )
}

function ConfigFormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border p-6 space-y-4">
          <div className="h-5 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded bg-muted animate-pulse" />
          <div className="space-y-3 pt-2">
            <div className="h-10 rounded bg-muted animate-pulse" />
            <div className="h-10 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function EcommerceConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración Ecommerce & Banners</h1>
        <p className="text-muted-foreground">
          Configura el comportamiento de la tienda online y administra los banners promocionales de categorías.
        </p>
      </div>

      <Suspense fallback={<ConfigFormSkeleton />}>
        <ConfigContentSection />
      </Suspense>
    </div>
  )
}
