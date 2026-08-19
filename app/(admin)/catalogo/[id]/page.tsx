// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\catalogo\[id]\page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  fetchProductoPorId,
  fetchCatalogosHero,
  resolveFKDescriptivas,
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
  fetchStockProductoPorBodegas,
} from '@/modules/catalogo/queries'
import type { CatalogosEdicion, FKDescriptivas } from '@/modules/catalogo/types'
import type { ProductoRow } from '@/lib/types/tables'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TabSkeleton } from '@/components/admin/PageSkeleton'
import { HeroProducto } from './components/HeroProducto'
import { ProductoNavigation } from './components/ProductoNavigation'
import { CatalogoDetailActions } from './components/CatalogoDetailActions'
import { TabStock } from './components/TabStock'
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
import { requireCatalogReadPermission } from '@/lib/dal'
import { can, canEditCatalog } from '@/lib/auth/permissions'

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: rawId } = await props.params
  const id = Number.parseInt(rawId, 10)
  if (Number.isNaN(id)) return { title: 'Producto no encontrado' }

  const producto = await fetchProductoPorId(id)
  if (!producto) return { title: 'Producto no encontrado' }

  return { title: `${producto.sku_base} — Catálogo` }
}

export default async function CatalogoDetallePage(props: {
  params: Promise<{ id: string }>
}) {
  const session = await requireCatalogReadPermission()
  const user = session.user
  const canEdit = canEditCatalog(user)
  const hasFullCatalogAccess = can(user, 'catalogo_productos', 'puede_leer')
  const backHref = hasFullCatalogAccess ? '/catalogo' : '/catalogo/catalogos'

  const { id: rawId } = await props.params
  const id = Number.parseInt(rawId, 10)
  if (Number.isNaN(id)) notFound()

  // Solo el producto base bloquea la decisión de 404. El resto se inicia en paralelo.
  const producto = await fetchProductoPorId(id)
  if (!producto) notFound()

  const [catalogosHero, navegacion, imagenes] = await Promise.all([
    fetchCatalogosHero(),
    fetchNavegacionProducto(producto.id),
    fetchImagenesProducto(producto.id),
  ])
  const fk = await resolveFKDescriptivas(producto, catalogosHero)
  const catalogosEdicionPromise = fetchCatalogosEdicion()
  const cajasPromise = fetchCajasProducto(producto.id)
  const stockPromise = fetchStockProductoPorBodegas(producto.id)
  const imagenesPromise = Promise.resolve(imagenes)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={backHref} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Catálogo
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium font-mono">{producto.sku_base}</span>
        </div>

        <div className="flex items-center gap-2">
          {navegacion && <ProductoNavigation navegacion={navegacion} />}
          <CatalogoDetailActions productoId={producto.id} catalogos={catalogosHero} canEdit={canEdit} />
        </div>
      </div>

      <Suspense fallback={<TabSkeleton rows={5} />}>
        <HeroProducto
          producto={producto}
          fk={fk}
          imagenPrincipal={imagenes.find((item) => item.es_principal)?.url ?? imagenes[0]?.url ?? null}
          catalogos={catalogosHero}
          canEdit={canEdit}
        />
      </Suspense>

      <Suspense fallback={<TabSkeleton rows={6} />}>
        <CatalogoTabsAsync
          producto={producto}
          fk={fk}
          userCanEdit={canEdit}
          canEditCajas={Boolean(canEdit && can(user, 'b2b_cajas', 'puede_editar'))}
          canDeleteCajas={Boolean(canEdit && can(user, 'b2b_cajas', 'puede_eliminar'))}
          catalogosPromise={catalogosEdicionPromise}
          imagenesPromise={imagenesPromise}
          cajasPromise={cajasPromise}
          stockPromise={stockPromise}
        />
      </Suspense>

      <Separator />
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>Creado: <Fecha valor={producto.created_at} formato="fecha-hora" /></span>
        <span>Actualizado: <Fecha valor={producto.updated_at} formato="relativo" /></span>
      </div>
    </div>
  )
}

