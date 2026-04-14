// app/(admin)/catalogo/[id]/components/TabTags.tsx
'use client'

import type { TagResuelto } from '@/modules/catalogo/types'
import { Tag } from 'lucide-react'

export function TabTags({ tags }: { tags: TagResuelto[] }) {
  if (tags.length === 0) {
    return <EmptyState message="Sin tags." />
  }

  return (
    <div className="rounded-lg border divide-y mt-4">
      <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground">
        <span>Tipo Tag</span><span>Código</span><span>Referencia</span><span>Valor</span>
      </div>
      {tags.map((t) => (
        <div key={t.id} className="grid grid-cols-4 gap-4 px-4 py-2.5 text-sm">
          <span>{t.tipo_tag_nombre ?? '—'}</span>
          <span className="font-mono text-xs">{t.tipo_tag_codigo ?? '—'}</span>
          <span>{t.ref_tag_nombre ?? '—'}</span>
          <span className="text-muted-foreground">{t.valor_texto ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Tag className="h-8 w-8" />
      <p className="text-sm mt-2">{message}</p>
    </div>
  )
}
