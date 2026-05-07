// app/(admin)/catalogo/imagenes/components/imagenesConstants.ts
// Constantes para el gestor de imágenes

export const usoImagenOptions = [
  { value: 'principal_ecommerce', label: 'Principal E-commerce' },
  { value: 'galeria_secundaria', label: 'Galería Secundaria' },
  { value: 'ficha_tecnica', label: 'Ficha Técnica' },
  { value: 'marketing_banner', label: 'Marketing / Banner' },
  { value: 'etiqueta_logistica', label: 'Etiqueta Logística' },
  { value: 'color_variacion', label: 'Variación de Color' },
  { value: 'tallas_variacion', label: 'Variación de Talla' },
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
}

export const USO_IMAGEN_COLORS: Record<string, string> = {
  principal_ecommerce: 'bg-blue-500',
  galeria_secundaria: 'bg-purple-500',
  ficha_tecnica: 'bg-amber-500',
  marketing_banner: 'bg-green-500',
  etiqueta_logistica: 'bg-slate-500',
  color_variacion: 'bg-pink-500',
  tallas_variacion: 'bg-indigo-500',
}