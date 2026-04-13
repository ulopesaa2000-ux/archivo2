'use client'

import { ProductGallery } from '@/components/store/producto/ProductGallery'

export function ProductGalleryClient({ 
  imagenes, 
  nombre 
}: { 
  imagenes: { url: string; es_principal: boolean; orden: number }[]
  nombre: string 
}) {
  return (
    <ProductGallery
      imagenes={imagenes}
      nombre={nombre}
    />
  )
}