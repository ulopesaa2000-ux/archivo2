// app/print/inventario/familias/PrintActionBar.tsx
'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, FileSpreadsheet, ClipboardList, Tags, Tag, PackageCheck, PackageX } from 'lucide-react'
import Link from 'next/link'

interface Props {
  isBlanco: boolean
  showFamilia: boolean
  includeZero: boolean
}

function href(blanco: boolean, familia: boolean, cero: boolean): string {
  const params = new URLSearchParams()
  if (blanco) params.set('blanco', '1')
  if (!familia) params.set('familia', '0')
  if (!cero) params.set('cero', '0')
  const qs = params.toString()
  return `/print/inventario/familias${qs ? `?${qs}` : ''}`
}

export function PrintActionBar({ isBlanco, showFamilia, includeZero }: Props) {
  return (
    <div className="print:hidden flex flex-wrap items-center justify-between gap-2 mb-6 pb-4 border-b">
      <Link href="/catalogo/familias">
        <Button variant="outline" className="h-10 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Familias
        </Button>
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href(false, showFamilia, includeZero)}>
          <Button variant={isBlanco ? 'outline' : 'default'} className="h-10 rounded-xl">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Con existencias
          </Button>
        </Link>
        <Link href={href(true, showFamilia, includeZero)}>
          <Button variant={isBlanco ? 'default' : 'outline'} className="h-10 rounded-xl">
            <ClipboardList className="mr-2 h-4 w-4" />
            Formato blanco
          </Button>
        </Link>
        <Link href={href(isBlanco, showFamilia, !includeZero)}>
          <Button
            variant="outline"
            className="h-10 rounded-xl"
            title={includeZero ? 'Ocultar estilos y bodegas sin stock (como la interfaz sin el check)' : 'Mostrar también estilos y bodegas sin stock'}
          >
            {includeZero ? <PackageCheck className="mr-2 h-4 w-4" /> : <PackageX className="mr-2 h-4 w-4" />}
            {includeZero ? 'Solo con stock' : 'Con stock cero'}
          </Button>
        </Link>
        <Link href={href(isBlanco, !showFamilia, includeZero)}>
          <Button variant="outline" className="h-10 rounded-xl" title="Mostrar u ocultar la columna FAMILIA al final">
            {showFamilia ? <Tags className="mr-2 h-4 w-4" /> : <Tag className="mr-2 h-4 w-4" />}
            {showFamilia ? 'Sin familia' : 'Con familia'}
          </Button>
        </Link>
        <Button onClick={() => window.print()} className="h-10 rounded-xl">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>
    </div>
  )
}
