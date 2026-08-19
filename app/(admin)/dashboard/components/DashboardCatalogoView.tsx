// app/(admin)/dashboard/components/DashboardCatalogoView.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CatalogoDashboardData, GeneroResumen, TipoPrendaResumen } from '@/modules/dashboard/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ADMIN_ROUTES } from '@/lib/constants'
import { 
  Shirt, 
  Sparkles, 
  Boxes, 
  PackageCheck, 
  ArrowRight, 
  Layers, 
  TrendingUp, 
  UserCheck, 
  Baby, 
  ChevronDown, 
  ChevronUp,
  Tag
} from 'lucide-react'

interface DashboardCatalogoViewProps {
  data: CatalogoDashboardData
}

export function DashboardCatalogoView({ data }: DashboardCatalogoViewProps) {
  const { 
    totalProductosActivos, 
    totalProductosConStock, 
    totalCajasStock, 
    totalPiezasStock, 
    resumenGeneros, 
    topChamarrasDama, 
    bodegaNombre 
  } = data

  const [limitCount, setLimitCount] = useState<5 | 10>(5)
  const [activeGenderTab, setActiveGenderTab] = useState<string>('Dama')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Chamarras')

  const generoActivo = resumenGeneros.find(g => g.genero === activeGenderTab) || resumenGeneros[0]

  return (
    <div className="space-y-6">
      
      {/* ── KPIs Principales de Catálogo & Stock ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* 1. Productos Activos */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Productos Activos
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Shirt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">{totalProductosActivos}</p>
              <p className="text-xs text-muted-foreground mt-1">
                SKUs registrados en el catálogo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. SKUs con Stock Físico (>= 1 caja) */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Con Stock Físico
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{totalProductosConStock}</p>
              <p className="text-xs text-muted-foreground mt-1">
                con al menos 1 caja disponible
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Cajas en Almacén */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cajas en Almacén
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-foreground">
                  {totalCajasStock.toLocaleString()}
                </p>
                <span className="text-sm font-bold text-muted-foreground">cajas</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                en {bodegaNombre}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Piezas Totales */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Piezas Totales
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">
                {totalPiezasStock.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                prendas estimadas totales
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Resumen de Géneros (Dama, Caballero, Infantil, Unisex) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resumenGeneros.map((gen) => {
          const isDama = gen.genero === 'Dama'
          const isCaballero = gen.genero === 'Caballero'
          const isInfantil = gen.genero === 'Infantil'

          return (
            <Card 
              key={gen.genero} 
              onClick={() => setActiveGenderTab(gen.genero)}
              className={`border-border shadow-xs cursor-pointer transition-all hover:border-primary/50 ${activeGenderTab === gen.genero ? 'ring-2 ring-primary/30 border-primary bg-primary/5' : 'bg-card'}`}
            >
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isDama && <UserCheck className="w-4 h-4 text-pink-500" />}
                    {isCaballero && <UserCheck className="w-4 h-4 text-blue-500" />}
                    {isInfantil && <Baby className="w-4 h-4 text-amber-500" />}
                    {!isDama && !isCaballero && !isInfantil && <Layers className="w-4 h-4 text-indigo-500" />}
                    <span className="font-bold text-sm text-foreground">{gen.genero}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {gen.totalSKUs} SKUs
                  </Badge>
                </div>

                <div className="pt-1 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Con existencias (≥ 1 caja):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {gen.totalSKUsConStock}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Cajas:</span>
                  <span className="font-bold text-foreground">
                    {gen.totalCajas.toLocaleString()} cjs
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Piezas totales:</span>
                  <span>{gen.totalPiezas.toLocaleString()} pzs</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Desglose por Tipo de Prenda y Top Existencias (5 a 10 productos) ── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shirt className="w-4 h-4 text-primary" />
                <span>Existencias por Tipo de Prenda — {activeGenderTab}</span>
              </CardTitle>
              <CardDescription>
                Cruce de productos activos con stock físico real en almacén ordenados de más a menos existencias.
              </CardDescription>
            </div>

            {/* Selector de Límite (Top 5 vs Top 10) */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border shrink-0 self-start sm:self-auto">
              <span className="text-[11px] font-semibold text-muted-foreground px-1.5">Mostrar:</span>
              <button
                type="button"
                onClick={() => setLimitCount(5)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${limitCount === 5 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Top 5
              </button>
              <button
                type="button"
                onClick={() => setLimitCount(10)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${limitCount === 10 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Top 10
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-0 space-y-5">
          {generoActivo.tiposPrenda.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No hay productos registrados para {activeGenderTab}.
            </div>
          ) : (
            <div className="space-y-4">
              {generoActivo.tiposPrenda.map((tipo) => {
                const isExpanded = expandedCategory === tipo.nombre || (!expandedCategory && tipo.totalCajas > 0)
                const productosAMostrar = tipo.topProductos.slice(0, limitCount)

                return (
                  <div 
                    key={tipo.nombre}
                    className="rounded-2xl border border-border bg-muted/10 overflow-hidden transition-colors hover:border-primary/30"
                  >
                    {/* Encabezado del Tipo de Prenda */}
                    <div 
                      onClick={() => setExpandedCategory(isExpanded ? null : tipo.nombre)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-sm text-foreground truncate">{tipo.nombre}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {tipo.totalSKUs} SKUs activos · {tipo.totalSKUsConStock} con stock (≥ 1 caja)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-black text-foreground">
                            {tipo.totalCajas.toLocaleString()} cajas
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {tipo.totalPiezas.toLocaleString()} piezas
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Lista de Productos con Más Stock */}
                    {isExpanded && (
                      <div className="p-4 pt-2 border-t border-border/60 bg-muted/5 space-y-2">
                        {productosAMostrar.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-3 text-center">
                            Sin productos con existencias en esta categoría.
                          </p>
                        ) : (
                          <div className="divide-y divide-border/60">
                            {productosAMostrar.map((prod, idx) => (
                              <div key={prod.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-black text-[10px]">
                                    {idx + 1}
                                  </span>
                                  <div className="truncate">
                                    <Link
                                      href={ADMIN_ROUTES.catalogo.detalle(prod.id)}
                                      className="font-bold text-foreground hover:text-primary transition-colors block truncate"
                                    >
                                      {prod.sku_base}
                                    </Link>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {prod.nombre || prod.descripcion || 'Sin descripción'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 text-right">
                                  <div>
                                    <span className="font-bold text-foreground block">
                                      {prod.cajas.toLocaleString()} cjs
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block">
                                      ≈ {prod.piezas.toLocaleString()} pzs
                                    </span>
                                  </div>
                                  <Badge 
                                    variant={prod.cajas > 0 ? 'default' : 'outline'}
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {prod.cajas > 0 ? 'Disponible' : 'Agotado'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Atajos y Enlaces Rápidos ── */}
      <div className="p-4 rounded-2xl border border-border bg-card/60 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-foreground">Gestión de Catálogo</p>
          <p className="text-[11px] text-muted-foreground">Consulta la lista completa de productos y variantes en el catálogo principal.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={ADMIN_ROUTES.catalogo.lista}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all"
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Ver Catálogo Completo</span>
          </Link>
          <Link
            href={ADMIN_ROUTES.inventario.stock}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-background hover:bg-muted transition-all"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Ver Stock por Bodega</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
