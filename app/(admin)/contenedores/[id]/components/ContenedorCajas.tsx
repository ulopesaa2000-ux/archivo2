// app/(admin)/contenedores/[id]/components/ContenedorCajas.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { Package, Box, Ruler, Layers, ListFilter, ChevronRight, ChevronDown, ChevronsUpDown, ShoppingBag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import { cn } from '@/lib/utils'
import type { CajaEnContenedor } from '@/modules/contenedores/types'

type ModeloGrupo = {
  sku: string
  cajas: CajaEnContenedor[]
  totalCajas: number
  totalPiezas: number
  totalCbm: number
}

type OrdenGrupo = {
  ordenId: number
  ordenFolio: string
  modelos: ModeloGrupo[]
  allCajas: CajaEnContenedor[]
  totalCajas: number
  totalPiezas: number
  totalCbm: number
}

export function ContenedorCajas({ cajas }: { cajas: CajaEnContenedor[] }) {
  const [modoVista, setModoVista] = useState<'agrupado' | 'extendido'>('agrupado')
  const [expandedModelos, setExpandedModelos] = useState<Record<string, boolean>>({})

  // Métricas generales
  const metrics = useMemo(() => {
    let totalCajasFisicas = 0
    let totalPiezas = 0
    let totalCbm = 0
    const skuSet = new Set<string>()

    for (const c of cajas) {
      totalCajasFisicas += c.cantidad_cajas ?? 0
      const pzPerBox = c.piezas_por_caja ?? 0
      const qty = c.cantidad_cajas ?? 0
      totalPiezas += pzPerBox * qty
      totalCbm += (c.cbm ?? 0) * qty
      if (c.producto_sku) skuSet.add(c.producto_sku)
    }
    return { totalCajasFisicas, totalPiezas, totalCbm, totalModelos: skuSet.size }
  }, [cajas])

  // Agrupación jerárquica: Orden -> Modelo / SKU -> Cajas
  const ordenesGrupos: OrdenGrupo[] = useMemo(() => {
    const ordenMap = new Map<number, { ordenFolio: string; cajas: CajaEnContenedor[] }>()

    for (const c of cajas) {
      const oid = c.ordenId
      if (!ordenMap.has(oid)) {
        ordenMap.set(oid, {
          ordenFolio: c.ordenFolio ?? `Orden #${c.ordenId}`,
          cajas: [],
        })
      }
      ordenMap.get(oid)!.cajas.push(c)
    }

    const resultado: OrdenGrupo[] = []

    for (const [ordenId, { ordenFolio, cajas: cajasDeOrden }] of ordenMap.entries()) {
      const modeloMap = new Map<string, CajaEnContenedor[]>()

      let ordenTotalCajas = 0
      let ordenTotalPiezas = 0
      let ordenTotalCbm = 0

      for (const c of cajasDeOrden) {
        const sku = c.producto_sku || 'Sin SKU'
        if (!modeloMap.has(sku)) {
          modeloMap.set(sku, [])
        }
        modeloMap.get(sku)!.push(c)

        const qty = c.cantidad_cajas ?? 0
        const pz = (c.piezas_por_caja ?? 0) * qty
        const cbm = (c.cbm ?? 0) * qty

        ordenTotalCajas += qty
        ordenTotalPiezas += pz
        ordenTotalCbm += cbm
      }

      const modelos: ModeloGrupo[] = []
      for (const [sku, items] of modeloMap.entries()) {
        let modCajas = 0
        let modPiezas = 0
        let modCbm = 0

        for (const item of items) {
          const qty = item.cantidad_cajas ?? 0
          modCajas += qty
          modPiezas += (item.piezas_por_caja ?? 0) * qty
          modCbm += (item.cbm ?? 0) * qty
        }

        modelos.push({
          sku,
          cajas: items,
          totalCajas: modCajas,
          totalPiezas: modPiezas,
          totalCbm: modCbm,
        })
      }

      resultado.push({
        ordenId,
        ordenFolio,
        modelos,
        allCajas: cajasDeOrden,
        totalCajas: ordenTotalCajas,
        totalPiezas: ordenTotalPiezas,
        totalCbm: ordenTotalCbm,
      })
    }

    return resultado
  }, [cajas])

  if (cajas.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground mt-4">
        <Package className="h-8 w-8" />
        <p className="text-sm mt-2">Sin cajas registradas en este contenedor.</p>
      </div>
    )
  }

  const toggleModelo = (key: string) => {
    setExpandedModelos((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleExpandAll = () => {
    const allKeys: Record<string, boolean> = {}
    const anyExpanded = Object.values(expandedModelos).some(Boolean)
    const nextState = !anyExpanded

    for (const o of ordenesGrupos) {
      for (const m of o.modelos) {
        allKeys[`${o.ordenId}_${m.sku}`] = nextState
      }
    }
    setExpandedModelos(allKeys)
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Resumen Superior */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Box className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Cajas</p>
              <p className="text-xl font-black tabular-nums">{metrics.totalCajasFisicas.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Piezas</p>
              <p className="text-xl font-black tabular-nums">{metrics.totalPiezas.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Ruler className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CBM Total</p>
              <p className="text-xl font-black tabular-nums">{metrics.totalCbm.toFixed(3)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Modelos / SKUs</p>
              <p className="text-xl font-black tabular-nums">{metrics.totalModelos}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Control de Modos */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-muted/20 p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <Button
            variant={modoVista === 'agrupado' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModoVista('agrupado')}
            className="h-8 text-xs font-semibold"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Vista Agrupada (Por Modelo / SKU)
          </Button>
          <Button
            variant={modoVista === 'extendido' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModoVista('extendido')}
            className="h-8 text-xs font-semibold"
          >
            <ListFilter className="h-3.5 w-3.5 mr-1.5" />
            Vista Extendida (Todas las Cajas)
          </Button>
        </div>

        {modoVista === 'agrupado' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpandAll}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
            Expandir / Colapsar Todos los Modelos
          </Button>
        )}
      </div>

      {/* Lista de Órdenes con Separador de Color */}
      <div className="space-y-10">
        {ordenesGrupos.map((orden, oIdx) => (
          <div key={orden.ordenId} className="space-y-4">
            {/* Banner Separador de Orden con Línea de Color */}
            <div className="relative">
              <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-l-4 border-l-primary py-2.5 px-4 rounded-r-lg flex items-center justify-between flex-wrap gap-2 border-y border-r shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Orden #{orden.ordenId}
                  </span>
                  <span className="font-bold text-sm text-foreground">
                    {orden.ordenFolio}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-muted-foreground flex-wrap">
                  <Badge variant="outline" className="bg-background/80 font-normal">
                    {orden.modelos.length} modelo{orden.modelos.length !== 1 ? 's' : ''}
                  </Badge>
                  <span>
                    <strong className="text-foreground">{orden.totalCajas}</strong> cajas
                  </span>
                  <span>
                    <strong className="text-foreground">{orden.totalPiezas.toLocaleString()}</strong> pz
                  </span>
                  <span>
                    <strong className="text-foreground">{orden.totalCbm.toFixed(3)}</strong> CBM
                  </span>
                </div>
              </div>
            </div>

            {/* Contenido de la Orden */}
            {modoVista === 'agrupado' ? (
              /* MODO AGRUPADO POR MODELO / SKU */
              <div className="space-y-3 pl-2 sm:pl-3 border-l-2 border-muted">
                {orden.modelos.map((mod) => {
                  const modKey = `${orden.ordenId}_${mod.sku}`
                  // Por defecto colapsado
                  const isExpanded = Boolean(expandedModelos[modKey])

                  return (
                    <div
                      key={modKey}
                      className="rounded-lg border bg-card/60 overflow-hidden shadow-xs transition-all hover:border-muted-foreground/30"
                    >
                      {/* Cabecera del Modelo */}
                      <div
                        className="flex items-center justify-between px-4 py-2.5 bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors"
                        onClick={() => toggleModelo(modKey)}
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleModelo(modKey)
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-primary" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <span className="font-mono text-sm font-black text-foreground">
                            {mod.sku}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({mod.cajas.length} tipo{mod.cajas.length !== 1 ? 's' : ''} de caja)
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                          <span className="bg-muted px-2 py-0.5 rounded border text-muted-foreground font-semibold">
                            {mod.totalCajas} caja{mod.totalCajas !== 1 ? 's' : ''}
                          </span>
                          <span className="text-foreground font-bold">
                            {mod.totalPiezas.toLocaleString()} pz
                          </span>
                          <span className="text-muted-foreground hidden sm:inline">
                            {mod.totalCbm.toFixed(3)} CBM
                          </span>
                        </div>
                      </div>

                      {/* CajaCards Desplegables */}
                      {isExpanded && (
                        <div className="p-4 bg-background/50 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {mod.cajas.map((caja) => (
                              <CajaCard
                                key={caja.ordenCajaId}
                                caja={caja}
                                layout="horizontal"
                                canEdit={false}
                                canDelete={false}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              /* MODO EXTENDIDO (TODAS LAS CAJAS EN GRID) */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2 sm:pl-3 border-l-2 border-muted">
                {orden.allCajas.map((caja) => (
                  <CajaCard
                    key={caja.ordenCajaId}
                    caja={caja}
                    layout="horizontal"
                    canEdit={false}
                    canDelete={false}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

