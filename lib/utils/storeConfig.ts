// lib/utils/storeConfig.ts

export type TextSizeOption = 'small' | 'normal' | 'large'

export interface StoreContacto {
  id: string
  nombre: string
  zona: string
  telefono_display: string
  phone_raw: string
  activo: boolean
  orden: number
}

export interface ParsedStoreConfig {
  heroTitle: string
  heroTitleSize: TextSizeOption
  heroDescription: string
  heroDescriptionSize: TextSizeOption
  heroBadge: string

  exploraTitle: string
  exploraTitleSize: TextSizeOption
  exploraCategoria: string
  exploraCategoriaSize: TextSizeOption

  categoriasGridTitle: string
  categoriasGridTitleSize: TextSizeOption
  categoriasGridSubtitle: string
  categoriasGridSubtitleSize: TextSizeOption

  destacadosTitle: string
  destacadosTitleSize: TextSizeOption
  destacadosSubtitle: string
  destacadosSubtitleSize: TextSizeOption

  contactosTitle: string
  contactosTitleSize: TextSizeOption
  contactosSubtitle: string
  contactosSubtitleSize: TextSizeOption
  contactosLista: StoreContacto[]

  footerAgradecimiento: string
  footerAgradecimientoSize: TextSizeOption
}

export const DEFAULT_STORE_CONFIG: ParsedStoreConfig = {
  heroTitle: 'Estilo, Calidad y Comodidad Exclusiva',
  heroTitleSize: 'normal',
  heroDescription: 'Nos alegra que formes parte de esta experiencia. Aquí encontrarás nuestra colección diseñada para ofrecerte prendas de alta gama que combinan diseño y durabilidad para cada ocasión.',
  heroDescriptionSize: 'normal',
  heroBadge: 'Bienvenido a Catálogo IDOL NAVY',

  exploraTitle: 'Explora por Categoría',
  exploraTitleSize: 'normal',
  exploraCategoria: 'Explora cada una de nuestras opciones y descubre los diseños que mejor se adapten a tu personalidad. Nos esforzamos por brindarte productos de excelente calidad y una atención cercana para que tu experiencia sea la mejor.',
  exploraCategoriaSize: 'normal',

  categoriasGridTitle: 'Catálogo por Líneas',
  categoriasGridTitleSize: 'normal',
  categoriasGridSubtitle: 'Encuentra prendas exclusivas para Dama, Caballero e Infantil',
  categoriasGridSubtitleSize: 'normal',

  destacadosTitle: 'Próximas Llegadas / Destacados',
  destacadosTitleSize: 'normal',
  destacadosSubtitle: 'Explora las prendas destacadas de la nueva temporada',
  destacadosSubtitleSize: 'normal',

  contactosTitle: 'Atención Personalizada y Contactos',
  contactosTitleSize: 'normal',
  contactosSubtitle: 'Si necesitas más información sobre algún modelo, tallas, colores o disponibilidad, consulta con tu distribuidor autorizado de tu región.',
  contactosSubtitleSize: 'normal',
  contactosLista: [
    { id: 'c-daniel', nombre: 'Daniel', zona: 'Zona Centro CDMX', telefono_display: '248 125 0472', phone_raw: '522481250472', activo: true, orden: 0 },
    { id: 'c-javier', nombre: 'Javier', zona: 'Tulancingo Hgo.', telefono_display: '56 1549 5410', phone_raw: '525615495410', activo: true, orden: 1 },
    { id: 'c-carlos', nombre: 'Carlos', zona: 'Moroleón Gto.', telefono_display: '55 3935 6156', phone_raw: '525539356156', activo: true, orden: 2 },
    { id: 'c-juan', nombre: 'Juan', zona: 'San Martín / Toluca / Chiconcuac', telefono_display: '248 125 1671', phone_raw: '522481251671', activo: true, orden: 3 },
  ],

  footerAgradecimiento: '¡Gracias por confiar en nosotros y ser parte de nuestra comunidad!',
  footerAgradecimientoSize: 'large',
}

export function normalizePhoneRaw(input: string | null | undefined): string {
  return (input || '').replace(/\D/g, '')
}

