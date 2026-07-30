// app/(admin)/inventario/notas/propuestas/page.tsx
import type { Metadata } from 'next'
import { fetchOcrPropuestas } from '@/modules/inventario/queries'
import { verifySession } from '@/lib/dal'
import { OcrUploadModal } from './OcrUploadModal'
import { PropuestasTable } from './PropuestasTable'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, History, Layers } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Propuestas OCR — Inventario',
}

export default async function PropuestasOcrPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string
    page?: string
  }>
}) {
  // 1. Validar sesión
  const { user } = await verifySession()

  // 2. Restringir acceso exclusivamente a Super Admin Nivel 1
  if (user.rol?.nivel_acceso !== 1) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/40 border border-muted/50 rounded-xl max-w-lg mx-auto shadow-sm">
        <Sparkles className="h-16 w-16 text-amber-500/50 stroke-[1.5]" />
        <h2 className="text-xl font-bold mt-4 text-foreground">Acceso Denegado</h2>
        <p className="text-sm mt-2 text-center max-w-sm px-6">
          La sección de Propuestas OCR está reservada exclusivamente para la administración general (Super Admin Nivel 1).
        </p>
        <Link
          href="/inventario/notas"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-6')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver a Notas de Inventario
        </Link>
      </div>
    )
  }

  const sp = await searchParams
  const estadoFiltro = sp.estado === 'REVISADO' ? 'REVISADO' : 'PENDIENTE_REVISION'
  const page = sp.page ? parseInt(sp.page, 10) : 1

  // 3. Fetch de datos desde Supabase
  const { propuestas, total } = await fetchOcrPropuestas({
    estado: estadoFiltro,
    page,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            Propuestas OCR de Notas
          </h1>
          <p className="text-sm text-muted-foreground">
            Revisa, edita y aprueba las órdenes de movimiento digitalizadas mediante inteligencia artificial.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventario/notas">
            <Button variant="outline" className="rounded-xl uppercase font-black text-[10px] tracking-wider h-10">
              Ver Historial de Notas
            </Button>
          </Link>
          <OcrUploadModal />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-background/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Pendientes de Revisión</p>
              <p className="text-xl font-black font-mono leading-none mt-1">
                {estadoFiltro === 'PENDIENTE_REVISION' ? total : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Revisadas / Historial</p>
              <p className="text-xl font-black font-mono leading-none mt-1">
                {estadoFiltro === 'REVISADO' ? total : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Filtro de Estado */}
      <Tabs defaultValue={estadoFiltro} className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2 rounded-xl">
          <TabsTrigger value="PENDIENTE_REVISION" render={<Link href="?estado=PENDIENTE_REVISION" replace />} nativeButton={false} className="rounded-lg font-bold text-xs uppercase tracking-wider">
            Pendientes
          </TabsTrigger>
          <TabsTrigger value="REVISADO" render={<Link href="?estado=REVISADO" replace />} nativeButton={false} className="rounded-lg font-bold text-xs uppercase tracking-wider">
            Procesadas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tabla de Resultados */}
      <PropuestasTable propuestas={propuestas} total={total} page={page} estado={estadoFiltro} />
    </div>
  )
}
