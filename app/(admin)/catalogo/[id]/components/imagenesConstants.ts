// app/(admin)/catalogo/[id]/components/imagenesConstants.ts
// Constantes compartidas entre TabImagenes, ImagenCard y SubirImagenModal

import type { UsoImagen } from '@/lib/types/tables'

export const USO_IMAGEN_LABELS: Record<UsoImagen, string> = {
  principal_ecommerce: 'Principal E-commerce',
  galeria_secundaria:  'Galería Secundaria',
  ficha_tecnica:       'Ficha Técnica',
  marketing_banner:    'Marketing / Banner',
  etiqueta_logistica:  'Etiqueta Logística',
  color_variacion:     'Variación de Color',
  tallas_variacion:    'Variación de Talla',
}

export const USO_IMAGEN_COLORS: Record<UsoImagen, string> = {
  principal_ecommerce: 'bg-blue-500',
  galeria_secundaria:  'bg-purple-500',
  ficha_tecnica:       'bg-amber-500',
  marketing_banner:    'bg-green-500',
  etiqueta_logistica:  'bg-slate-500',
  color_variacion:     'bg-pink-500',
  tallas_variacion:    'bg-indigo-500',
}

export const USO_OPTIONS: UsoImagen[] = [
  'principal_ecommerce',
  'galeria_secundaria',
  'ficha_tecnica',
  'marketing_banner',
  'etiqueta_logistica',
  'color_variacion',
  'tallas_variacion',
]