export function buildWhatsAppLink(contacto: Pick<StoreContacto, 'nombre' | 'phone_raw'>): string {
  const raw = normalizePhoneRaw(contacto.phone_raw)
  const text = encodeURIComponent(`Hola ${contacto.nombre}, vengo del Catálogo IDOL NAVY.`)
  return `https://wa.me/${raw}?text=${text}`
}

export function getContactosActivos(config: ParsedStoreConfig): StoreContacto[] {
  return [...(config.contactosLista || [])]
    .filter((c) => c.activo && c.nombre.trim() && normalizePhoneRaw(c.phone_raw))
    .sort((a, b) => a.orden - b.orden)
}

export const ZONA_OTRA_REGION = 'Otra región / Envíos a todo México'

const ZONAS_FALLBACK = [
  'Centro / Ciudad de México',
  'Tulancingo, Hgo.',
  'Moroleón, Gto.',
  'San Martín Texmelucan, Pue.',
  'Toluca, Edo. Méx.',
  'Chiconcuac, Edo. Méx.',
]

/**
 * Zonas de atención para el formulario de cotización.
 * Fuente única: zonas de los encargados del JSON; fallback histórico si está vacío.
 */
export function getZonasAtencion(config: ParsedStoreConfig): string[] {
  const zonas = [...new Set(
    getContactosActivos(config).map((c) => c.zona.trim()).filter(Boolean)
  )]
  const base = zonas.length > 0 ? zonas : [...ZONAS_FALLBACK]
  if (!base.includes(ZONA_OTRA_REGION)) base.push(ZONA_OTRA_REGION)
  return base
}

function parseContactosLista(raw: unknown): StoreContacto[] {
  if (!Array.isArray(raw)) return DEFAULT_STORE_CONFIG.contactosLista
  const parsed = (raw as unknown[]).map((item, index) => {
    const c = (item || {}) as Record<string, unknown>
    const nombre = String(c.nombre || '').slice(0, 80)
    const phoneRaw = normalizePhoneRaw(String(c.phone_raw || (c as Record<string, unknown>).phoneRaw || '')).slice(0, 20)
    if (!nombre.trim() || !phoneRaw) return null
    return {
      id: String(c.id || `c-${index}-${Date.now()}`).slice(0, 60),
      nombre,
      zona: String(c.zona || (c as Record<string, unknown>).region || '').slice(0, 120),
      telefono_display: String(c.telefono_display || (c as Record<string, unknown>).telefono || phoneRaw).slice(0, 30),
      phone_raw: phoneRaw,
      activo: c.activo !== false,
      orden: typeof c.orden === 'number' && Number.isFinite(c.orden) ? c.orden : index,
    } as StoreContacto
  }).filter((c): c is StoreContacto => c !== null)
  return parsed.length > 0 ? parsed.slice(0, 20) : DEFAULT_STORE_CONFIG.contactosLista
}

