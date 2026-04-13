// app/(admin)/catalogo/[id]/components/TabComplementos.tsx
import type { ComplementoResuelto } from '@/modules/catalogo/types'
import { Puzzle } from 'lucide-react'

export function TabComplementos({ complementos }: { complementos: ComplementoResuelto[] }) {
  if (complementos.length === 0) {
    return <div className="flex flex-col items-center py-12 text-muted-foreground"><Puzzle className="h-8 w-8" /><p className="text-sm mt-2">Sin complementos.</p></div>
  }

  return (
    <div className="rounded-lg border divide-y mt-4">
      <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground">
        <span>Parte Prenda</span><span>Tipo</span><span>Material</span><span>Corte/Forma</span><span>Descripción</span>
      </div>
      {complementos.map((c) => (
        <div key={c.id} className="grid grid-cols-5 gap-4 px-4 py-2.5 text-sm">
          <span>{c.parte_prenda ?? '—'}</span>
          <span>{c.tipo_complemento ?? '—'}</span>
          <span>{c.material ?? '—'}</span>
          <span>{c.corte_forma ?? '—'}</span>
          <span className="text-muted-foreground">{c.descripcion_adicional ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
