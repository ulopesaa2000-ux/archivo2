// app/(admin)/catalogo/[id]/components/TabAcabados.tsx
import type { AcabadoResuelto } from '@/modules/catalogo/types'
import { Paintbrush } from 'lucide-react'

export function TabAcabados({ acabados }: { acabados: AcabadoResuelto[] }) {
  if (acabados.length === 0) {
    return <div className="flex flex-col items-center py-12 text-muted-foreground"><Paintbrush className="h-8 w-8" /><p className="text-sm mt-2">Sin acabados.</p></div>
  }

  return (
    <div className="rounded-lg border divide-y mt-4">
      <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground">
        <span>Tipo Acabado</span><span>Detalle</span><span>Patrón</span><span>Localización</span>
      </div>
      {acabados.map((a) => (
        <div key={a.id} className="grid grid-cols-4 gap-4 px-4 py-2.5 text-sm">
          <span>{a.tipo_acabado ?? '—'}</span>
          <span>{a.detalle ?? '—'}</span>
          <span>{a.patron ?? '—'}</span>
          <span>{a.localizacion ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
