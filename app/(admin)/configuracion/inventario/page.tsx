import type { Metadata } from 'next'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { ResetInventarioClient } from './ResetInventarioClient'
import { ShieldAlert, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Reinicio Operativo de Inventario — Configuración',
}

export default async function ResetInventarioPage() {
  const { user } = await verifySession()

  // Restricción estricta de seguridad: Exclusivo para Super Admin Nivel 1
  if (user.rol?.nivel_acceso !== 1) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/40 border border-muted/50 rounded-2xl max-w-lg mx-auto shadow-sm p-6 text-center space-y-4 my-10">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
          <ShieldAlert className="h-12 w-12 stroke-[1.5]" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Acceso Restringido</h2>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          La herramienta de reinicio de inventario y vaciado de notas está reservada exclusivamente para la Administración General (Super Admin Nivel 1).
        </p>
        <Link href="/dashboard">
          <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-wider gap-2">
            <ChevronLeft className="h-4 w-4" /> Volver al Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: bodegas } = await supabase
    .from('bodegas')
    .select('id, nombre, codigo, ciudad, activa, es_virtual')
    .order('id')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          Reinicio Operativo de Inventario
        </h1>
        <p className="text-sm text-muted-foreground">
          Herramienta exclusiva de administración para vaciar el historial de notas e iniciar las existencias de stock a 0.
        </p>
      </div>

      <ResetInventarioClient bodegas={bodegas || []} />
    </div>
  )
}
