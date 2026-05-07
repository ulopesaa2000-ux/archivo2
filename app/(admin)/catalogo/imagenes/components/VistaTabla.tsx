// app/(admin)/catalogo/imagenes/components/VistaTabla.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ADMIN_ROUTES } from '@/lib/constants'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import { USO_IMAGEN_LABELS, USO_IMAGEN_COLORS } from './imagenesConstants'
import type { ImagenGlobal } from '@/modules/catalogo/imagenes/queries'
import { ImageQuickEdit } from './ImageQuickEdit'
import { ImageLightbox } from './ImageLightbox'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  imagenes: ImagenGlobal[]
}

export function VistaTabla({ imagenes }: Props) {
  const [selectedImagen, setSelectedImagen] = useState<ImagenGlobal | null>(null)
  const [editImagen, setEditImagen] = useState<ImagenGlobal | null>(null)

  if (imagenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground gap-3">
        <div className="text-center">
          <p className="text-sm font-medium">No se encontraron imágenes</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2.5 text-left w-16">Img</th>
              <th className="px-3 py-2.5 text-left">SKU</th>
              <th className="px-3 py-2.5 text-left">Producto</th>
              <th className="px-3 py-2.5 text-left">Tipo</th>
              <th className="px-3 py-2.5 text-left">Origen</th>
              <th className="px-3 py-2.5 text-center">Principal</th>
              <th className="px-3 py-2.5 text-left">Alt Text</th>
              <th className="px-3 py-2.5 text-center w-16">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {imagenes.map((img) => {
              const usoColor = USO_IMAGEN_COLORS[img.uso_imagen] ?? 'bg-gray-500'
              
              return (
                <tr 
                  key={img.id} 
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedImagen(img)}
                >
                  {/* Miniatura */}
                  <td className="px-3 py-2">
                    <div className="relative h-12 w-12 rounded overflow-hidden border bg-muted/30">
                      <Image
                        src={getSmartImagenUrl(img.url, 'thumbnail')}
                        alt={img.alt_text ?? ''}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-3 py-2">
                    <Link
                      href={ADMIN_ROUTES.catalogo.detalle(img.producto_id)}
                      className="font-mono text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {img.sku_base}
                    </Link>
                  </td>

                  {/* Producto */}
                  <td className="px-3 py-2">
                    <span className="text-xs truncate max-w-[150px] block" title={img.descripcion_producto}>
                      {img.descripcion_producto}
                    </span>
                  </td>

                  {/* Tipo */}
                  <td className="px-3 py-2">
                    <span className={cn('text-[10px] text-white font-medium rounded-full px-2 py-0.5', usoColor)}>
                      {USO_IMAGEN_LABELS[img.uso_imagen] ?? img.uso_imagen}
                    </span>
                  </td>

                  {/* Origen */}
                  <td className="px-3 py-2">
                    <span className={cn(
                      'text-[10px] font-medium rounded-full px-2 py-0.5',
                      img.origen_imagen === 'local'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    )}>
                      {img.origen_imagen === 'local' ? 'Storage' : 'URL'}
                    </span>
                  </td>

                  {/* Principal */}
                  <td className="px-3 py-2 text-center">
                    {img.es_principal && (
                      <span className="text-amber-500">
                        <Star className="h-4 w-4 fill-amber-500 inline" />
                      </span>
                    )}
                  </td>

                  {/* Alt text */}
                  <td className="px-3 py-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[200px] block" title={img.alt_text ?? ''}>
                      {img.alt_text || <span className="italic opacity-50">—</span>}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-3 py-2 text-center">
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditImagen(img)
                      }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      {selectedImagen && (
        <ImageLightbox
          imagen={selectedImagen}
          imagenes={imagenes}
          onClose={() => setSelectedImagen(null)}
          onEdit={(img) => {
            setSelectedImagen(null)
            setEditImagen(img)
          }}
        />
      )}

      {editImagen && (
        <ImageQuickEdit
          imagen={editImagen}
          onClose={() => setEditImagen(null)}
        />
      )}
    </>
  )
}