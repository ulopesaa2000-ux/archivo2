// app/(admin)/catalogo/imagenes/components/imagenesConstants.ts
// Constantes para el gestor de imágenes

export const usoImagenOptions = [
  { value: 'principal_ecommerce', label: 'Principal E-commerce' },
  { value: 'galeria_secundaria', label: 'Galería Secundaria' },
  { value: 'color_variacion', label: 'Variación de Color' },
  { value: 'tallas_variacion', label: 'Variación de Talla' },
  { value: 'ficha_tecnica', label: 'Ficha Técnica' },
  { value: 'marketing_banner', label: 'Marketing / Banner' },
  { value: 'etiqueta_logistica', label: 'Etiqueta Logística' },
  { value: 'oculta', label: '🚫 Oculta (No pública)' },
] as const

export const origenOptions = [
  { value: 'local', label: 'Storage (local)' },
  { value: 'url_externa', label: 'URL Externa' },
] as const

export const USO_IMAGEN_LABELS: Record<string, string> = {
  principal_ecommerce: 'Principal E-commerce',
  galeria_secundaria: 'Galería Secundaria',
  ficha_tecnica: 'Ficha Técnica',
  marketing_banner: 'Marketing / Banner',
  etiqueta_logistica: 'Etiqueta Logística',
  color_variacion: 'Variación de Color',
  tallas_variacion: 'Variación de Talla',
  oculta: '🚫 Oculta (No pública)',
  oculto: '🚫 Oculta (No pública)',
}

export const USO_IMAGEN_COLORS: Record<string, string> = {
  principal_ecommerce: 'bg-blue-600 text-white',
  galeria_secundaria: 'bg-purple-600 text-white',
  ficha_tecnica: 'bg-amber-600 text-white',
  marketing_banner: 'bg-green-600 text-white',
  etiqueta_logistica: 'bg-slate-600 text-white',
  color_variacion: 'bg-pink-600 text-white',
  tallas_variacion: 'bg-indigo-600 text-white',
  oculta: 'bg-zinc-600 text-zinc-200 border border-zinc-500/50',
  oculto: 'bg-zinc-600 text-zinc-200 border border-zinc-500/50',
}