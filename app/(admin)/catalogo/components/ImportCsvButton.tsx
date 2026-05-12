// app/(admin)/catalogo/components/ImportCsvButton.tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ImportCsvModal } from './ImportCsvModal'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

export function ImportCsvButton() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isOpen = searchParams.get('modal') === 'import_csv'

  const handleOpen = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('modal', 'import_csv')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('modal')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <Upload className="h-4 w-4 mr-2" /> Importar CSV
      </Button>
      <ImportCsvModal open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }} />
    </>
  )
}
