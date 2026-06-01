// app/(admin)/inventario/notas/[id]/components/NotaCabecera.tsx
'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  Scale, 
  RotateCcw,
  User,
  Calendar,
  Box,
  Hash,
  MessageSquare,
  Printer,
  Upload,
  Camera,
  Trash2,
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react'
import {
  ADMIN_ROUTES, ESTADO_NOTA_COLORS,
  TIPO_MOVIMIENTO_COLORS,
} from '@/lib/constants'
import type { NotaListItem } from '@/modules/inventario/types'
import { cn } from '@/lib/utils'
import { subirComprobanteNotaAction, eliminarComprobanteNotaAction } from '@/modules/inventario/actions'
import Image from 'next/image'

const ICONS_MAP: Record<string, any> = {
  ENT: ArrowDownLeft,
  SAL: ArrowUpRight,
  TRF: ArrowLeftRight,
  AJU: Scale,
  DEV: RotateCcw,
}

export function NotaCabecera({ nota }: { nota: NotaListItem }) {
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(nota.comprobante_url)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const estadoColor = ESTADO_NOTA_COLORS[nota.estado_codigo] ?? 'bg-gray-100 text-gray-800'
  const Icon = ICONS_MAP[nota.tipo_codigo] ?? Box
  const tipoColor = TIPO_MOVIMIENTO_COLORS[nota.tipo_codigo] ?? ''

  // Cargar imagen
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await subirComprobanteNotaAction(nota.id, formData)
      if (res.success) {
        // Obtenemos la URL de forma optimizada
        setComprobanteUrl(URL.createObjectURL(file)) // Optimización local temporal antes de recarga
        // Recargar página para reflejar cambios reales de Storage
        window.location.reload()
      } else {
        setError(res.error ?? 'Fallo al subir el archivo.')
      }
    })
  }

  // Eliminar imagen
  const handleDelete = () => {
    if (!window.confirm('¿Seguro que deseas eliminar el comprobante físico?')) return
    setError(null)
    startTransition(async () => {
      const res = await eliminarComprobanteNotaAction(nota.id)
      if (res.success) {
        setComprobanteUrl(null)
        window.location.reload()
      } else {
        setError(res.error ?? 'Fallo al borrar el archivo.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href={ADMIN_ROUTES.inventario.notas}
            className="hover:text-foreground transition-all flex items-center gap-1 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Regresar a Notas</span>
          </Link>
          <span>/</span>
          <span className="text-foreground font-bold tracking-wider font-mono bg-muted/50 px-2 py-0.5 rounded border leading-none">
            {nota.numero_nota}
          </span>
        </div>

        {/* Botón de Impresión Membretada Premium */}
        <Link href={`/print/inventario/notas/${nota.id}`} target="_blank">
          <Button variant="outline" className="rounded-xl font-bold uppercase tracking-wider h-10 border shadow-sm group">
            <Printer className="mr-2 h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            Imprimir Formato
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold rounded-xl animate-bounce">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <Card className="overflow-hidden border-none shadow-xl shadow-black/5 bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left Section: Main ID and Type */}
            <div className="md:col-span-8 p-6 lg:p-8 space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className={cn(
                  "p-3 rounded-2xl shadow-inner",
                  tipoColor.split(' ')[0] // Taking bg color
                )}>
                  <Icon className="h-8 w-8 text-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tighter font-mono">
                    {nota.numero_nota}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <Badge className={cn("px-4 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest border-none shadow-sm", estadoColor)}>
                      {nota.estado_nombre}
                    </Badge>
                    <div className="flex items-center gap-1.5 px-3 py-0.5 bg-muted rounded-full border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <Hash className="h-3 w-3" />
                      Ref: {nota.id}
                    </div>
                    {nota.costo_total !== undefined && nota.costo_total !== null && Number(nota.costo_total) > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-[11px] font-bold uppercase tracking-wider shadow-sm">
                        Costo: ${Number(nota.costo_total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                <div className="space-y-2 group">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Bodega Origen
                  </div>
                  <div className="p-4 rounded-xl bg-background/50 border shadow-sm group-hover:border-emerald-500/30 transition-colors">
                    <p className="font-bold text-lg">{nota.bodega_origen_nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground">{nota.bodega_origen_codigo}</p>
                  </div>
                </div>

                {nota.bodega_destino_nombre && (
                  <div className="space-y-2 group">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Bodega Destino
                    </div>
                    <div className="p-4 rounded-xl bg-background/50 border shadow-sm group-hover:border-blue-500/30 transition-colors">
                      <p className="font-bold text-lg">{nota.bodega_destino_nombre}</p>
                      <p className="text-xs font-mono text-muted-foreground">{nota.bodega_destino_codigo}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Metadata Stats */}
            <div className="md:col-span-4 bg-muted/40 border-l p-6 lg:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="flex items-center gap-4 group">
                  <div className="p-2 rounded-lg bg-background border shadow-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Fecha Nota</span>
                    <span className="text-sm font-semibold tracking-tight"><Fecha valor={nota.fecha_nota} formato="fecha-hora" /></span>
                  </div>
                </div>

                {nota.fecha_confirmacion && (
                  <div className="flex items-center gap-4 group">
                    <div className="p-2 rounded-lg bg-background border shadow-sm border-emerald-500/20">
                      <Calendar className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-tighter">Finalizada</span>
                      <span className="text-sm font-bold tracking-tight text-emerald-700/80"><Fecha valor={nota.fecha_confirmacion} formato="fecha-hora" /></span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 group">
                  <div className="p-2 rounded-lg bg-background border shadow-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Gestionado por</span>
                    <span className="text-sm font-semibold tracking-tight">{nota.usuario_nombre}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 group p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-md">
                    <Box className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest">Total Cajas</span>
                    <span className="text-2xl font-black tabular-nums tracking-tighter leading-none">{nota.total_cajas ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comprobante Físico Integration */}
          <div className="border-t bg-background/20 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {(nota.nota_referencia || nota.observaciones) && (
                <div className="flex flex-col gap-4">
                  {nota.nota_referencia && (
                    <div className="flex items-start gap-2">
                      <Hash className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">Referencia Externa</span>
                        <p className="text-sm font-medium leading-tight">{nota.nota_referencia}</p>
                      </div>
                    </div>
                  )}
                  {nota.observaciones && (
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">Observaciones</span>
                        <p className="text-sm leading-tight text-muted-foreground">{nota.observaciones}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comprobante Físico Uploader / Viewer on Details Page */}
            <div className="border-l lg:pl-6 space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none block mb-1">Comprobante Firmado</span>
              {comprobanteUrl ? (
                <div className="relative group rounded-xl overflow-hidden border bg-background aspect-video shadow-sm">
                  <Image
                    src={comprobanteUrl}
                    alt="Comprobante de entrega firmado"
                    fill
                    className="object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={comprobanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 shadow-md text-xs font-bold flex items-center justify-center"
                      title="Ver en pantalla completa"
                    >
                      <FileText className="h-4 w-4" />
                    </a>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <Input
                    type="file"
                    id="comprobante-viewer-uploader"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={isPending}
                  />
                  <Label
                    htmlFor="comprobante-viewer-uploader"
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer bg-background hover:bg-muted/10 transition-all text-center min-h-[90px]"
                  >
                    {isPending ? (
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground opacity-60 mb-1" />
                        <span className="text-[10px] font-black uppercase tracking-tight text-foreground/80">Subir foto firmada</span>
                      </>
                    )}
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
