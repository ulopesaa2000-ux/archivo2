// app/(admin)/ordenes-b2b/orden-rapida/_components/Step3Productos.tsx
'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { calcularDestinos } from '@/lib/orden-rapida-colores'
import { cn } from '@/lib/utils'
import { inferEdadFromGeneroAndText, type DetectorCatalogos } from '@/modules/catalogo/utils/detector'
import type { SkuProbable } from '@/modules/ordenes-b2b/actions'
import { aplicarDatosDbAProducto, restaurarDatosPacking } from '../_hooks/orden-rapida-n8n'
import type {
  AlertaN8nLocal,
  CatalogItemOption,
  SeparacionSugerida,
  WizardCaja,
  WizardParsedData,
  WizardProducto,
  WizardWarning,
} from '../_hooks/orden-rapida-types'
import { SkuEditCell } from './WizardAtoms'

interface Step3ProductosProps {
  editableProductos: WizardProducto[]
  onUpdateProductos: (updater: (prev: WizardProducto[]) => WizardProducto[]) => void
  editableCajas: WizardCaja[]
  parsedData: WizardParsedData | null
  marcas: CatalogItemOption[]
  generos: CatalogItemOption[]
  edades: CatalogItemOption[]
  tipos_prenda: CatalogItemOption[]
  isCheckingDbSkus: boolean
  isSyncingDbProducts: boolean
  warnings: WizardWarning[]
  dbSkusSet: Set<string>
  vinculosDb: Record<string, { dbId: number; dbSku: string }>
  probablesDb: SkuProbable[]
  skuN8nPorSku: Record<string, string>
  alertasPorSku: Map<string, AlertaN8nLocal[]>
  rellenadosN8n: Set<string>
  separacionPorSku: Map<string, SeparacionSugerida[]>
  separacionIgnorada: boolean
  onIgnorarSeparacion: () => void
  buscandoDb: Set<string>
  editandoSku: string | null
  onSetEditandoSku: (rowKey: string | null) => void
  onAutoDetectAll: () => void
  onAutoDetectProduct: (index: number) => void
  onSyncProductsFromDb: () => void
  onOpenAddProduct: () => void
  onQuitarVinculo: (skuBase: string) => void
  onSincronizarProbable: (prob: SkuProbable) => void
  onSepararSugerido: (sep: SeparacionSugerida, opts?: { soloCrear?: boolean }) => void
  onDividirPack: (skuBase: string, pack: string, cartonesSugeridos?: string[]) => void
  onCommitSkuEdit: (producto: WizardProducto, index: number, newSkuVal: string) => void
  onBuscarSkuEnBD: (producto: WizardProducto, index: number) => void
  onRequestDeleteProduct: (index: number, sku: string) => void
}

