// app/(admin)/catalogo/imagenes/components/VistaAgrupada.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ADMIN_ROUTES } from '@/lib/constants'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import { ImageLightbox } from './ImageLightbox'
import type { ImagenGlobal } from '@/modules/catalogo/imagenes/queries'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  imagenes: ImagenGlobal[]
}

type GrupoProducto = {
  productoId: number
  sku: string
  nombre: string
  descripcion: string
  principal: ImagenGlobal | null
  secundarias: ImagenGlobal[]
  total: number
}

export function VistaAgrupada({ imagenes }: Props) {
  const [lightboxImg, setLightboxImg] = useState<ImagenGlobal | null>(null)

  const grupos = useMemo(() => {
    const map = new Map<number, GrupoProducto>()

    for (const img of imagenes) {
      let grupo = map.get(img.producto_id)
      if (!grupo) {
        grupo = {
          productoId: img.producto_id,
          sku: img.sku_base,
          nombre: img.nombre_producto,
          descripcion: img.descripcion_producto,
          principal: null,
          secundarias: [],
          total: 0,
        }
        map.set(img.producto_id, grupo)
      }

      if (img.es_principal && !grupo.principal) {
        grupo.principal = img
      } else if (grupo.secundarias.length < 3) {
        grupo.secundarias.push(img)
      }
      grupo.total++
    }

    // Fallback: primer imagen como principal si ninguna está marcada
    for (const grupo of map.values()) {
      if (!grupo.principal && grupo.secundarias.length > 0) {
        grupo.principal = grupo.secundarias.shift() ?? null
      }
    }

    return Array.from(map.values())
  }, [imagenes])

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground gap-3">
        <Package className="h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">No se encontraron imágenes agrupadas</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {grupos.map((grupo) => (
          <VistaAgrupadaCard
            key={grupo.productoId}
            grupo={grupo}
            onImageClick={(img) => setLightboxImg(img)}
          />
        ))}
      </div>

      {lightboxImg && (
        <ImageLightbox
          imagen={lightboxImg}
          imagenes={imagenes.filter(i => i.producto_id === lightboxImg.producto_id)}
          onClose={() => setLightboxImg(null)}
          onEdit={() => {}}
        />
      )}
    </>
  )
}

function VistaAgrupadaCard({
  grupo,
  onImageClick,
}: {
  grupo: GrupoProducto
  onImageClick: (img: ImagenGlobal) => void
}) {
  const principal = grupo.principal
  const secundarias = grupo.secundarias
  const thumbWidth = grupo.principal ? 80 : 64

  // SKU prefix para el badge del tab
  const skuPrefix = grupo.sku.split('/')[0] ?? grupo.sku.slice(0, 4)

  return (
    <div className="group flex flex-col bg-card rounded-xl overflow-hidden border border-border transition-all duration-200 hover:border-primary/30 hover:shadow-md relative">
      {/* Tab Header */}
      <div className="h-8 w-full bg-background flex shrink-0">
        <div className="h-full w-2/3 bg-muted/30 group-hover:bg-muted/50 rounded-tr-2xl flex items-center px-3 gap-1.5">
          <div className="h-4 bg-primary/15 rounded-sm flex items-center px-1.5">
            <span className="text-[10px] font-bold text-primary uppercase leading-none">{skuPrefix}</span>
          </div>
        </div>
        <div className="h-full w-1/3 bg-background relative">
          <div className="absolute top-0 right-0 h-6 bg-muted/50 rounded-bl-xl border-l border-b border-border flex items-center justify-center px-2.5 gap-1 min-w-[36px]">
            <span className="text-[10px] font-bold text-primary leading-none">{grupo.total}</span>
          </div>
        </div>
      </div>

      {/* Image Area */}
      <div
        className="p-2.5 flex gap-2.5"
        style={{ minHeight: thumbWidth === 80 ? '16rem' : '14rem' }}
      >
        {/* Main Image */}
        <div className="flex-1 rounded-lg overflow-hidden bg-muted/20 relative cursor-pointer"
          style={{ minHeight: thumbWidth === 80 ? '14rem' : '12rem' }}
          onClick={() => principal && onImageClick(principal)}
        >
          {principal ? (
            <Image
              src={getSmartImagenUrl(principal.url, 'card_lg')}
              alt={principal.alt_text ?? grupo.sku}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <Package className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}

          {/* Overlay en hover */}
          {principal && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
          )}
        </div>

        {/* Secondary images stack */}
        <div className="w-20 flex flex-col gap-2 shrink-0">
          {secundarias.length > 0 ? (
            <>
              {secundarias.slice(0, 3).map((img, idx) => (
                <div
                  key={img.id}
                  className="flex-1 rounded-lg overflow-hidden bg-muted/20 relative cursor-pointer min-h-0"
                  onClick={() => onImageClick(img)}
                >
                  <Image
                    src={getSmartImagenUrl(img.url, 'thumbnail')}
                    alt={img.alt_text ?? ''}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="80px"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
                </div>
              ))}
              {/* Placeholders si faltan */}
              {Array.from({ length: Math.max(0, 3 - secundarias.length) }).map((_, i) => (
                <div
                  key={`ph-${i}`}
                  className="flex-1 rounded-lg bg-muted/10 flex items-center justify-center min-h-0 border border-dashed border-muted-foreground/20"
                >
                  <span className="text-[10px] text-muted-foreground/30">+{i + 1}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={`ph-${i}`}
                  className="flex-1 rounded-lg bg-muted/10 flex items-center justify-center min-h-0 border border-dashed border-muted-foreground/20"
                >
                  <span className="text-[10px] text-muted-foreground/30">+{i + 1}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 pb-2.5 shrink-0">
        <Link
          href={ADMIN_ROUTES.catalogo.detalle(grupo.productoId)}
          className="font-mono text-xs font-bold text-primary hover:underline block truncate uppercase"
        >
          {grupo.sku}
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {grupo.descripcion || grupo.nombre || '—'}
        </p>
      </div>
    </div>
  )
}
