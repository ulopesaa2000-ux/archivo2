// app/(admin)/configuracion/tablas-soporte/page.tsx
import type { Metadata } from 'next'
import { Database } from 'lucide-react'
import { TABLAS_SOPORTE_CONFIG, type TablaSoporteKey } from '@/modules/config/tablas-soporte/types'
import { fetchTablaSoporteData, fetchTablaSoporteCounts } from '@/modules/config/tablas-soporte/queries'
import { TablasSoporteManager } from './components/TablasSoporteManager'

export const metadata: Metadata = {
  title: 'Tablas de Soporte - CRUD Auxiliares',
  description: 'Gestión y modificación directa de catálogos auxiliares (cat_*) y directorio de personas.',
}

type PageProps = {
  searchParams: Promise<{
    tabla?: string
    q?: string
    estado?: 'todos' | 'activos' | 'inactivos'
  }>
}

const VALID_KEYS: TablaSoporteKey[] = [
  'personas',
  'cat_marcas',
  'cat_tallas',
  'cat_colores',
  'cat_telas',
  'cat_generos',
  'cat_edades',
  'cat_tipo_prenda',
  'cat_tipos_movimiento',
  'cat_estados_nota',
]

export default async function TablasSoportePage(props: PageProps) {
  const searchParams = await props.searchParams

  // La tabla que SIEMPRE carga por defecto cuando se abre la página es 'personas'
  const rawTabla = searchParams.tabla as TablaSoporteKey | undefined
  const activeTabla: TablaSoporteKey = rawTabla && VALID_KEYS.includes(rawTabla) ? rawTabla : 'personas'

  const q = searchParams.q
  const estado = searchParams.estado

  const [items, counts] = await Promise.all([
    fetchTablaSoporteData(activeTabla, q, estado),
    fetchTablaSoporteCounts(),
  ])

  const config = TABLAS_SOPORTE_CONFIG[activeTabla]

  return (
    <div className="space-y-6">
      {/* Header de la Vista */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl bg-primary/10 p-2.5">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Tablas de Soporte / Auxiliares
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {config.descripcion}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Manager con Pestañas, Filtros, Tabla y Dialog */}
      <TablasSoporteManager
        currentTabla={activeTabla}
        items={items}
        counts={counts}
      />
    </div>
  )
}