async function CatalogoTabsAsync({
  producto,
  fk,
  userCanEdit,
  canEditCajas,
  canDeleteCajas,
  catalogosPromise,
  imagenesPromise,
  cajasPromise,
  stockPromise,
}: {
  producto: ProductoRow
  fk: FKDescriptivas
  userCanEdit: boolean
  canEditCajas: boolean
  canDeleteCajas: boolean
  catalogosPromise: Promise<CatalogosEdicion>
  imagenesPromise: ReturnType<typeof fetchImagenesProducto>
  cajasPromise: ReturnType<typeof fetchCajasProducto>
  stockPromise: ReturnType<typeof fetchStockProductoPorBodegas>
}) {
  const catalogos = await catalogosPromise

  return (
    <>
      <Suspense fallback={<TabSkeleton rows={3} />}>
        <TabEcommerceAsync
          productoId={producto.id}
          estado={producto.estado ?? 'borrador'}
          skuBase={producto.sku_base}
          tipoPrenda={fk.tipo_prenda}
          genero={fk.genero}
          marca={fk.marca}
          canEdit={userCanEdit}
        />
      </Suspense>

      <Separator />

      <Tabs defaultValue="imagenes" className="flex-col">
        <TabsList className="flex-wrap h-auto group-data-[orientation=horizontal]/tabs:h-auto gap-1 mb-4 p-1">
          <TabsTrigger value="imagenes">Imágenes</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="cajas">Cajas</TabsTrigger>
          <TabsTrigger value="variantes">Variantes</TabsTrigger>
          <TabsTrigger value="medidas">Medidas</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="complementos">Complementos</TabsTrigger>
          <TabsTrigger value="acabados">Acabados</TabsTrigger>
          {producto.es_conjunto && <TabsTrigger value="conjunto">Conjunto</TabsTrigger>}
        </TabsList>

        <TabsContent value="imagenes">
          <Suspense fallback={<TabSkeleton />}>
            <TabImagenesAsync
              productoId={producto.id}
              skuBase={producto.sku_base}
              canEdit={userCanEdit}
              imagenesPromise={imagenesPromise}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="stock">
          <Suspense fallback={<TabSkeleton />}>
            <TabStockAsync
              productoId={producto.id}
              skuBase={producto.sku_base}
              pzEnCaja={producto.pz_en_caja}
              stockPromise={stockPromise}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="cajas">
          <Suspense fallback={<TabSkeleton />}>
            <TabCajasAsync
              productoId={producto.id}
              catalogos={catalogos}
              edadNombre={fk.edad}
              precioEcMxn={producto.precio_ec}
              canEdit={canEditCajas}
              canDelete={canDeleteCajas}
              cajasPromise={cajasPromise}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="variantes">
          <Suspense fallback={<TabSkeleton />}>
            <TabVariantesAsync
              productoId={producto.id}
              skuBase={producto.sku_base}
              catalogos={catalogos}
              canEdit={userCanEdit}
              cajasPromise={cajasPromise}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="medidas">
          <Suspense fallback={<TabSkeleton />}>
            <TabMedidasAsync
              productoId={producto.id}
              edadNombre={fk.edad}
              tipoPrendaNombre={fk.tipo_prenda}
              canEdit={userCanEdit}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="tags">
          <Suspense fallback={<TabSkeleton />}>
            <TabTagsAsync productoId={producto.id} catalogos={catalogos} canEdit={userCanEdit} />
          </Suspense>
        </TabsContent>

        <TabsContent value="complementos">
          <Suspense fallback={<TabSkeleton />}>
            <TabComplementosAsync productoId={producto.id} catalogos={catalogos} canEdit={userCanEdit} />
          </Suspense>
        </TabsContent>

        <TabsContent value="acabados">
          <Suspense fallback={<TabSkeleton />}>
            <TabAcabadosAsync productoId={producto.id} catalogos={catalogos} canEdit={userCanEdit} />
          </Suspense>
        </TabsContent>

        {producto.es_conjunto && (
          <TabsContent value="conjunto">
            <Suspense fallback={<TabSkeleton />}>
              <TabConjuntoAsync productoId={producto.id} canEdit={userCanEdit} />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </>
  )
}

async function TabEcommerceAsync({
  productoId,
  estado,
  skuBase,
  tipoPrenda,
  genero,
  marca,
  canEdit,
}: {
  productoId: number
  estado: string
  skuBase: string
  tipoPrenda: string | null
  genero: string | null
  marca: string | null
  canEdit: boolean
}) {
  const web = await fetchProductoWeb(productoId)
  return <TabEcommerce web={web} productoId={productoId} estado={estado} skuBase={skuBase} tipoPrenda={tipoPrenda} genero={genero} marca={marca} canEdit={canEdit} />
}

async function TabImagenesAsync({
  productoId,
  skuBase,
  canEdit,
  imagenesPromise,
}: {
  productoId: number
  skuBase: string
  canEdit: boolean
  imagenesPromise: ReturnType<typeof fetchImagenesProducto>
}) {
  const imagenes = await imagenesPromise
  return <TabImagenes imagenes={imagenes} productoId={productoId} skuBase={skuBase} canEdit={canEdit} />
}

async function TabStockAsync({
  productoId,
  skuBase,
  pzEnCaja,
  stockPromise,
}: {
  productoId: number
  skuBase: string
  pzEnCaja?: number | null
  stockPromise: ReturnType<typeof fetchStockProductoPorBodegas>
}) {
  return (
    <TabStock
      productoId={productoId}
      skuBase={skuBase}
      pzEnCaja={pzEnCaja}
      stockPromise={stockPromise}
    />
  )
}

async function TabCajasAsync({
  productoId,
  catalogos,
  edadNombre,
  precioEcMxn,
  canEdit,
  canDelete,
  cajasPromise,
}: {
  productoId: number
  catalogos: CatalogosEdicion
  edadNombre: string | null
  precioEcMxn: number | null
  canEdit: boolean
  canDelete: boolean
  cajasPromise: ReturnType<typeof fetchCajasProducto>
}) {
  const cajas = await cajasPromise
  return <TabCajas cajas={cajas} productoId={productoId} tallasDisponibles={catalogos.tallas} coloresDisponibles={catalogos.colores} edadNombre={edadNombre} canEdit={canEdit} canDelete={canDelete} precioEcMxn={precioEcMxn} />
}

async function TabTagsAsync({ productoId, catalogos, canEdit }: { productoId: number; catalogos: CatalogosEdicion; canEdit: boolean }) {
  const tags = await fetchTagsProducto(productoId)
  return <TabTags tags={tags} productoId={productoId} catalogos={catalogos} canEdit={canEdit} />
}

async function TabComplementosAsync({ productoId, catalogos, canEdit }: { productoId: number; catalogos: CatalogosEdicion; canEdit: boolean }) {
  const complementos = await fetchComplementosProducto(productoId)
  return <TabComplementos complementos={complementos} productoId={productoId} catalogos={catalogos} canEdit={canEdit} />
}

async function TabAcabadosAsync({ productoId, catalogos, canEdit }: { productoId: number; catalogos: CatalogosEdicion; canEdit: boolean }) {
  const acabados = await fetchAcabadosProducto(productoId)
  return <TabAcabados acabados={acabados} productoId={productoId} catalogos={catalogos} canEdit={canEdit} />
}

async function TabVariantesAsync({ productoId, skuBase, catalogos, canEdit, cajasPromise }: { productoId: number; skuBase: string; catalogos: CatalogosEdicion; canEdit: boolean; cajasPromise: ReturnType<typeof fetchCajasProducto> }) {
  const [variantes, cajas] = await Promise.all([fetchVariantesProducto(productoId), cajasPromise])
  const cajaPrincipal = cajas.find((caja) => caja.es_principal) ?? null
  return <TabVariantes variantes={variantes} productoId={productoId} skuBase={skuBase} catalogos={catalogos} cajaPrincipal={cajaPrincipal} canEdit={canEdit} />
}

async function TabMedidasAsync({ productoId, edadNombre, tipoPrendaNombre, canEdit }: { productoId: number; edadNombre: string | null; tipoPrendaNombre?: string | null; canEdit: boolean }) {
  const [medidas, puntosMedida] = await Promise.all([fetchMedidasProducto(productoId), fetchPuntosMedida()])
  return <TabMedidas medidas={medidas} puntosCat={puntosMedida} productoId={productoId} edadNombre={edadNombre} tipoPrendaNombre={tipoPrendaNombre} canEdit={canEdit} />
}

async function TabConjuntoAsync({ productoId, canEdit }: { productoId: number; canEdit: boolean }) {
  const conjunto = await fetchConjuntoProducto(productoId)
  return <TabConjunto conjunto={conjunto} productoId={productoId} canEdit={canEdit} />
}
