// app/(admin)/catalogo/imagenes/components/BuscadorSku.tsx
'use client'

import { SkuQuickSearchInput, type SkuSearchResultItem } from '@/components/admin/SkuQuickSearchInput'
import { buscarProductosParaSelector } from '@/modules/catalogo/imagenes/queries'

interface Props {
  value: string
  onChange: (sku: string, matchedProduct?: { id: number; sku_base: string; nombre: string | null }) => void
  status: string
}

/**
 * Buscador de SKU para tarjetas del Modal de Subida Masiva de Imágenes.
 * Utiliza el componente universal SkuQuickSearchInput con buffer local a 0ms
 * y escudo anti-corte de foco para evitar que la detección externa corte lo que se teclea.
 */
export function BuscadorSku({ value, onChange, status }: Props) {
  const handleSearch = async (term: string): Promise<SkuSearchResultItem[]> => {
    return buscarProductosParaSelector(term, 10)
  }

  const normalizedStatus = (
    status === 'assigned' || status === 'detected'
      ? status
      : status === 'not_found' || status === 'pending'
      ? status
      : 'default'
  ) as 'pending' | 'detected' | 'not_found' | 'assigned' | 'default'

  return (
    <SkuQuickSearchInput
      value={value}
      placeholder="Buscar SKU..."
      status={normalizedStatus}
      delay={250}
      minLength={1}
      limit={10}
      inputClassName="h-8 text-xs font-mono font-medium"
      onSearchQuery={handleSearch}
      onValueChange={(val, matched) => {
        onChange(val, matched ? { id: matched.id, sku_base: matched.sku_base, nombre: matched.nombre } : undefined)
      }}
      onSelectProduct={(product) => {
        onChange(product.sku_base, { id: product.id, sku_base: product.sku_base, nombre: product.nombre })
      }}
    />
  )
}
