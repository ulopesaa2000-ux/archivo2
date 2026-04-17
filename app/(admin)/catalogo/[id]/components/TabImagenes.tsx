// app/(admin)/catalogo/[id]/components/TabImagenes.tsx
'use client'

import Image from 'next/image'
import type { ProductoImagenRow } from '@/lib/types/tables'
import { Badge } from '@/components/ui/badge'
import { ImageIcon } from 'lucide-react'

export function TabImagenes({ imagenes }: { imagenes: ProductoImagenRow[] }) {
  if (imagenes.length === 0) {
    return <EmptyTab icon={<ImageIcon className="h-8 w-8" />} message="Sin imágenes registradas." />
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
      {imagenes.map((img) => (
        <div key={img.id} className="rounded-lg border overflow-hidden">
          <div className="aspect-square bg-muted flex items-center justify-center">
            <Image src={img.url} alt={img.alt_text ?? ''} fill className="object-contain" />
          </div>
          <div className="p-2 space-y-1">
            <div className="flex items-center gap-1 flex-wrap">
              {img.es_principal && <Badge className="text-[10px]">Principal</Badge>}
              <Badge variant="outline" className="text-[10px]">{img.uso_imagen}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Orden: {img.orden}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyTab({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {icon}
      <p className="text-sm mt-2">{message}</p>
    </div>
  )
}
