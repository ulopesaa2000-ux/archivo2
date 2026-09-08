// app/(admin)/catalogo/imagenes/components/VistaAgrupada.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ADMIN_ROUTES } from '@/lib/constants'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import type { GrupoProductoConImagenes, ImagenGlobal } from '@/modules/catalogo/imagenes/queries'
import { Package, Layers, Image as ImageIcon, Eye, EyeOff } from 'lucide-react'
import { cambiarUsoImagenRapidoAction } from '@/modules/catalogo/imagenes/actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Dynamic imports para eliminar code bloat inicial
const ImageLightbox = dynamic(
  () => import('./ImageLightbox').then((m) => m.ImageLightbox),
  { ssr: false }
)
const ImageQuickEdit = dynamic(
  () => import('./ImageQuickEdit').then((m) => m.ImageQuickEdit),
  { ssr: false }
)

interface Props {
  grupos: GrupoProductoConImagenes[]
  totalGrupos: number
  totalImagenes: number
}

export function VistaAgrupada({ grupos, totalGrupos, totalImagenes }: Props) {
  const [lightboxData, setLightboxData] = useState<{
    imagen: ImagenGlobal
    imagenes: ImagenGlobal[]
  } | null>(null)
  const [editImagen, setEditImagen] = useState<ImagenGlobal | null>(null)

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground gap-3">
        <Package className="h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">No se encontraron productos con imágenes agrupadas</p>
        <p className="text-xs text-muted-foreground">Prueba ajustando los filtros de búsqueda</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Banner Informativo de Agrupación Global */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            {totalGrupos} productos agrupados
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>{totalImagenes} imágenes en total</span>
          <span className="text-muted-foreground/40 hidden sm:inline">·</span>
          <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-medium">
            Ordenados de lo más reciente a lo más antiguo
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground/80 hidden md:inline">
          1 recuadro unificado por cada SKU
        </span>
      </div>

      {/* Grid de Productos Agrupados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {grupos.map((grupo) => (
          <VistaAgrupadaCard
            key={grupo.productoId}
            grupo={grupo}
            onImageClick={(img) =>
              setLightboxData({
                imagen: img,
                imagenes: grupo.imagenes,
              })
            }
          />
        ))}
      </div>

      {/* Modales cargados dinámicamente sin lag */}
      {lightboxData && (
        <ImageLightbox
          imagen={lightboxData.imagen}
          imagenes={lightboxData.imagenes}
          onClose={() => setLightboxData(null)}
          onEdit={(img) => {
            setLightboxData(null)
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
    </div>
  )
}

function VistaAgrupadaCard({
  grupo,
  onImageClick,
}: {
  grupo: GrupoProductoConImagenes
  onImageClick: (img: ImagenGlobal) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const principal = grupo.principal
  const secundarias = grupo.secundarias
  const thumbWidth = grupo.principal ? 80 : 64

  const isPrincipalOculta =
    principal?.uso_imagen === 'oculta' || principal?.uso_imagen === 'oculto'

  // Prefix o clean SKU
  const skuPrefix = grupo.sku.split('/')[0]?.trim() || grupo.sku.slice(0, 8)
  const remainingCount = secundarias.length > 3 ? secundarias.length - 2 : 0

  const handleToggleOculta = (img: ImagenGlobal, e: React.MouseEvent) => {
    e.stopPropagation()
    const isCurrentlyOculta =
      img.uso_imagen === 'oculta' || img.uso_imagen === 'oculto'
    const nuevoUso = isCurrentlyOculta ? 'galeria_secundaria' : 'oculta'

    startTransition(async () => {
      const res = await cambiarUsoImagenRapidoAction(img.id, nuevoUso)
      if (res.success) {
        toast.success(
          nuevoUso === 'oculta'
            ? 'Imagen pasada a Oculta'
            : 'Imagen pasada a Galería visible'
        )
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al cambiar visibilidad')
      }
    })
  }

  return (
    <div
      className={cn(
        'group flex flex-col bg-card rounded-xl overflow-hidden border border-border transition-all duration-200 hover:border-primary/30 hover:shadow-md relative',
        isPending && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Tab Header */}
      <div className="h-8 w-full bg-background flex shrink-0 border-b border-border/50">
        <div className="h-full flex-1 bg-muted/30 group-hover:bg-muted/50 rounded-tr-2xl flex items-center px-3 gap-1.5 min-w-0">
          <div className="h-4 bg-primary/15 rounded-sm flex items-center px-1.5 shrink-0">
            <span className="text-[10px] font-bold text-primary uppercase leading-none truncate">
              {skuPrefix}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
            {grupo.nombre || grupo.descripcion}
          </span>
        </div>
        <div className="h-full bg-background relative shrink-0">
          <div
            className={cn(
              'h-6 rounded-bl-xl border-l border-b flex items-center justify-center px-2.5 gap-1 min-w-[42px]',
              grupo.total > 1
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-muted/50 border-border text-muted-foreground'
            )}
            title={`${grupo.total} imagen${grupo.total !== 1 ? 'es' : ''} asociadas a este SKU`}
          >
            <ImageIcon className="h-2.5 w-2.5 opacity-70" />
            <span className="text-[10px] font-bold leading-none">{grupo.total}</span>
          </div>
        </div>
      </div>

      {/* Image Area */}
      <div
        className="p-2.5 flex gap-2.5"
        style={{ minHeight: thumbWidth === 80 ? '16rem' : '14rem' }}
      >
        {/* Main Hero Image */}
        <div
          className={cn(
            'flex-1 rounded-lg overflow-hidden bg-muted/20 relative cursor-pointer group/hero border border-border/40 transition-all duration-200',
            isPrincipalOculta &&
              'ring-2 ring-red-500/80 shadow-[0_0_14px_rgba(239,68,68,0.45)] border-red-500/60'
          )}
          style={{ minHeight: thumbWidth === 80 ? '14rem' : '12rem' }}
          onClick={() => principal && onImageClick(principal)}
        >
          {principal ? (
            <Image
              src={getSmartImagenUrl(principal.url, 'card')}
              alt={principal.alt_text ?? grupo.sku}
              fill
              className="object-contain transition-transform duration-300 group-hover/hero:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <Package className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}

          {/* Badge Principal */}
          {principal?.es_principal && (
            <div className="absolute top-1.5 left-1.5 bg-amber-400/95 text-amber-950 text-[9px] font-bold rounded px-1.5 py-0.5 shadow-sm flex items-center gap-0.5 z-10">
              ★ Principal
            </div>
          )}

          {/* Badge Oculta si la foto principal es oculta */}
          {isPrincipalOculta && (
            <div className="absolute top-1.5 right-1.5 bg-red-600/95 text-white text-[9px] font-bold rounded px-1.5 py-0.5 shadow-sm flex items-center gap-0.5 z-10 animate-pulse">
              🚫 Oculta
            </div>
          )}

          {/* Overlay en hover con acción rápida */}
          {principal && (
            <div className="absolute inset-0 bg-black/0 group-hover/hero:bg-black/25 transition-all duration-200 flex items-center justify-center">
              <span className="text-white text-xs font-medium opacity-0 group-hover/hero:opacity-100 transition-opacity duration-200 bg-black/60 rounded px-2 py-1">
                Ver imagen
              </span>

              {/* Botón rápido para cambiar estado de oculta / visible */}
              <button
                type="button"
                onClick={(e) => handleToggleOculta(principal, e)}
                title={
                  isPrincipalOculta
                    ? 'Hacer visible (Galería)'
                    : 'Ocultar esta imagen'
                }
                className="absolute bottom-2 right-2 z-20 h-7 w-7 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 opacity-0 group-hover/hero:opacity-100"
              >
                {isPrincipalOculta ? (
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-red-400" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Secondary images stack (miniaturas con sombra roja si son ocultas) */}
        {secundarias.length > 0 ? (
          <div className="w-20 flex flex-col gap-2 shrink-0">
            {secundarias.slice(0, 3).map((img, idx) => {
              const isLastWithMore = idx === 2 && remainingCount > 0
              const isImgOculta =
                img.uso_imagen === 'oculta' || img.uso_imagen === 'oculto'

              return (
                <div
                  key={img.id}
                  className={cn(
                    'flex-1 rounded-lg overflow-hidden bg-muted/20 relative cursor-pointer min-h-0 border border-border/40 group/sub transition-all duration-200',
                    isImgOculta &&
                      'ring-2 ring-red-500/90 shadow-[0_0_10px_rgba(239,68,68,0.55)] border-red-500/80'
                  )}
                  onClick={() => onImageClick(img)}
                  title={
                    isImgOculta
                      ? '🚫 Imagen Oculta (No visible en tienda)'
                      : img.alt_text ?? `Foto secundaria ${idx + 1}`
                  }
                >
                  <Image
                    src={getSmartImagenUrl(img.url, 'thumbnail')}
                    alt={img.alt_text ?? ''}
                    fill
                    className="object-cover transition-transform duration-300 group-hover/sub:scale-105"
                    sizes="80px"
                    loading="lazy"
                  />

                  {/* Badge de Oculta en miniatura */}
                  {isImgOculta && (
                    <span className="absolute top-1 right-1 z-10 bg-red-600 text-white text-[8px] font-bold px-1 rounded shadow-sm">
                      🚫
                    </span>
                  )}

                  <div className="absolute inset-0 bg-black/0 group-hover/sub:bg-black/30 transition-all duration-200" />

                  {/* Botón rápido de cambio de visibilidad en hover de miniatura */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleOculta(img, e)}
                    title={
                      isImgOculta
                        ? 'Hacer visible (Galería)'
                        : 'Ocultar esta imagen'
                    }
                    className="absolute bottom-1 right-1 z-20 h-5 w-5 rounded-full bg-black/85 hover:bg-black text-white flex items-center justify-center shadow opacity-0 group-hover/sub:opacity-100 transition-opacity"
                  >
                    {isImgOculta ? (
                      <Eye className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-red-400" />
                    )}
                  </button>

                  {isLastWithMore && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <span className="text-white text-[11px] font-bold">
                        +{remainingCount + 1}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-3 pb-2.5 shrink-0 border-t border-border/30 pt-2">
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
