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
  oculta:              '🚫 Oculta (No pública)',
  oculto:              '🚫 Oculta (No pública)',
}

export const USO_IMAGEN_COLORS: Record<UsoImagen, string> = {
  principal_ecommerce: 'bg-blue-600 text-white',
  galeria_secundaria:  'bg-purple-600 text-white',
  ficha_tecnica:       'bg-amber-600 text-white',
  marketing_banner:    'bg-green-600 text-white',
  etiqueta_logistica:  'bg-slate-600 text-white',
  color_variacion:     'bg-pink-600 text-white',
  tallas_variacion:    'bg-indigo-600 text-white',
  oculta:              'bg-zinc-600 text-zinc-200 border border-zinc-500/50',
  oculto:              'bg-zinc-600 text-zinc-200 border border-zinc-500/50',
}

export const USO_OPTIONS: UsoImagen[] = [
  'principal_ecommerce',
  'galeria_secundaria',
  'color_variacion',
  'tallas_variacion',
  'ficha_tecnica',
  'etiqueta_logistica',
  'marketing_banner',
  'oculta',
]
