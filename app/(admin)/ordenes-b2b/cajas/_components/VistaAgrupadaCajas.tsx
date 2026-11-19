// app/(admin)/ordenes-b2b/cajas/_components/VistaAgrupadaCajas.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Box,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Container,
  Layers,
  Package,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fecha } from '@/components/shared/Fecha'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  ADMIN_ROUTES,
  ESTADO_CONTENEDOR_COLORS,
  ESTADO_CONTENEDOR_LABELS,
} from '@/lib/constants'
import type {
  CajaListItem,
  GrupoContenedorCajas,
  GrupoProductoCajas,
} from '@/modules/ordenes-b2b/types'
import { DetalleCajaSheet } from '../DetalleCajaSheet'
import { CajaAgrupadaCard } from './CajaAgrupadaCard'

type Props = (
  | { agruparPor: 'contenedor'; grupos: GrupoContenedorCajas[] }
  | { agruparPor: 'producto'; grupos: GrupoProductoCajas[] }
) & {
  totalGrupos: number
  totalCajas: number
  canEdit: boolean
}

type GrupoNormalizado = {
  key: string
  href: string | null
  titulo: string
  subtitulo: string | null
  estadoLabel: string | null
  estadoColor: string
  fechaEta: string | null
  total_cajas: number
  total_piezas: number
  total_cbm: number
  cajas: CajaListItem[]
}

function normalizarGrupos(props: Props): GrupoNormalizado[] {
  if (props.agruparPor === 'contenedor') {
    return props.grupos.map((g) => ({
      key: g.contenedor_id !== null ? `cont-${g.contenedor_id}` : 'cont-sin',
      href:
        g.contenedor_id && g.contenedor_codigo
          ? ADMIN_ROUTES.contenedores.detalle(g.contenedor_id)
          : null,
      titulo: g.contenedor_codigo ?? 'Sin contenedor asignado',
      subtitulo: null,
      estadoLabel: g.contenedor_estado
        ? ESTADO_CONTENEDOR_LABELS[g.contenedor_estado] ?? g.contenedor_estado
        : null,
      estadoColor: g.contenedor_estado
        ? ESTADO_CONTENEDOR_COLORS[g.contenedor_estado] ?? ''
        : '',
      fechaEta: g.contenedor_fecha_eta,
      total_cajas: g.total_cajas,
      total_piezas: g.total_piezas,
      total_cbm: g.total_cbm,
      cajas: g.cajas,
    }))
  }

  return props.grupos.map((g) => ({
    key: g.producto_id !== null ? `prod-${g.producto_id}` : 'prod-sin',
    href:
      g.producto_id && g.producto_sku
        ? ADMIN_ROUTES.catalogo.detalle(g.producto_id)
        : null,
    titulo: g.producto_sku ?? 'Sin producto asignado',
    subtitulo: g.producto_nombre,
    estadoLabel: null,
    estadoColor: '',
    fechaEta: null,
    total_cajas: g.total_cajas,
    total_piezas: g.total_piezas,
    total_cbm: g.total_cbm,
    cajas: g.cajas,
  }))
}

export function VistaAgrupadaCajas(props: Props) {
  const { agruparPor, totalGrupos, totalCajas, canEdit } = props
  const grupos = useMemo(() => normalizarGrupos(props), [props])

  // Por defecto: solo el primero abierto; los demás comprimidos
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    const first = grupos[0]
    return first ? new Set([first.key]) : new Set()
  })
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const toggleGrupo = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const allExpanded = grupos.length > 0 && grupos.every((g) => expandedKeys.has(g.key))

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedKeys(new Set())
    } else {
      setExpandedKeys(new Set(grupos.map((g) => g.key)))
    }
  }

  const handleOpenDetalle = (cajaId: number) => {
    setSelectedCajaId(cajaId)
    setIsSheetOpen(true)
  }

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground gap-3">
        <Package className="h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">No se encontraron cajas para agrupar</p>
        <p className="text-xs text-muted-foreground">Prueba ajustando los filtros de búsqueda</p>
      </div>
    )
  }

  const labelGrupo =
    agruparPor === 'contenedor'
      ? `${totalGrupos} contenedor${totalGrupos !== 1 ? 'es' : ''}`
      : `${totalGrupos} producto${totalGrupos !== 1 ? 's' : ''}`

  return (
    <div className="space-y-4">
      {/* Banner Informativo + Botón rápido Expandir/Comprimir todos */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            {labelGrupo}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            {totalCajas} caja{totalCajas !== 1 ? 's' : ''} en total
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleAll}
          className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
        >
          {allExpanded ? (
            <>
              <ChevronsDownUp className="h-3.5 w-3.5" />
              Comprimir todos
            </>
          ) : (
            <>
              <ChevronsUpDown className="h-3.5 w-3.5" />
              Expandir todos
            </>
          )}
        </Button>
      </div>

      {/* Bloques Agrupados */}
      <div className="space-y-3">
        {grupos.map((grupo) => {
          const isExpanded = expandedKeys.has(grupo.key)

          return (
            <section key={grupo.key} className="rounded-2xl border bg-muted/15 overflow-hidden">
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGrupo(grupo.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleGrupo(grupo.key)
                  }
                }}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  <span className="h-7 w-7 inline-flex items-center justify-center rounded-lg border bg-background text-muted-foreground shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>

                  <div className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0">
                    {agruparPor === 'contenedor' ? (
                      <Container className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {grupo.href ? (
                      <Link
                        href={grupo.href}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-sm font-bold text-primary hover:underline"
                      >
                        {grupo.titulo}
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">
                        {grupo.titulo}
                      </span>
                    )}

                    {grupo.subtitulo && (
                      <span className="text-xs text-muted-foreground truncate max-w-[260px] sm:max-w-md">
                        {grupo.subtitulo}
                      </span>
                    )}

                    {grupo.estadoLabel && (
                      <Badge
                        variant="secondary"
                        className={cn('text-[11px] font-semibold', grupo.estadoColor)}
                      >
                        {grupo.estadoLabel}
                      </Badge>
                    )}

                    {grupo.fechaEta && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        ETA: <Fecha valor={grupo.fechaEta} formato="fecha" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <Badge variant="outline" className="font-semibold bg-background">
                    {grupo.total_cajas} caja{grupo.total_cajas !== 1 ? 's' : ''}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-muted-foreground font-mono tabular-nums">
                    <Layers className="h-3.5 w-3.5" />
                    <strong className="text-foreground">
                      {grupo.total_piezas.toLocaleString('es-MX')}
                    </strong>{' '}
                    pzas
                  </span>
                  {grupo.total_cbm > 0 && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground font-mono tabular-nums hidden sm:inline-flex">
                      <Box className="h-3.5 w-3.5" />
                      <strong className="text-foreground">{grupo.total_cbm.toFixed(2)}</strong> CBM
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {grupo.cajas.map((caja) => (
                    <CajaAgrupadaCard
                      key={caja.id}
                      caja={caja}
                      canEdit={canEdit}
                      showContenedores={agruparPor === 'producto'}
                      onOpenDetalle={handleOpenDetalle}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Sheet Lateral de Detalle de Caja */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Detalle de Caja</SheetTitle>
          </SheetHeader>
          {selectedCajaId && <DetalleCajaSheet cajaId={selectedCajaId} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}
