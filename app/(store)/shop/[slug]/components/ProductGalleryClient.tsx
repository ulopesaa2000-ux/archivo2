'use client'

import dynamic from 'next/dynamic'
import { type ProductGalleryProps } from '@/components/store/producto/ProductGallery'

// Dynamic import for ProductGallery with ssr: false
const ProductGallery = dynamic(
  () => import('@/components/store/producto/ProductGallery'),
  {
    loading: () => (
      <div className="aspect-square bg-[var(--surface)] border border-store-border animate-pulse rounded-md flex items-center justify-center">
        <span className="text-store-ink3">Cargando galería...</span>
      </div>
    ),
    ssr: false
  }
)

interface ProductGalleryClientProps extends ProductGalleryProps {}

export function ProductGalleryClient({ imagenes, nombre }: ProductGalleryClientProps) {
  return (
    <ProductGallery
      imagenes={imagenes}
      nombre={nombre}
    />
  )
}