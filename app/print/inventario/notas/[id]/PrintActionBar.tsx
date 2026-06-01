// app/print/inventario/notas/[id]/PrintActionBar.tsx
'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'

type Props = {
  notaId: number
}

export function PrintActionBar({ notaId }: Props) {
  return (
    <div className="print:hidden flex items-center justify-between mb-8 pb-4 border-b">
      <Link href={`/inventario/notas/${notaId}`}>
        <Button variant="outline" className="h-10 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la Nota
        </Button>
      </Link>
      <Button onClick={() => window.print()} className="h-10 rounded-xl">
        <Printer className="mr-2 h-4 w-4" />
        Imprimir de Nuevo
      </Button>
    </div>
  )
}