export function parseStoreConfig(raw?: string | null): ParsedStoreConfig {
  if (!raw) return DEFAULT_STORE_CONFIG

  try {
    const p = JSON.parse(raw)
    return {
      heroTitle: p.hero_title || DEFAULT_STORE_CONFIG.heroTitle,
      heroTitleSize: p.hero_title_size || DEFAULT_STORE_CONFIG.heroTitleSize,
      heroDescription: p.hero_description || (typeof p === 'string' ? p : DEFAULT_STORE_CONFIG.heroDescription),
      heroDescriptionSize: p.hero_description_size || DEFAULT_STORE_CONFIG.heroDescriptionSize,
      heroBadge: p.hero_badge || DEFAULT_STORE_CONFIG.heroBadge,

      exploraTitle: p.explora_title || DEFAULT_STORE_CONFIG.exploraTitle,
      exploraTitleSize: p.explora_title_size || DEFAULT_STORE_CONFIG.exploraTitleSize,
      exploraCategoria: p.explora_categoria || DEFAULT_STORE_CONFIG.exploraCategoria,
      exploraCategoriaSize: p.explora_categoria_size || DEFAULT_STORE_CONFIG.exploraCategoriaSize,

      categoriasGridTitle: p.categorias_grid_title || DEFAULT_STORE_CONFIG.categoriasGridTitle,
      categoriasGridTitleSize: p.categorias_grid_title_size || DEFAULT_STORE_CONFIG.categoriasGridTitleSize,
      categoriasGridSubtitle: p.categorias_grid_subtitle || DEFAULT_STORE_CONFIG.categoriasGridSubtitle,
      categoriasGridSubtitleSize: p.categorias_grid_subtitle_size || DEFAULT_STORE_CONFIG.categoriasGridSubtitleSize,

      destacadosTitle: p.destacados_title || DEFAULT_STORE_CONFIG.destacadosTitle,
      destacadosTitleSize: p.destacados_title_size || DEFAULT_STORE_CONFIG.destacadosTitleSize,
      destacadosSubtitle: p.destacados_subtitle || DEFAULT_STORE_CONFIG.destacadosSubtitle,
      destacadosSubtitleSize: p.destacados_subtitle_size || DEFAULT_STORE_CONFIG.destacadosSubtitleSize,

      contactosTitle: p.contactos_title || DEFAULT_STORE_CONFIG.contactosTitle,
      contactosTitleSize: p.contactos_title_size || DEFAULT_STORE_CONFIG.contactosTitleSize,
      contactosSubtitle: p.contactos_subtitle || DEFAULT_STORE_CONFIG.contactosSubtitle,
      contactosSubtitleSize: p.contactos_subtitle_size || DEFAULT_STORE_CONFIG.contactosSubtitleSize,
      contactosLista: p.contactos_lista !== undefined ? parseContactosLista(p.contactos_lista) : DEFAULT_STORE_CONFIG.contactosLista,

      footerAgradecimiento: p.footer_agradecimiento || DEFAULT_STORE_CONFIG.footerAgradecimiento,
      footerAgradecimientoSize: p.footer_agradecimiento_size || DEFAULT_STORE_CONFIG.footerAgradecimientoSize,
    }
  } catch {
    return {
      ...DEFAULT_STORE_CONFIG,
      heroDescription: raw || DEFAULT_STORE_CONFIG.heroDescription,
    }
  }
}

export function serializeStoreConfig(config: ParsedStoreConfig): string {
  return JSON.stringify({
    hero_title: config.heroTitle,
    hero_title_size: config.heroTitleSize,
    hero_description: config.heroDescription,
    hero_description_size: config.heroDescriptionSize,
    hero_badge: config.heroBadge,

    explora_title: config.exploraTitle,
    explora_title_size: config.exploraTitleSize,
    explora_categoria: config.exploraCategoria,
    explora_categoria_size: config.exploraCategoriaSize,

    categorias_grid_title: config.categoriasGridTitle,
    categorias_grid_title_size: config.categoriasGridTitleSize,
    categorias_grid_subtitle: config.categoriasGridSubtitle,
    categorias_grid_subtitle_size: config.categoriasGridSubtitleSize,

    destacados_title: config.destacadosTitle,
    destacados_title_size: config.destacadosTitleSize,
    destacados_subtitle: config.destacadosSubtitle,
    destacados_subtitle_size: config.destacadosSubtitleSize,

    contactos_title: config.contactosTitle,
    contactos_title_size: config.contactosTitleSize,
    contactos_subtitle: config.contactosSubtitle,
    contactos_subtitle_size: config.contactosSubtitleSize,
    contactos_lista: (config.contactosLista || []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      zona: c.zona,
      telefono_display: c.telefono_display,
      phone_raw: normalizePhoneRaw(c.phone_raw),
      activo: c.activo,
      orden: c.orden,
    })),

    footer_agradecimiento: config.footerAgradecimiento,
    footer_agradecimiento_size: config.footerAgradecimientoSize,
  })
}

export function getTitleSizeClass(size?: TextSizeOption | string | null): string {
  switch (size) {
    case 'small':
      return 'text-lg md:text-2xl font-bold tracking-tight'
    case 'large':
      return 'text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight'
    case 'normal':
    default:
      return 'text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight'
  }
}

export function getSubtitleSizeClass(size?: TextSizeOption | string | null): string {
  switch (size) {
    case 'small':
      return 'text-xs md:text-xs font-normal'
    case 'large':
      return 'text-base md:text-xl lg:text-2xl font-medium leading-relaxed'
    case 'normal':
    default:
      return 'text-xs md:text-sm lg:text-base font-normal leading-relaxed'
  }
}
