// app/(admin)/catalogo/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  fetchProductoPorId,
  fetchFKDescriptivas,
  fetchNavegacionProducto,
  fetchProductoWeb,
  fetchImagenesProducto,
  fetchCajasProducto,
  fetchTagsProducto,
  fetchComplementosProducto,
  fetchAcabadosProducto,
  fetchVariantesProducto,
  fetchMedidasProducto,
  fetchConjuntoProducto,
} from '@/modules/catalogo/queries'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TabSkeleton } from '@/components/admin/PageSkeleton'
import { HeroProducto } from './components/HeroProducto'
import { ProductoNavigation } from './components/ProductoNavigation'
import { TabCatalogos } from './components/TabCatalogos'
import { TabEcommerce } from './components/TabEcommerce'
import { TabImagenes } from './components/TabImagenes'
import { TabCajas } from './components/TabCajas'
import { TabTags } from './components/TabTags'
import { TabComplementos } from './components/TabComplementos'
import { TabAcabados } from './components/TabAcabados'
import { TabVariantes } from './components/TabVariantes'
import { TabMedidas } from './components/TabMedidas'
import { TabConjunto } from './components/TabConjunto'
import { Fecha } from '@/components/shared/Fecha'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const params = await props.params;
  const id = parseInt(params.id)
  if (isNaN(id)) return { title: 'Producto no encontrado' }

  const producto = await fetchProductoPorId(id)
  if (!producto) return { title: 'Producto no encontrado' }

  return {
    title: `${producto.sku_base} — Catálogo`,
  }
}

/**
 * Detalle de producto con STREAMING.
 * 
 * FLUJO DE CARGA PROGRESIVA:
 *   0ms:    loading.tsx → skeleton completo
 *   ~50ms:  Hero se resuelve (1 query rápida) → aparece con datos
 *   ~200ms: FK descriptivas y navegación se resuelven
 *   ~300ms: Tabs empiezan a resolverse independientemente
 *   ~500ms: Todos los tabs listos
 * 
 * Cada tab es un async Server Component en <Suspense>.
 * Los tabs que no están activos cargan en background.
 */
export default async function CatalogoDetallePage(props: {
  params: Promise<{ id: string }>
}) {
  const params = await props.params;
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  // ── Query rápida: producto base ───────────────────────────
  const producto = await fetchProductoPorId(id)
  if (!producto) notFound()

  // ── Queries en paralelo para el hero ──────────────────────
  const [fk, navegacion, imagenes] = await Promise.all([
    fetchFKDescriptivas(producto),
    fetchNavegacionProducto(producto.id),
    fetchImagenesProducto(producto.id),
  ])

  const imagenPrincipal = imagenes.find((i) => i.es_principal)?.url
    ?? imagenes[0]?.url
    ?? null

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb + Navegación ──────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/catalogo"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Catálogo
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium font-mono">
            {producto.sku_base}
          </span>
        </div>

        {navegacion && (
          <ProductoNavigation navegacion={navegacion} />
        )}
      </div>

      {/* ── Hero del producto ────────────────────────────── */}
      <HeroProducto
        producto={producto}
        fk={fk}
        imagenPrincipal={imagenPrincipal}
      />

      {/* ── Bloque E-commerce/SEO (desplegable) ─────────── */}
      <Suspense fallback={<TabSkeleton rows={3} />}>
        <TabEcommerceAsync productoId={producto.id} />
      </Suspense>

      <Separator />

      {/* ── Tabs de contenido ────────────────────────────── */}
      <Tabs defaultValue="catalogos" className="flex-col">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="catalogos">Catálogos</TabsTrigger>
          <TabsTrigger value="imagenes">Imágenes</TabsTrigger>
          <TabsTrigger value="cajas">Cajas</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="complementos">Complementos</TabsTrigger>
          <TabsTrigger value="acabados">Acabados</TabsTrigger>
          <TabsTrigger value="variantes">Variantes</TabsTrigger>
          <TabsTrigger value="medidas">Medidas</TabsTrigger>
          {producto.es_conjunto && (
            <TabsTrigger value="conjunto">Conjunto</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="catalogos">
          <TabCatalogos fk={fk} />
        </TabsContent>

        <TabsContent value="imagenes">
          <Suspense fallback={<TabSkeleton />}>
            <TabImagenesAsync productoId={producto.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="cajas">
          <Suspense fallback={<TabSkeleton />}>
            <TabCajasAsync productoId={producto.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="tags">
          <Suspense fallback={<TabSkeleton />}>
            <TabTagsAsync productoId={producto.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="complementos">
          <Suspense fallback={<TabSkeleton />}>
            <TabComplementosAsync productoId={producto.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="acabados">
          <Suspense fallback={<TabSkeleton />}>
            <TabAcabadosAsync productoId={producto.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="variantes">
          <Suspense fallback={<TabSkeleton />}>
            <TabVariantesAsync productoId={producto.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="medidas">
          <Suspense fallback={<TabSkeleton />}>
            <TabMedidasAsync productoId={producto.id} />
          </Suspense>
        </TabsContent>

        {producto.es_conjunto && (
          <TabsContent value="conjunto">
            <Suspense fallback={<TabSkeleton />}>
              <TabConjuntoAsync productoId={producto.id} />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Footer con fechas ────────────────────────────── */}
      <Separator />
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>Creado: <Fecha valor={producto.created_at} formato="fecha-hora" /></span>
        <span>Actualizado: <Fecha valor={producto.updated_at} formato="relativo" /></span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ASYNC WRAPPERS — Cada uno hace su propia query independiente
// y se resuelve dentro de su propio <Suspense>
// ═══════════════════════════════════════════════════════════════

async function TabEcommerceAsync({ productoId }: { productoId: number }) {
  const web = await fetchProductoWeb(productoId)
  return <TabEcommerce web={web} />
}

async function TabImagenesAsync({ productoId }: { productoId: number }) {
  const imagenes = await fetchImagenesProducto(productoId)
  return <TabImagenes imagenes={imagenes} />
}

async function TabCajasAsync({ productoId }: { productoId: number }) {
  const cajas = await fetchCajasProducto(productoId)
  return <TabCajas cajas={cajas} />
}

async function TabTagsAsync({ productoId }: { productoId: number }) {
  const tags = await fetchTagsProducto(productoId)
  return <TabTags tags={tags} />
}

async function TabComplementosAsync({ productoId }: { productoId: number }) {
  const complementos = await fetchComplementosProducto(productoId)
  return <TabComplementos complementos={complementos} />
}

async function TabAcabadosAsync({ productoId }: { productoId: number }) {
  const acabados = await fetchAcabadosProducto(productoId)
  return <TabAcabados acabados={acabados} />
}

async function TabVariantesAsync({ productoId }: { productoId: number }) {
  const variantes = await fetchVariantesProducto(productoId)
  return <TabVariantes variantes={variantes} />
}

async function TabMedidasAsync({ productoId }: { productoId: number }) {
  const medidas = await fetchMedidasProducto(productoId)
  return <TabMedidas medidas={medidas} />
}

async function TabConjuntoAsync({ productoId }: { productoId: number }) {
  const conjunto = await fetchConjuntoProducto(productoId)
  return <TabConjunto conjunto={conjunto} />
}
