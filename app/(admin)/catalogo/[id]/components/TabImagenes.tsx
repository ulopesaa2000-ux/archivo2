// app/(admin)/catalogo/[id]/components/TabImagenes.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageIcon, Plus, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProductoImagenRow } from '@/lib/types/tables'
import type { UsoImagen } from '@/lib/types/tables'
import { cn } from '@/lib/utils'
import { ImagenCard } from './ImagenCard'
import { SubirImagenModal } from './SubirImagenModal'
import {
  USO_IMAGEN_LABELS,
  USO_IMAGEN_COLORS,
} from './imagenesConstants'

// ─── Componente principal ──────────────────────────────────────────────────────

interface TabImagenesProps {
  imagenes: ProductoImagenRow[]
  productoId: number
  skuBase: string
  canEdit?: boolean
}

export function TabImagenes({ imagenes, productoId, skuBase, canEdit = true }: TabImagenesProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [vista, setVista]         = useState<'grid' | 'list'>('grid')

  // ── Estadísticas rápidas ──────────────────────────────────
  const principal    = imagenes.find((i) => i.es_principal)
  const contadorUso  = imagenes.reduce<Record<string, number>>((acc, img) => {
    acc[img.uso_imagen] = (acc[img.uso_imagen] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4 mt-4">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Info rápida */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>
            <span className="font-semibold text-foreground">{imagenes.length}</span>{' '}
            imagen{imagenes.length !== 1 ? 'es' : ''}
          </span>
          {principal ? (
            <span className="flex items-center gap-1 text-amber-600">
              ★ Principal asignada
            </span>
          ) : (
            <span className="text-red-500">⚠ Sin imagen principal</span>
          )}
          {Object.entries(contadorUso).map(([uso, count]) => (
            <span
              key={uso}
              className={cn(
                'text-white text-[10px] font-medium rounded-full px-2 py-0.5',
                USO_IMAGEN_COLORS[uso as UsoImagen] ?? 'bg-gray-400'
              )}
            >
              {USO_IMAGEN_LABELS[uso as UsoImagen] ?? uso}: {count}
            </span>
          ))}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Toggle de vista */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              className={cn('px-2 py-1.5', vista === 'grid' ? 'bg-muted' : 'hover:bg-muted/50')}
              onClick={() => setVista('grid')}
              title="Vista grilla"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              className={cn('px-2 py-1.5 border-l', vista === 'list' ? 'bg-muted' : 'hover:bg-muted/50')}
              onClick={() => setVista('list')}
              title="Vista lista"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {canEdit && (
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Agregar imagen
            </Button>
          )}
        </div>
      </div>

      {/* ── Contenido ────────────────────────────────────────── */}
      {imagenes.length === 0 ? (
        <EmptyState onAdd={canEdit ? () => setModalOpen(true) : undefined} />
      ) : vista === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {imagenes
            .sort((a, b) => {
              if (a.es_principal && !b.es_principal) return -1
              if (!a.es_principal && b.es_principal) return 1
              return (a.orden ?? 0) - (b.orden ?? 0)
            })
            .map((img) => (
              <ImagenCard key={img.id} imagen={img} productoId={productoId} canEdit={canEdit} />
            ))}
        </div>
      ) : (
        /* Vista Lista */
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left w-16">Preview</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Alt text</th>
                <th className="px-4 py-2 text-center">Orden</th>
                <th className="px-4 py-2 text-center">Principal</th>
                <th className="px-4 py-2 text-center">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {imagenes
                .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                .map((img) => (
                  <tr key={img.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2">
                      <div className="relative h-10 w-10 rounded overflow-hidden border bg-muted/30">
                        <Image
                          src={img.url}
                          alt={img.alt_text ?? ''}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn('text-[10px] text-white font-medium rounded-full px-2 py-0.5', USO_IMAGEN_COLORS[img.uso_imagen as UsoImagen] ?? 'bg-gray-400')}>
                        {USO_IMAGEN_LABELS[img.uso_imagen as UsoImagen] ?? img.uso_imagen}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs max-w-[200px] truncate">
                      {img.alt_text || <span className="italic opacity-50">—</span>}
                    </td>
                    <td className="px-4 py-2 text-center text-xs">{img.orden}</td>
                    <td className="px-4 py-2 text-center">
                      {img.es_principal && <span className="text-amber-500">★</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={cn(
                        'text-[10px] font-medium rounded-full px-2 py-0.5',
                        img.origen_imagen === 'local'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      )}>
                        {img.origen_imagen === 'local' ? 'Storage' : 'URL externa'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal de subida ──────────────────────────────────── */}
      <SubirImagenModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        productoId={productoId}
        skuBase={skuBase}
        totalImagenes={imagenes.length}
      />
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground gap-3">
      <div className="rounded-full bg-muted p-4">
        <ImageIcon className="h-8 w-8 opacity-40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Sin imágenes registradas</p>
        <p className="text-xs opacity-70 mt-1">
          {onAdd ? 'Sube la primera imagen del producto para empezar' : 'No hay imágenes disponibles'}
        </p>
      </div>
      {onAdd && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Agregar primera imagen
        </Button>
      )}
    </div>
  )
}