export function Step3Productos({
  editableProductos,
  onUpdateProductos,
  editableCajas,
  parsedData,
  marcas,
  generos,
  edades,
  tipos_prenda,
  isCheckingDbSkus,
  isSyncingDbProducts,
  warnings,
  dbSkusSet,
  vinculosDb,
  probablesDb,
  skuN8nPorSku,
  alertasPorSku,
  rellenadosN8n,
  separacionPorSku,
  separacionIgnorada,
  onIgnorarSeparacion,
  buscandoDb,
  editandoSku,
  onSetEditandoSku,
  onAutoDetectAll,
  onAutoDetectProduct,
  onSyncProductsFromDb,
  onOpenAddProduct,
  onQuitarVinculo,
  onSincronizarProbable,
  onSepararSugerido,
  onDividirPack,
  onCommitSkuEdit,
  onBuscarSkuEnBD,
  onRequestDeleteProduct,
}: Step3ProductosProps) {
  const detectorCatalogos: DetectorCatalogos = { marcas, generos, edades, tipos_prenda }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">3. Productos detectados</h2>
          {isCheckingDbSkus && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Verificando catálogo Supabase...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onAutoDetectAll}
            className="h-8 gap-1.5 border-amber-400/50 bg-amber-50 text-xs text-amber-900 hover:bg-amber-100 font-bold dark:bg-amber-950/40 dark:text-amber-300"
            title="Detectar automáticamente Prenda, Género, Edad y Marca para todos los productos de la lista"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            Auto-detectar atributos
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onSyncProductsFromDb}
            disabled={isSyncingDbProducts}
            className="h-8 gap-1.5 border-emerald-400/50 bg-emerald-50 text-xs text-emerald-800 hover:bg-emerald-100 font-bold dark:bg-emerald-950/40 dark:text-emerald-300"
            title="Traer descripción, marca, composición y precio de la base de datos para todos los productos de la lista"
          >
            {isSyncingDbProducts ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
            )}
            Sincronizar datos con BD
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenAddProduct}
            className="h-8 gap-1.5 border-primary/40 bg-primary/5 text-xs text-primary hover:bg-primary/10 font-bold"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar producto
          </Button>
          {warnings.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-yellow-200/50 bg-yellow-100/50 px-3 py-1 text-xs text-yellow-800">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>La revision puede continuar aunque existan warnings.</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="flex items-center gap-1 text-sm font-semibold">
          <Package className="h-4 w-4 text-primary" /> Revision local de SKUs ({editableProductos.length} SKUs unicos)
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/60 text-left font-bold text-muted-foreground uppercase text-[10px]">
                <th className="p-3">Verificación BD</th>
                <th className="p-3 w-40 min-w-[140px]">SKU Base</th>
                <th className="p-3 min-w-[260px]">Descripción / Nombre</th>
                <th className="p-3 min-w-[140px]">Prenda</th>
                <th className="p-3 min-w-[130px]">Género</th>
                <th className="p-3 min-w-[150px]">Marca (Catálogo)</th>
                <th className="p-3 min-w-[120px]">Composición</th>
                <th className="p-3 text-right">Precio USD</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {editableProductos.map((producto, index) => {
                const skuUp = String(producto.sku_base || '').trim().toUpperCase()
                const rowSkuKey = producto.temp_id || `idx-${index}`
                const dbMatch = dbSkusSet.has(skuUp)
                const isForcedNew = Boolean(producto.force_new)
                const isMatch = dbMatch && !isForcedNew
                const vinculo = vinculosDb[skuUp]
                const probable = probablesDb.find((p) => String(p.inputSku).trim().toUpperCase() === skuUp)
                const n8nStr = skuN8nPorSku[skuUp] || String(producto.sku_raw || '')

                const currentBrandObj = marcas.find(
                  (m) =>
                    (producto.marca_id && m.id === producto.marca_id) ||
                    (producto.marca && m.nombre.toUpperCase() === producto.marca.toUpperCase())
                )
                const currentBrandValue = currentBrandObj ? currentBrandObj.id.toString() : ''
                const displayBrandName = currentBrandObj ? currentBrandObj.nombre : producto.marca || ''
                const jsonMarca = String(producto.json_marca || producto.marca_raw || '')

                return (
                  <tr
                    key={producto.temp_id || `idx-${index}`}
                    className={cn(
                      'transition-colors',
                      isMatch
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 hover:bg-emerald-100/50'
                        : isForcedNew
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-l-4 border-l-blue-500 hover:bg-blue-100/40'
                          : 'bg-amber-50/30 dark:bg-amber-950/20 border-l-4 border-l-amber-400 hover:bg-amber-100/30'
                    )}
                  >
                    {/* 1. Verificación BD / Estado */}
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-1.5 items-start">
                        {isMatch ? (
                          <>
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] gap-1 shadow-sm">
                              <CheckCircle2 className="h-3 w-3" /> En Catálogo BD
                            </Badge>
                            <span
                              className="text-[10px] font-mono text-muted-foreground"
                              title="Comparativa n8n vs sistema (match 100)"
                            >
                              n8n: <strong className="text-foreground">{n8nStr || producto.sku_base}</strong>
                              <br />
                              BD: <strong className="text-foreground">{producto.sku_base}</strong>
                            </span>
                          </>
                        ) : vinculo ? (
                          <>
                            <Badge className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] gap-1 shadow-sm">
                              <CheckCircle2 className="h-3 w-3" /> Sincronizado: {vinculo.dbSku}
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground" title="Vínculo manual del usuario">
                              n8n: <strong className="text-foreground">{n8nStr || producto.sku_base}</strong>
                              <br />
                              BD: <strong className="text-foreground">{vinculo.dbSku}</strong>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 text-[9px] px-1.5 font-bold text-muted-foreground hover:text-destructive underline"
                              onClick={() => onQuitarVinculo(producto.sku_base)}
                              title="Quitar vínculo y volver a nuevo"
                            >
                              Quitar vínculo
                            </Button>
                          </>
                        ) : probable ? (
                          <div className="rounded-lg border border-amber-400/60 bg-amber-50/70 dark:bg-amber-950/30 p-2 space-y-1.5 max-w-[220px]">
                            <Badge
                              variant="outline"
                              className="border-amber-500 text-amber-800 dark:text-amber-300 font-bold text-[10px] gap-1"
                            >
                              <AlertTriangle className="h-3 w-3" /> ¿Mismo código? ({probable.score})
                            </Badge>
                            <p className="text-[10px] font-mono leading-relaxed">
                              n8n: <strong>{n8nStr || probable.inputSku}</strong>
                              <br />
                              BD: <strong>{probable.dbSku}</strong>
                              <br />
                              <span className="text-muted-foreground">vía {probable.metodo}</span>
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] font-bold border-teal-500/50 text-teal-700 hover:bg-teal-50 dark:text-teal-300"
                              onClick={() => onSincronizarProbable(probable)}
                            >
                              🔗 Sincronizar con {probable.dbSku}
                            </Button>
                          </div>
                        ) : isForcedNew ? (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] gap-1 shadow-sm">
                            <Sparkles className="h-3 w-3" /> Nuevo (Forzado)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 font-bold text-[10px]">
                            Nuevo / No registrado
                          </Badge>
                        )}

                        {(() => {
                          const alertas = alertasPorSku.get(skuUp) ?? []
                          const rellenado = rellenadosN8n.has(skuUp)
                          if (alertas.length === 0 && !rellenado) return null
                          const altas = alertas.filter((a) => a.severidad === 'alta').length
                          const title = [
                            ...alertas.map(
                              (a) =>
                                `• [${a.tipo ?? 'aviso'}${a.severidad ? `/${a.severidad}` : ''}] ${a.detalle || a.issue || ''}`
                            ),
                            ...(rellenado ? ['• Línea autocompletada por auditoría n8n desde el físico'] : []),
                          ].join('\n')
                          return (
                            <div className="flex flex-wrap gap-1" title={title}>
                              {alertas.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className={`font-bold text-[10px] ${altas > 0 ? 'border-red-400 bg-red-50 text-red-800' : 'border-amber-400 bg-amber-50 text-amber-800'}`}
                                >
                                  <AlertTriangle className="h-3 w-3 mr-0.5" /> {alertas.length} alerta
                                  {alertas.length !== 1 ? 's' : ''} n8n
                                </Badge>
                              )}
                              {rellenado && (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]"
                                >
                                  🤖 Corregido por n8n
                                </Badge>
                              )}
                            </div>
                          )
                        })()}

                        {(() => {
                          if (separacionIgnorada) return null
                          const seps = separacionPorSku.get(skuUp) ?? []
                          if (seps.length === 0) return null
                          return (
                            <div className="flex flex-col gap-1.5 rounded-md border border-amber-400/60 bg-amber-50/70 px-2 py-1.5 dark:bg-amber-950/30">
                              {seps.map((sep, si) => {
                                const cands = (sep.productos_candidatos || [])
                                  .map((c) => String(c.sku_base || ''))
                                  .filter(Boolean)
                                const packs = (sep.packs_candidatos || [])
                                  .map((p) => String(p.nombre_actual || ''))
                                  .filter(Boolean)
                                const upSep = String(sep.sku_base_original || '').trim().toUpperCase()
                                const cajasSep = editableCajas.filter(
                                  (cj) =>
                                    cj.tipo_caja !== 'padre_resumen' &&
                                    String(cj.sku_base || '').trim().toUpperCase() === upSep
                                )
                                const prevision =
                                  sep.tipo !== 'pack_duplicado_dudoso' && cands.length >= 2
                                    ? calcularDestinos(
                                        cajasSep.map((cj) => ({
                                          codigo: String(cj.codigo_caja_temporal || cj.codigo_caja || ''),
                                          carton: String((cj as Record<string, unknown>).carton_no_raw || '').trim(),
                                        })),
                                        parsedData?.staging_por_codigo || {},
                                        (sep.productos_candidatos || []).map((c) => ({
                                          sku_base: String(c.sku_base || ''),
                                          filas: (c.filas || []).map((x) => Number(x)),
                                          cartones: (c.cartones || []).map((x) => String(x)),
                                        })),
                                        sep.reparto_exacto || []
                                      )
                                    : null
                                const skuADest = String((sep.productos_candidatos || [])[0]?.sku_base || '')
                                  .trim()
                                  .toUpperCase()
                                const muevenPrevistos = prevision
                                  ? [...prevision.destinos.values()].filter((s) => s.trim().toUpperCase() !== skuADest).length
                                  : 0
                                const sinDatosPosicion = prevision !== null && cajasSep.length > 0 && muevenPrevistos === 0
                                return (
                                  <div key={si} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span className="font-bold text-amber-900 dark:text-amber-200">
                                      {sep.tipo === 'pack_duplicado_dudoso'
                                        ? `Pack duplicado${packs.length > 0 ? `: ${packs.join(', ')}` : ''}`
                                        : `Posible pegado: ${cands.length > 0 ? cands.join(' + ') : sep.sku_base_original || ''}`}
                                    </span>
                                    {sep.tipo !== 'pack_duplicado_dudoso' && cands.length >= 2 && !sinDatosPosicion && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100"
                                        onClick={() => onSepararSugerido(sep)}
                                        title={`Crea los productos candidatos y reparte sus cajas (moverá ${muevenPrevistos} a ${cands.slice(1).join(', ')})`}
                                      >
                                        Separar en {cands.length} (mueve {muevenPrevistos})
                                      </Button>
                                    )}
                                    {sep.tipo !== 'pack_duplicado_dudoso' && cands.length >= 2 && sinDatosPosicion && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100"
                                        onClick={() => onSepararSugerido(sep, { soloCrear: true })}
                                        title="La sugerencia no trae filas ni cartones: crea los productos y mueve las cajas a mano con arrastre"
                                      >
                                        Crear productos (mover a mano)
                                      </Button>
                                    )}
                                    {sep.tipo === 'pack_duplicado_dudoso' &&
                                      packs.map((pk) => (
                                        <Button
                                          key={pk}
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100"
                                          onClick={() => {
                                            const wB = (alertasPorSku.get(skuUp) ?? []).find(
                                              (a) => a.tipo === 'pack_duplicado_dudoso'
                                            ) as unknown as { cartones?: unknown } | undefined
                                            const wcB = Array.isArray(wB?.cartones)
                                              ? (wB!.cartones as unknown[]).map((x) => String(x))
                                              : undefined
                                            const pcB = (sep.packs_candidatos || []).find(
                                              (p) => String(p.nombre_actual || '') === pk
                                            )?.cartones
                                            onDividirPack(producto.sku_base || '', pk, wcB && wcB.length >= 2 ? wcB : pcB)
                                          }}
                                          title={`Divide ${pk} en dos por rangos de cartón`}
                                        >
                                          Dividir {pk}
                                        </Button>
                                      ))}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[10px] text-muted-foreground"
                                      onClick={onIgnorarSeparacion}
                                    >
                                      Ignorar
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}

                        {dbMatch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-5 text-[9px] px-1.5 font-bold transition-all',
                              isForcedNew
                                ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/70 underline'
                                : 'text-blue-700 hover:text-blue-900 hover:bg-blue-100/70 underline'
                            )}
                            onClick={() => {
                              onUpdateProductos((prev) =>
                                prev.map((p, i) => {
                                  if (i !== index) return p
                                  if (!isForcedNew) {
                                    return restaurarDatosPacking(p)
                                  }
                                  if (p.db_sincronizado) {
                                    return aplicarDatosDbAProducto(p, p.db_sincronizado, {
                                      marcas,
                                      generos,
                                      edades,
                                      tipos_prenda,
                                    })
                                  }
                                  return { ...p, force_new: false, es_nuevo: false }
                                })
                              )
                              if (!isForcedNew) {
                                toast.info(
                                  `El SKU "${producto.sku_base}" se restauró con los datos del packing y se creará como un NUEVO producto.`
                                )
                              } else {
                                toast.success(
                                  `El SKU "${producto.sku_base}" se vinculó nuevamente al producto existente en el catálogo.`
                                )
                              }
                            }}
                            title={isForcedNew ? 'Vincular a producto existente en BD' : 'Forzar creación como nuevo producto separado'}
                          >
                            {isForcedNew ? '🔗 Vincular a Catálogo' : '✨ Crear como Nuevo'}
                          </Button>
                        )}
                      </div>
                    </td>

                    {/* 2. SKU Base */}
                    <td className="p-3 font-mono text-xs font-bold align-top">
                      {!isMatch || isForcedNew || editandoSku === rowSkuKey ? (
                        <div className="space-y-1.5">
                          <SkuEditCell
                            value={producto.sku_base}
                            onCommit={(v) => onCommitSkuEdit(producto, index, v)}
                            placeholder="SKU Base..."
                            className="min-h-[52px] w-full min-w-[130px] font-mono text-xs font-bold bg-background/80 resize-none py-1.5 leading-snug"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px] gap-1 text-primary hover:bg-primary/10 font-bold"
                            onClick={() => onBuscarSkuEnBD(producto, index)}
                            disabled={buscandoDb.has(rowSkuKey)}
                            title="Buscar este código directamente en la base de datos"
                          >
                            {buscandoDb.has(rowSkuKey) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Search className="h-3 w-3" />
                            )}
                            <span>{buscandoDb.has(rowSkuKey) ? 'Buscando...' : 'Buscar en BD'}</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-foreground block break-words">{producto.sku_base}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground font-bold underline"
                            onClick={() => onSetEditandoSku(rowSkuKey)}
                            title="Editar SKU manualmente"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Editar</span>
                          </Button>
                        </div>
                      )}
                    </td>

                    {/* 3. Descripción / Nombre */}
                    <td className="p-3 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px] gap-1 text-primary hover:bg-primary/10 font-bold"
                            onClick={() => onAutoDetectProduct(index)}
                            title="Detectar Prenda, Género, Edad y Marca desde el texto"
                          >
                            <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                            <span>Auto-detectar</span>
                          </Button>
                        </div>
                        <Textarea
                          rows={2}
                          value={producto.descripcion ?? producto.nombre ?? ''}
                          onChange={(event) => {
                            const value = event.target.value
                            onUpdateProductos((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, descripcion: value, nombre: value } : item
                              )
                            )
                          }}
                          placeholder="Descripción del producto..."
                          className="min-h-[52px] resize-y text-xs bg-background/90 font-medium py-1.5 leading-snug w-full min-w-[240px]"
                        />
                      </div>
                    </td>

                    {/* 4. Tipo de Prenda */}
                    <td className="p-3 align-top">
                      <Select
                        value={producto.tipo_prenda_id ? String(producto.tipo_prenda_id) : ''}
                        onValueChange={(val) => {
                          const found = tipos_prenda.find((t) => String(t.id) === val)
                          onUpdateProductos((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    tipo_prenda: found ? found.nombre : item.tipo_prenda,
                                    tipo_prenda_id: found ? found.id : null,
                                  }
                                : item
                            )
                          )
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs bg-background/90 w-36 font-semibold">
                          <span className="truncate text-left flex-1">
                            {tipos_prenda.find((t) => String(t.id) === String(producto.tipo_prenda_id))?.nombre ||
                              producto.tipo_prenda ||
                              'Seleccionar...'}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {tipos_prenda.map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()} className="text-xs">
                              {t.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* 5. Género */}
                    <td className="p-3 align-top">
                      <Select
                        value={producto.genero_id ? String(producto.genero_id) : ''}
                        onValueChange={(val) => {
                          const found = generos.find((g) => String(g.id) === val)
                          const inferredEdad = inferEdadFromGeneroAndText(
                            val,
                            producto.descripcion ?? producto.nombre ?? '',
                            detectorCatalogos
                          )
                          onUpdateProductos((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    genero: found ? found.nombre : item.genero,
                                    genero_id: found ? found.id : null,
                                    ...(inferredEdad?.id ? { edad_id: inferredEdad.id, edad: inferredEdad.nombre } : {}),
                                  }
                                : item
                            )
                          )
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs bg-background/90 w-32 font-semibold">
                          <span className="truncate text-left flex-1">
                            {generos.find((g) => String(g.id) === String(producto.genero_id))?.nombre ||
                              producto.genero ||
                              'Seleccionar...'}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {generos.map((g) => (
                            <SelectItem key={g.id} value={g.id.toString()} className="text-xs">
                              {g.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* 6. Marca */}
                    <td className="p-3 align-top">
                      <div className="space-y-1">
                        {jsonMarca && jsonMarca.toUpperCase() !== displayBrandName.toUpperCase() && (
                          <span className="block text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit">
                            JSON: &quot;{jsonMarca}&quot;
                          </span>
                        )}
                        <Select
                          value={currentBrandValue}
                          onValueChange={(val) => {
                            const selectedBrand = marcas.find((m) => m.id.toString() === val)
                            onUpdateProductos((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      marca: selectedBrand ? selectedBrand.nombre : item.marca,
                                      marca_id: selectedBrand ? selectedBrand.id : null,
                                    }
                                  : item
                              )
                            )
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs bg-background/90 w-36 font-semibold">
                            <span className="truncate text-left flex-1">{displayBrandName || 'Seleccionar marca...'}</span>
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {marcas.map((m) => (
                              <SelectItem key={m.id} value={m.id.toString()} className="text-xs">
                                {m.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>

                    {/* 7. Composición */}
                    <td className="p-3 align-top">
                      <Input
                        value={producto.composicion ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          onUpdateProductos((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, composicion: value } : item
                            )
                          )
                        }}
                        placeholder="ej: 100% Algodón"
                        className="h-9 w-32 text-xs bg-background/90"
                      />
                    </td>

                    {/* 8. Precio USD */}
                    <td className="p-3 text-right font-mono text-xs align-top">
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={producto.precio_unitario_usd ?? ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            onUpdateProductos((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, precio_unitario_usd: value } : item
                              )
                            )
                          }}
                          className="h-9 w-20 text-right font-mono text-xs font-bold bg-background/90"
                        />
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const current = Number(producto.precio_unitario_usd || 0)
                              const next = Math.max(0, Math.round((current + 0.5) * 10) / 10)
                              onUpdateProductos((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, precio_unitario_usd: next } : item
                                )
                              )
                            }}
                            className="h-4 px-1.5 bg-muted hover:bg-primary/20 hover:text-primary text-[9px] font-bold rounded flex items-center justify-center text-foreground transition-colors border"
                            title="Incrementar +0.50 USD"
                          >
                            +0.5
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = Number(producto.precio_unitario_usd || 0)
                              const next = Math.max(0, Math.round((current - 0.5) * 10) / 10)
                              onUpdateProductos((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, precio_unitario_usd: next } : item
                                )
                              )
                            }}
                            className="h-4 px-1.5 bg-muted hover:bg-primary/20 hover:text-primary text-[9px] font-bold rounded flex items-center justify-center text-foreground transition-colors border"
                            title="Disminuir -0.50 USD"
                          >
                            -0.5
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* 9. Acciones */}
                    <td className="p-3 text-center align-top">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRequestDeleteProduct(index, producto.sku_base)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Eliminar producto de la revisión"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
