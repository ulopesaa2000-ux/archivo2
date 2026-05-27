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
  fetchCatalogosEdicion,
  fetchPuntosMedida,
} from '@/modules/catalogo/queries'
import type { CatalogosEdicion } from '@/modules/catalogo/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TabSkeleton } from '@/components/admin/PageSkeleton'
import { HeroProducto } from './components/HeroProducto'
import { ProductoNavigation } from './components/ProductoNavigation'
import { CatalogoDetailActions } from './components/CatalogoDetailActions'
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
import { requirePermission } from '@/lib/dal'
import { getCurrentUser } from '@/modules/auth/queries'
import { can } from '@/lib/auth/permissions'

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
  await requirePermission('catalogo_productos')
  const user = await getCurrentUser()

  const params = await props.params;
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  // ── Query rápida: producto base ───────────────────────────
  const producto = await fetchProductoPorId(id)
  if (!producto) notFound()

  // ── Queries en paralelo para el hero ──────────────────────
  const [fk, navegacion, imagenes, catalogos] = await Promise.all([
    fetchFKDescriptivas(producto),
    fetchNavegacionProducto(producto.id),
    fetchImagenesProducto(producto.id),
    fetchCatalogosEdicion(),
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

        <div className="flex items-center gap-2">
          {navegacion && (
            <ProductoNavigation navegacion={navegacion} />
          )}
          {Boolean(user && can(user, 'catalogo_productos', 'puede_crear')) && (
            <CatalogoDetailActions productoId={producto.id} catalogos={catalogos} />
          )}
        </div>
      </div>

      {/* ── Hero del producto ────────────────────────────── */}
      <HeroProducto
        producto={producto}
        fk={fk}
        imagenPrincipal={imagenPrincipal}
        catalogos={catalogos}
      />

      {/* ── Bloque E-commerce/SEO (desplegable) ───────────────── */}
      <Suspense fallback={<TabSkeleton rows={3} />}>
        <TabEcommerceAsync
          productoId={producto.id}
          estado={producto.estado ?? 'borrador'}
          skuBase={producto.sku_base}
          tipoPrenda={fk.tipo_prenda}
          genero={fk.genero}
          marca={fk.marca}
        />
      </Suspense>

      <Separator />

      {/* ── Tabs de contenido ────────────────────────────── */}
      <Tabs defaultValue="catalogos" className="flex-col">
        <TabsList className="flex-wrap h-auto group-data-[orientation=horizontal]/tabs:h-auto gap-1 mb-4 p-1">
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
            <TabImagenesAsync productoId={producto.id} skuBase={producto.sku_base} />
          </Suspense>
        </TabsContent>

        <TabsContent value="cajas">
          <Suspense fallback={<TabSkeleton />}>
            <TabCajasAsync
              productoId={producto.id}
              catalogos={catalogos}
              edadNombre={fk.edad}
              canEdit={Boolean(user && can(user, 'b2b_cajas', 'puede_editar'))}
              canDelete={Boolean(user && can(user, 'b2b_cajas', 'puede_eliminar'))}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="tags">
          <Suspense fallback={<TabSkeleton />}>
            <TabTagsAsync productoId={producto.id} catalogos={catalogos} />
          </Suspense>
        </TabsContent>

        <TabsContent value="complementos">
          <Suspense fallback={<TabSkeleton />}>
            <TabComplementosAsync productoId={producto.id} catalogos={catalogos} />
          </Suspense>
        </TabsContent>

        <TabsContent value="acabados">
          <Suspense fallback={<TabSkeleton />}>
            <TabAcabadosAsync productoId={producto.id} catalogos={catalogos} />
          </Suspense>
        </TabsContent>

        <TabsContent value="variantes">
          <Suspense fallback={<TabSkeleton />}>
            <TabVariantesAsync
              productoId={producto.id}
              skuBase={producto.sku_base}
              catalogos={catalogos}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="medidas">
          <Suspense fallback={<TabSkeleton />}>
            <TabMedidasAsync productoId={producto.id} edadNombre={fk.edad} tipoPrendaNombre={fk.tipo_prenda} />
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

async function TabEcommerceAsync({
  productoId,
  estado,
  skuBase,
  tipoPrenda,
  genero,
  marca,
}: {
  productoId: number
  estado: string
  skuBase: string
  tipoPrenda: string | null
  genero: string | null
  marca: string | null
}) {
  const web = await fetchProductoWeb(productoId)
  return (
    <TabEcommerce
      web={web}
      productoId={productoId}
      estado={estado}
      skuBase={skuBase}
      tipoPrenda={tipoPrenda}
      genero={genero}
      marca={marca}
    />
  )
}

async function TabImagenesAsync({
  productoId,
  skuBase,
}: {
  productoId: number
  skuBase: string
}) {
  const imagenes = await fetchImagenesProducto(productoId)
  return <TabImagenes imagenes={imagenes} productoId={productoId} skuBase={skuBase} />
}

async function TabCajasAsync({
  productoId,
  catalogos,
  edadNombre,
  canEdit,
  canDelete,
}: {
  productoId: number
  catalogos: CatalogosEdicion
  edadNombre: string | null
  canEdit: boolean
  canDelete: boolean
}) {
  const cajas = await fetchCajasProducto(productoId)
  return (
    <TabCajas
      cajas={cajas}
      productoId={productoId}
      tallasDisponibles={catalogos.tallas}
      coloresDisponibles={catalogos.colores}
      edadNombre={edadNombre}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  )
}

async function TabTagsAsync({
  productoId,
  catalogos,
}: {
  productoId: number
  catalogos: CatalogosEdicion
}) {
  const tags = await fetchTagsProducto(productoId)
  return <TabTags tags={tags} productoId={productoId} catalogos={catalogos} />
}

async function TabComplementosAsync({
  productoId,
  catalogos,
}: {
  productoId: number
  catalogos: CatalogosEdicion
}) {
  const complementos = await fetchComplementosProducto(productoId)
  return (
    <TabComplementos
      complementos={complementos}
      productoId={productoId}
      catalogos={catalogos}
    />
  )
}

async function TabAcabadosAsync({
  productoId,
  catalogos,
}: {
  productoId: number
  catalogos: CatalogosEdicion
}) {
  const acabados = await fetchAcabadosProducto(productoId)
  return (
    <TabAcabados
      acabados={acabados}
      productoId={productoId}
      catalogos={catalogos}
    />
  )
}

async function TabVariantesAsync({
  productoId,
  skuBase,
  catalogos,
}: {
  productoId: number
  skuBase: string
  catalogos: CatalogosEdicion
}) {
  const [variantes, cajas] = await Promise.all([
    fetchVariantesProducto(productoId),
    fetchCajasProducto(productoId),
  ])
  const cajaPrincipal = cajas.find(c => c.es_principal) ?? null
  return (
    <TabVariantes
      variantes={variantes}
      productoId={productoId}
      skuBase={skuBase}
      catalogos={catalogos}
      cajaPrincipal={cajaPrincipal}
    />
  )
}

async function TabMedidasAsync({ productoId, edadNombre, tipoPrendaNombre }: { productoId: number; edadNombre: string | null; tipoPrendaNombre?: string | null }) {
  const [medidas, puntosMedida] = await Promise.all([
    fetchMedidasProducto(productoId),
    fetchPuntosMedida(),
  ])
  return <TabMedidas medidas={medidas} puntosCat={puntosMedida} productoId={productoId} edadNombre={edadNombre} tipoPrendaNombre={tipoPrendaNombre} />
}

async function TabConjuntoAsync({ productoId }: { productoId: number }) {
  const conjunto = await fetchConjuntoProducto(productoId)
  return <TabConjunto conjunto={conjunto} productoId={productoId} />
}
