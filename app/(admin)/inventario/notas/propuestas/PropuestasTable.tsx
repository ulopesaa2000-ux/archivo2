// app/(admin)/inventario/notas/propuestas/PropuestasTable.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/admin/Pagination'
import { eliminarOcrPropuestaAction } from '@/modules/inventario/actions'
import type { NotaOcrPropuesta } from '@/modules/inventario/types'
import { Trash2, Eye, ArrowRight, CheckCircle2, AlertTriangle, HelpCircle, ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Fecha } from '@/components/shared/Fecha'

type Props = {
  propuestas: NotaOcrPropuesta[]
  total: number
  page: number
  estado: 'PENDIENTE_REVISION' | 'REVISADO'
}

function ImageLightbox({ url, title }: { url: string; title: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="relative w-12 h-16 rounded-md overflow-hidden border hover:border-primary/60 transition-all bg-muted shrink-0 group flex items-center justify-center"
          />
        }
      >
        <div className="relative w-full h-full">
          <Image
            src={url}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="48px"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye className="h-3 w-3 text-white" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden bg-background border shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-[4/3] max-h-[80vh] flex items-center justify-center p-4">
          <Image
            src={url}
            alt={title}
            fill
            className="object-contain p-2"
            sizes="(max-w-768px) 100vw, 800px"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PropuestasTable({ propuestas, total, page, estado }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar/descartar esta propuesta OCR?')) return

    setDeletingId(id)
    startTransition(async () => {
      try {
        const res = await eliminarOcrPropuestaAction(id)
        if (res.success) {
          toast.success('Propuesta descartada correctamente.')
          router.refresh()
        } else {
          toast.error(res.error || 'Error al descartar la propuesta.')
        }
      } catch (err) {
        toast.error('Error de conexión con el servidor.')
      } finally {
        setDeletingId(null)
      }
    })
  }

  const renderConfidenceBadge = (val: number | null) => {
    if (val === null) return <Badge variant="secondary"><HelpCircle className="h-3 w-3 mr-1" /> N/A</Badge>
    
    const percentage = Math.round(val * 100)
    if (percentage >= 80) {
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-300/30 font-bold">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {percentage}%
        </Badge>
      )
    } else if (percentage >= 50) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400 border border-yellow-300/30 font-bold">
          <AlertTriangle className="h-3 w-3 mr-1" /> {percentage}%
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 border border-red-300/30 font-bold">
          <AlertTriangle className="h-3 w-3 mr-1" /> {percentage}%
        </Badge>
      )
    }
  }

  if (propuestas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed rounded-2xl bg-muted/20 text-center p-8 space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <ImageIcon className="h-8 w-8 text-muted-foreground opacity-60" />
        </div>
        <div className="max-w-sm space-y-1">
          <p className="font-bold text-sm">No se encontraron propuestas</p>
          <p className="text-xs text-muted-foreground">
            {estado === 'PENDIENTE_REVISION'
              ? 'No hay propuestas OCR pendientes de revisión en este momento.'
              : 'No hay historial de propuestas procesadas todavía.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-2xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Imagen</TableHead>
              <TableHead className="w-[140px]">Origen Detectado</TableHead>
              <TableHead className="w-[180px]">Destino / Mov.</TableHead>
              <TableHead className="w-[140px] text-center">Líneas Extraídas</TableHead>
              <TableHead className="w-[100px] text-center">Confianza</TableHead>
              <TableHead className="w-[150px]">Fecha Escaneo</TableHead>
              {estado === 'REVISADO' && <TableHead className="w-[150px]">Revisado por</TableHead>}
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propuestas.map((p) => {
              const cantLineas = p.lineas?.length ?? 0
              const folioLabel = p.folio_detectado ? `Folio: ${p.folio_detectado}` : 'Sin Folio'
              const previewTitle = `Nota OCR #${p.id} — ${folioLabel}`

              return (
                <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell>
                    {p.comprobante_url ? (
                      <ImageLightbox url={p.comprobante_url} title={previewTitle} />
                    ) : (
                      <div className="w-12 h-16 rounded-md bg-muted border flex items-center justify-center text-muted-foreground shrink-0">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm tracking-tight truncate max-w-[130px]">{p.origen_detectado || '—'}</span>
                      {p.bodega_origen_nombre && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-muted-foreground/10 mt-1 self-start">
                          Asignada: {p.bodega_origen_nombre}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm tracking-tight truncate max-w-[170px]">{p.destino_detectado || '—'}</span>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[9px] font-black uppercase py-0.5 leading-none">
                          {p.tipo_movimiento_detectado || 'traspaso'}
                        </Badge>
                        {p.bodega_destino_nombre && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-muted-foreground/10">
                            Asignada: {p.bodega_destino_nombre}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-sm">
                    {cantLineas} {cantLineas === 1 ? 'producto' : 'productos'}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderConfidenceBadge(p.confianza_global)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <Fecha valor={p.created_at} formato="fecha-hora" />
                  </TableCell>
                  {estado === 'REVISADO' && (
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold">{p.revisado_por_nombre || 'Usuario'}</span>
                        {p.revisado_en && (
                          <span className="text-[9px] text-muted-foreground font-mono">
                            <Fecha valor={p.revisado_en} formato="fecha-hora" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {estado === 'PENDIENTE_REVISION' ? (
                        <>
                          <Link href={`/inventario/notas/nueva?propuesta_id=${p.id}&edit_ocr=true`}>
                            <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/5">
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Editar SKUs</span>
                            </Button>
                          </Link>
                          <Link href={`/inventario/notas/nueva?propuesta_id=${p.id}`}>
                            <Button size="sm" className="rounded-xl h-8 text-xs uppercase font-black tracking-wider gap-1">
                              Revisar
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending && deletingId === p.id}
                            onClick={() => handleDelete(p.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl shrink-0"
                            title="Descartar propuesta"
                          >
                            {isPending && deletingId === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {(!p.nota_estado_codigo || p.nota_estado_codigo === 'PEND') && (
                            <Link href={`/inventario/notas/nueva?propuesta_id=${p.id}&edit_ocr=true`}>
                              <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/5">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>Editar SKUs</span>
                              </Button>
                            </Link>
                          )}
                          {p.nota_id && (
                            <Link href={`/inventario/notas/${p.nota_id}`}>
                              <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs uppercase font-black tracking-wider gap-1 border-emerald-500/20 hover:bg-emerald-50 text-emerald-700">
                                Ver Nota {p.nota_numero ? `#${p.nota_numero}` : ''}
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Pagination total={total} />
    </div>
  )
}
