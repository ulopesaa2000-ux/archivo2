// app/(admin)/catalogo/[id]/components/HeroProducto.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Pencil, Save, X, Loader2, AlertCircle, Star, Layers, Package,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ESTADO_PRODUCTO_COLORS } from '@/lib/constants'
import { updateProductAction } from '@/modules/catalogo/actions'
import type { ProductoRow } from '@/lib/types/tables'
import type { FKDescriptivas, CatalogosEdicion } from '@/modules/catalogo/types'

// ─────────────────────────────────────────────────────────────────────────────
// Opciones de estado
// ─────────────────────────────────────────────────────────────────────────────
const ESTADOS_PRODUCTO = [
  'borrador', 'pendiente', 'publicado', 'pausado', 'descontinuado',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
type Props = {
  producto: ProductoRow
  fk: FKDescriptivas
  imagenPrincipal: string | null
  catalogos: CatalogosEdicion
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────
export function HeroProducto({ producto, fk, imagenPrincipal, catalogos }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const estadoColor = (producto.estado && ESTADO_PRODUCTO_COLORS[producto.estado]) || 'bg-gray-100 text-gray-800'

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('product_id', String(producto.id))

    // Checkboxes: si no están checked, FormData no los incluye → forzar booleanos
    ;(['activo', 'destacado', 'es_conjunto'] as const).forEach((key) => {
      if (!fd.has(key)) fd.set(key, 'false')
    })

    startTransition(async () => {
      const result = await updateProductAction(fd)
      if (!result.success) { setError(result.error ?? 'Error desconocido.'); return }
      setIsEditing(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isEditing ? (
            // ════════════════════════════════════════════════════
            // MODO EDICIÓN
            // ════════════════════════════════════════════════════
            <form key={producto.id} onSubmit={handleSave} className="space-y-5">
              {/* Fila 1: SKU + Estado + flags */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">SKU *</Label>
                  <Input
                    name="sku_base"
                    defaultValue={producto.sku_base}
                    required
                    className="h-9 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Estado</Label>
                  <Select name="estado" defaultValue={producto.estado ?? 'borrador'}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_PRODUCTO.map((e) => (
                        <SelectItem key={e} value={e}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${(ESTADO_PRODUCTO_COLORS[e] ?? '').split(' ')[0]}`} />
                            <span className="capitalize">{e}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Flags como checkboxes */}
                <div className="flex flex-col justify-center gap-2 sm:col-span-2">
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox name="activo" defaultChecked={producto.activo ?? true} value="true" />
                      Activo
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox name="destacado" defaultChecked={producto.destacado ?? false} value="true" />
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      Destacado
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox name="es_conjunto" defaultChecked={producto.es_conjunto ?? false} value="true" />
                      <Layers className="h-3.5 w-3.5 text-blue-500" />
                      Conjunto
                    </label>
                  </div>
                </div>
              </div>

              {/* Fila 2: Nombre + Familia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    name="nombre"
                    defaultValue={producto.nombre ?? ''}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Familia</Label>
                  <Input
                    name="familia"
                    defaultValue={producto.familia ?? ''}
                    className="h-9"
                    placeholder="ej. Chamarras"
                  />
                </div>
              </div>

              {/* Fila 3: Descripción */}
              <div className="space-y-1">
                <Label className="text-xs">Descripción</Label>
                <Textarea
                  name="descripcion"
                  defaultValue={producto.descripcion ?? ''}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              {/* Fila 4: Composición */}
              <div className="space-y-1">
                <Label className="text-xs">Composición</Label>
                <Input
                  name="composicion"
                  defaultValue={producto.composicion ?? ''}
                  className="h-9"
                  placeholder="ej. 60% poliéster, 40% algodón"
                />
              </div>

              {/* Fila 5: Precio EC + Pz/Caja */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Precio EC ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="precio_ec"
                    defaultValue={producto.precio_ec ?? ''}
                    className="h-9 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pz / Caja</Label>
                  <Input
                    type="number"
                    name="pz_en_caja"
                    defaultValue={producto.pz_en_caja ?? ''}
                    className="h-9 tabular-nums"
                  />
                </div>
              </div>

              {/* Fila 6: FKs — Marca, Género, Tipo de prenda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Marca</Label>
                  <Select name="marca_id" defaultValue={producto.marca_id?.toString() ?? '_none'}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin marca" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Sin marca —</SelectItem>
                      {catalogos.marcas.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Género</Label>
                  <Select name="genero_id" defaultValue={producto.genero_id?.toString() ?? '_none'}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin género" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Sin género —</SelectItem>
                      {catalogos.generos.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de prenda</Label>
                  <Select name="tipo_prenda_id" defaultValue={producto.tipo_prenda_id?.toString() ?? '_none'}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Sin tipo —</SelectItem>
                      {catalogos.tipos_prenda.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fila 7: Edad, Persona */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Edad</Label>
                  <Select name="edad_id" defaultValue={producto.edad_id?.toString() ?? '_none'}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin edad" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Sin edad —</SelectItem>
                      {catalogos.edades.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Persona / Fits</Label>
                  <Select name="persona_id" defaultValue={producto.persona_id?.toString() ?? '_none'}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin persona" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Sin persona —</SelectItem>
                      {catalogos.personas.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fila 8: Tela exterior + Tela forro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Tela exterior</Label>
                  <Select name="tela_ext_id" defaultValue={producto.tela_ext_id?.toString() ?? '_none'}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin tela" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Sin tela —</SelectItem>
                      {catalogos.telas.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tela forro</Label>
                  <Select name="tela_forro_id" defaultValue={producto.tela_forro_id?.toString() ?? '_none'}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin forro" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Sin forro —</SelectItem>
                      {catalogos.telas.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
          ) : (
            // ════════════════════════════════════════════════════
            // MODO LECTURA
            // ════════════════════════════════════════════════════
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Imagen */}
              <div className="flex items-center justify-center bg-muted rounded-lg aspect-square overflow-hidden">
                {imagenPrincipal ? (
                  <img
                    src={imagenPrincipal}
                    alt={producto.nombre ?? producto.sku_base}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <Package className="h-16 w-16 text-muted-foreground/30" />
                )}
              </div>

              {/* Info principal */}
              <div className="md:col-span-2 space-y-4">
                {/* Cabecera: SKU + badges + botón editar */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold font-mono">{producto.sku_base}</h2>
                    <Badge className={estadoColor}>{producto.estado}</Badge>
                    {!producto.activo && (
                      <Badge variant="destructive">Inactivo</Badge>
                    )}
                    {producto.destacado && (
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    )}
                    {producto.es_conjunto && (
                      <Badge variant="outline" className="gap-1">
                        <Layers className="h-3 w-3" />
                        Conjunto
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="shrink-0"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                </div>

                {/* Precio */}
                <p className="text-2xl font-bold">
                  {producto.precio_ec ? formatCurrency(producto.precio_ec) : '—'}
                </p>

                {/* Descripción */}
                <p className="text-sm text-muted-foreground">
                  {producto.descripcion ?? producto.nombre ?? 'Sin descripción'}
                </p>

                {/* Grid de atributos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  <AttrItem label="Marca" value={fk.marca} />
                  <AttrItem label="Género" value={fk.genero} />
                  <AttrItem label="Tipo" value={fk.tipo_prenda} />
                  <AttrItem label="Familia" value={producto.familia} />
                  <AttrItem label="Edad" value={fk.edad} />
                  <AttrItem label="Pz/Caja" value={producto.pz_en_caja?.toString()} />
                  <AttrItem label="Tela exterior" value={fk.tela_exterior} />
                  <AttrItem label="Tela forro" value={fk.tela_forro} />
                  <AttrItem label="Persona" value={fk.persona} />
                </div>

                {/* Composición */}
                {producto.composicion && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Composición: </span>
                    <span>{producto.composicion}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: item de atributo en modo READ
// ─────────────────────────────────────────────────────────────────────────────
function AttrItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="font-medium">{value ?? '—'}</p>
    </div>
  )
}
