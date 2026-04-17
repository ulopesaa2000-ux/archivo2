'use client'

import React, { useState } from 'react'
import { Plus, Copy, MoreHorizontal, Loader2 } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { CatalogoCreateDialog } from '../../CatalogoCreateDialog'
import type { CatalogosParaFiltros, CatalogosEdicion } from '@/modules/catalogo/types'

interface CatalogoDetailActionsProps {
  productoId: number
  catalogos: CatalogosParaFiltros | CatalogosEdicion
}

export function CatalogoDetailActions({ productoId, catalogos }: CatalogoDetailActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  const handleNuevo = () => {
    // Abre el modal de creación manteniéndonos en la misma página
    router.push(`${pathname}?modal=create`)
  }

  const handleCopiar = () => {
    // Para copiar, usamos el mismo modal pero con un parámetro especial o estado interno
    // Probamos usando searchParams para disparar el modal de edición/creación con pre-carga
    router.push(`/catalogo/${productoId}?modal=copy&edit_id=${productoId}`)
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones de producto</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleNuevo}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopiar}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar Producto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reutilizamos el Diálogo Maestro */}
      <CatalogoCreateDialog catalogos={catalogos} />
    </div>
  )
}
