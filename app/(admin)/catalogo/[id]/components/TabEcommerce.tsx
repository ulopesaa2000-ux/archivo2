// app/(admin)/catalogo/[id]/components/TabEcommerce.tsx
'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductoWebRow } from '@/lib/types/tables'
import { formatCurrency } from '@/lib/utils'
import { generarSlugProducto } from '@/lib/utils/slug'
import { Fecha } from '@/components/shared/Fecha'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Globe, ChevronDown, Pencil, Save, X, Loader2, AlertCircle, Plus, Zap,
} from 'lucide-react'
import {
  updateProductoWebAction,
  createProductoWebAction,
  cambiarEstadoProductoAction,
} from '@/modules/catalogo/actions'

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const UNIDADES_VENTA = ['pieza', 'par', 'set', 'caja', 'docena']
const MODOS_OVERRIDE = ['default', 'manual', 'oferta', 'sin_stock']

/** Estados donde puede aparecer el switch rápido de publicación */
const ESTADOS_PUBLICABLES = ['borrador', 'pendiente']

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
type Props = {
  web: ProductoWebRow | null
  productoId: number
  estado: string
  skuBase: string
  tipoPrenda: string | null
  genero: string | null
  marca: string | null
  canEdit?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Reutilizable: formulario de campos web (usado en CREATE y EDIT)
// ─────────────────────────────────────────────────────────────────────────────
function WebFormFields({ web }: { web?: ProductoWebRow | null }) {
  return (
    <>
      {/* Precios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Precio público ($) *</Label>
          <Input
            type="number" step="0.01" name="precio_publico"
            defaultValue={web?.precio_publico ?? ''} required
            className="h-9 tabular-nums"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Precio oferta ($)</Label>
          <Input
            type="number" step="0.01" name="precio_oferta"
            defaultValue={web?.precio_oferta ?? ''}
            className="h-9 tabular-nums"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Orden display</Label>
          <Input
            type="number" name="orden_display"
            defaultValue={web?.orden_display ?? 0}
            className="h-9 tabular-nums"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unidad de venta</Label>
          <Select name="unidad_venta" defaultValue={web?.unidad_venta ?? 'pieza'}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNIDADES_VENTA.map((u) => (
                <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Modo override */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Modo override</Label>
          <Select name="modo_override" defaultValue={web?.modo_override ?? 'default'}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODOS_OVERRIDE.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Flags */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Visibilidad y flags</Label>
        <div className="flex flex-wrap gap-5">
          {([
            { name: 'activo',               label: 'Publicado',            checked: web?.activo ?? true },
            { name: 'destacado',             label: 'Destacado',            checked: web?.destacado ?? false },
            { name: 'nuevo',                 label: 'Nuevo',                checked: web?.nuevo ?? false },
            { name: 'en_oferta',             label: 'En oferta',            checked: web?.en_oferta ?? false },
            { name: 'precio_negociable',     label: 'Precio negociable',    checked: web?.precio_negociable ?? false },
            { name: 'disponible_mayorista',  label: 'Disponible mayorista', checked: web?.disponible_mayorista ?? true },
          ] as const).map(({ name, label, checked }) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox name={name} defaultChecked={Boolean(checked)} value="true" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* SEO */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">SEO</Label>
        <div className="space-y-1">
          <Label className="text-xs">Título SEO</Label>
          <Input
            name="titulo_seo" defaultValue={web?.titulo_seo ?? ''}
            className="h-9" placeholder="Título para buscadores (máx 60 chars)"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Descripción SEO</Label>
          <Textarea
            name="descripcion_seo" defaultValue={web?.descripcion_seo ?? ''}
            rows={2} className="resize-none text-sm"
            placeholder="Descripción para buscadores (máx 160 chars)"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Keywords</Label>
          <Input
            name="keywords" defaultValue={web?.keywords ?? ''}
            className="h-9" placeholder="chamarra, invierno, hombre"
          />
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export function TabEcommerce({ web, productoId, estado, skuBase, tipoPrenda, genero, marca, canEdit = true }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Modo edición (cuando hay registro web)
  const [isEditing, setIsEditing] = useState(false)
  // Modo creación (cuando NO hay registro web y el usuario activa el switch/botón)
  const [isCreating, setIsCreating] = useState(false)
  // Estado local del switch de publicación
  const [publishPending, startPublishTransition] = useTransition()

  // ── Derivados ──────────────────────────────────────────────────
  const esPublicado = estado === 'publicado'
  const puedePublicar = ESTADOS_PUBLICABLES.includes(estado)

  const slugGenerado = useMemo(
    () => generarSlugProducto({ sku_base: skuBase, tipo_prenda: tipoPrenda, genero, marca }),
    [skuBase, tipoPrenda, genero, marca]
  )

  // ── Cambiar estado rápido (switch) ───────────────────────────
  const handlePublishToggle = (checked: boolean) => {
    if (!checked) return // solo permitir activar, no desactivar desde aquí
    startPublishTransition(async () => {
      const result = await cambiarEstadoProductoAction(productoId, 'publicado')
      if (!result.success) { setError(result.error ?? 'Error al publicar.'); return }
      // Si no hay web data, abrimos el create form automáticamente
      if (!web) setIsCreating(true)
      router.refresh()
    })
  }

  // ── Guardar registro NUEVO ────────────────────────────────────
  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('producto_id', String(productoId))
    fd.set('slug', slugGenerado)
    ;(['activo', 'destacado', 'nuevo', 'en_oferta', 'precio_negociable', 'disponible_mayorista'] as const).forEach((k) => {
      if (!fd.has(k)) fd.set(k, 'false')
    })
    startTransition(async () => {
      const result = await createProductoWebAction(fd)
      if (!result.success) { setError(result.error ?? 'Error al crear.'); return }
      setIsCreating(false)
      router.refresh()
    })
  }

  // ── Guardar registro EXISTENTE ─────────────────────────────────
  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('producto_id', String(productoId))
    ;(['activo', 'destacado', 'nuevo', 'en_oferta', 'precio_negociable', 'disponible_mayorista'] as const).forEach((k) => {
      if (!fd.has(k)) fd.set(k, 'false')
    })
    startTransition(async () => {
      const result = await updateProductoWebAction(fd)
      if (!result.success) { setError(result.error ?? 'Error al guardar.'); return }
      setIsEditing(false)
      router.refresh()
    })
  }

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <details
      className="group border rounded-lg p-2 mb-4"
      open={isCreating || isEditing}
    >
      {/* ── Summary / Header ────────────────────────────────── */}
      <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium py-2 hover:text-primary list-none [&::-webkit-details-marker]:hidden">
        <Globe className="h-4 w-4 shrink-0" />
        <span>E-commerce / SEO</span>

        {/* Badge de estado */}
        {web ? (
          <Badge variant="outline" className="ml-2 text-[10px]">
            {web.activo ? 'Publicado' : 'No publicado'}
          </Badge>
        ) : (
          <Badge variant="secondary" className="ml-2 text-[10px]">Sin registro</Badge>
        )}

        {/* ── Switch rápido (borrador | pendiente → publicado) ── */}
        {canEdit && puedePublicar && !web && (
          <span
            className="ml-3 flex items-center gap-1.5 text-xs text-muted-foreground"
            onClick={(e) => e.preventDefault()}
          >
            <Zap className="h-3 w-3 text-amber-500" />
            Publicar
            <Switch
              checked={false}
              onCheckedChange={handlePublishToggle}
              disabled={publishPending}
              className="scale-75"
            />
            {publishPending && <Loader2 className="h-3 w-3 animate-spin" />}
          </span>
        )}

        {/* ── Botón "Crear" (publicado pero sin web) ─────────── */}
        {esPublicado && !web && !isCreating && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setIsCreating(true) }}
            className="ml-3 inline-flex items-center gap-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 transition-colors font-medium"
          >
            <Plus className="h-3 w-3" /> Agregar a tienda
          </button>
        )}

        {/* ── Botón "Editar" (tiene web + no está en ningún modo) */}
        {web && !isEditing && !isCreating && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setIsEditing(true) }}
            className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        )}

        <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 group-open:rotate-180" />
      </summary>

      {/* ── Error banner ────────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200 mt-2"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODO: SIN REGISTRO + SIN ACCIÓN ACTIVA
          (estado = pausado | descontinuado, o aun sin publicar)
      ════════════════════════════════════════════════════════ */}
      {!web && !isCreating && (
        <div className="py-4 text-sm text-muted-foreground text-center">
          {puedePublicar ? (
            <p>Activa el switch <span className="font-medium text-foreground">Publicar</span> para crear el registro de tienda.</p>
          ) : esPublicado ? (
            <p>Este producto no tiene registro en la tienda. Usa <span className="font-medium text-foreground">Agregar a tienda</span>.</p>
          ) : (
            <p>El producto debe estar en estado <span className="font-medium text-foreground">publicado</span> para aparecer en la tienda.</p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODO: CREAR (formulario vacío)
      ════════════════════════════════════════════════════════ */}
      {isCreating && !web && (
        <form key="create" onSubmit={handleCreate} className="space-y-4 pt-3 pb-2">
          <p className="text-xs text-muted-foreground italic">
            Nuevo registro de tienda web
          </p>
          {/* Slug autogenerado (solo lectura) */}
          <div className="space-y-1">
            <Label className="text-xs">Slug (auto)</Label>
            <Input
              name="slug"
              value={slugGenerado}
              readOnly
              className="h-9 font-mono text-xs bg-muted/50 cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground">
              Generado a partir de SKU + tipo de prenda + género{marca ? ' + marca' : ''}
            </p>
          </div>
          <WebFormFields web={null} />
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => { setIsCreating(false); setError(null) }}
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Save className="h-3.5 w-3.5 mr-1" /> Crear registro
            </Button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODO: EDITAR (formulario con datos existentes)
      ════════════════════════════════════════════════════════ */}
      {isEditing && web && (
        <form key={`edit-${web.id}`} onSubmit={handleUpdate} className="space-y-4 pt-3 pb-2">
          <WebFormFields web={web} />

          {/* Slug — solo lectura */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Globe className="h-3.5 w-3.5" />
            Slug (auto):
            <span className="font-mono">{web.slug}</span>
            <a
              href={`/shop/${web.slug}`} target="_blank" rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-1"
            >
              Ver en tienda ↗
            </a>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => { setIsEditing(false); setError(null) }}
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Save className="h-3.5 w-3.5 mr-1" /> Guardar
            </Button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODO: LECTURA (datos existentes, no editando)
      ════════════════════════════════════════════════════════ */}
      {web && !isEditing && !isCreating && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 pb-2 text-sm">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Slug</span>
              <a
                href={`/shop/${web.slug}`} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                Ver en tienda <Globe className="h-3 w-3" />
              </a>
            </div>
            <p className="font-mono text-xs">{web.slug}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Precio público</span>
            <p className="font-medium">{formatCurrency(web.precio_publico)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Precio oferta</span>
            <p>{web.precio_oferta ? formatCurrency(web.precio_oferta) : '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Visitas</span>
            <p>{web.visitas ?? 0}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Orden Display</span>
            <p>{web.orden_display ?? 0}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Unidad Venta</span>
            <Badge variant="outline" className="capitalize">{web.unidad_venta || 'Pieza'}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Modo Override</span>
            <Badge variant="outline" className="capitalize">{web.modo_override || 'Default'}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Publicado</span>
            <Fecha valor={web.fecha_publicacion} formato="fecha" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {web.en_oferta              && <Badge variant="secondary">Oferta</Badge>}
            {web.destacado              && <Badge variant="secondary">Destacado</Badge>}
            {web.nuevo                  && <Badge variant="secondary">Nuevo</Badge>}
            {web.precio_negociable      && <Badge variant="outline" className="border-accent text-accent">Precio Negociable</Badge>}
            {!web.disponible_mayorista  && <Badge variant="destructive">Solo Retail</Badge>}
            {web.disponible_mayorista   && <Badge variant="outline" className="border-accent text-accent">Mayorista OK</Badge>}
          </div>
          {web.titulo_seo && (
            <div className="col-span-full">
              <span className="text-muted-foreground">Título SEO</span>
              <p className="font-medium">{web.titulo_seo}</p>
            </div>
          )}
          {web.descripcion_seo && (
            <div className="col-span-full">
              <span className="text-muted-foreground">Descripción SEO</span>
              <p className="text-xs leading-relaxed">{web.descripcion_seo}</p>
            </div>
          )}
          {web.keywords && (
            <div className="col-span-full border-t pt-2">
              <span className="text-muted-foreground">Keywords</span>
              <p className="text-[10px] text-muted-foreground italic">{web.keywords}</p>
            </div>
          )}
        </div>
      )}
    </details>
  )
}
