// app/(admin)/catalogo/[id]/components/TabCatalogos.tsx
import type { FKDescriptivas } from '@/modules/catalogo/types'

export function TabCatalogos({ fk }: { fk: FKDescriptivas }) {
  const items = [
    { label: 'Marca', value: fk.marca },
    { label: 'Género', value: fk.genero },
    { label: 'Edad', value: fk.edad },
    { label: 'Tipo de Prenda', value: fk.tipo_prenda },
    { label: 'Tela Forro', value: fk.tela_forro },
    { label: 'Tela Exterior', value: fk.tela_exterior },
    { label: 'Persona', value: fk.persona },
  ]

  return (
    <div className="rounded-lg border divide-y">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between px-4 py-3 text-sm">
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-medium">{item.value ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
