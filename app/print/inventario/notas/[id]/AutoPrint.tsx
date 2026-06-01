// app/print/inventario/notas/[id]/AutoPrint.tsx
'use client'

import { useEffect } from 'react'

export function AutoPrint() {
  useEffect(() => {
    // Delay slightly to ensure images, QR code APIs and page layout are fully rendered!
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return null
}
