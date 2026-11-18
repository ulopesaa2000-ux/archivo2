// components/store/producto/ProductPurchasePanel.tsx
'use client'

import { useState } from 'react'
import { VariantSelector } from './VariantSelector'
import { AddToQuoteButton } from './AddToQuoteButton'
import type { ConfigEcommerce, ProductoWebPublico, VariantePublica } from '@/modules/ecommerce/types'

interface ProductPurchasePanelProps {
  producto: ProductoWebPublico
  variantes: VariantePublica[]
  config: ConfigEcommerce | null
  stockDisponible?: number
}

export function ProductPurchasePanel({
  producto,
  variantes,
  config,
  stockDisponible,
}: ProductPurchasePanelProps) {
  const [selectedVariante, setSelectedVariante] = useState<VariantePublica | null>(
    variantes.length === 1 ? variantes[0] : null
  )
  const [esSurtido, setEsSurtido] = useState(false)

  const requiresVariantSelection = variantes.length > 1

  return (
    <div className="space-y-4">
      <VariantSelector
        variantes={variantes}
        config={config}
        stockDisponible={stockDisponible}
        disabled={esSurtido}
        onVarianteChange={setSelectedVariante}
      />

      {variantes.length > 1 && (
        <label className="flex items-center gap-2.5 text-xs text-store-ink2 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={esSurtido}
            onChange={(e) => setEsSurtido(e.target.checked)}
            className="h-4 w-4 rounded border-store-border accent-[#2D5A3D]"
          />
          <span>
            Solicitar como <strong>pedido surtido</strong> (sin talla/color específico; el asesor confirmará el surtido)
          </span>
        </label>
      )}

      <div className="pt-2">
        <AddToQuoteButton
          producto={producto}
          config={config}
          selectedVariante={selectedVariante}
          requiresVariantSelection={requiresVariantSelection}
          esSurtido={esSurtido}
        />
      </div>
    </div>
  )
}
