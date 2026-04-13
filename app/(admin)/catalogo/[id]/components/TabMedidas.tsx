// app/(admin)/catalogo/[id]/components/TabMedidas.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Ruler } from 'lucide-react'
import type { MedidaResuelta } from '@/modules/catalogo/types'

export function TabMedidas({ medidas }: { medidas: MedidaResuelta[] }) {
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm')

  if (medidas.length === 0) {
    return <div className="flex flex-col items-center py-12 text-muted-foreground"><Ruler className="h-8 w-8" /><p className="text-sm mt-2">Sin medidas.</p></div>
  }

  // Pivotar: filas = puntos_medida, columnas = tallas
  const tallasSet = new Set<string>()
  const puntosSet = new Set<string>()
  const data: Record<string, Record<string, number | null>> = {}

  for (const m of medidas) {
    const talla = m.talla_codigo ?? '—'
    const punto = m.punto_medida ?? '—'
    tallasSet.add(talla)
    puntosSet.add(punto)
    if (!data[punto]) data[punto] = {}
    data[punto][talla] = unit === 'cm' ? m.medida_cm : m.medida_ft
  }

  const tallas = Array.from(tallasSet)
  const puntos = Array.from(puntosSet)

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center gap-2">
        <Button variant={unit === 'cm' ? 'default' : 'outline'} size="sm" onClick={() => setUnit('cm')}>CM</Button>
        <Button variant={unit === 'ft' ? 'default' : 'outline'} size="sm" onClick={() => setUnit('ft')}>Pulgadas</Button>
      </div>
      <div className="overflow-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th className="border px-2 py-1 bg-muted text-left">Punto de Medida</th>
              {tallas.map((t) => (
                <th key={t} className="border px-2 py-1 bg-muted text-center">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {puntos.map((punto) => (
              <tr key={punto}>
                <td className="border px-2 py-1 font-medium">{punto}</td>
                {tallas.map((t) => (
                  <td key={t} className="border px-2 py-1 text-center tabular-nums">
                    {data[punto]?.[t] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
