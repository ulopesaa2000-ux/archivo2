// components/store/producto/VariantSelector.tsx
'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { VariantePublica } from '@/modules/ecommerce/types'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

interface VariantSelectorProps {
  variantes: VariantePublica[]
  config: ConfigEcommerce | null
}

export function VariantSelector({ variantes, config }: VariantSelectorProps) {
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string | null>(null)
  const [colorSeleccionado, setColorSeleccionado] = useState<string | null>(null)

  // Obtener tallas únicas ordenadas
  const tallas = useMemo(() => {
    const tallasMap = new Map<string, { codigo: string; orden: number }>()
    variantes.forEach(v => {
      if (v.talla_codigo && !tallasMap.has(v.talla_codigo)) {
        tallasMap.set(v.talla_codigo, {
          codigo: v.talla_codigo,
          orden: v.talla_orden || 0,
        })
      }
    })
    return Array.from(tallasMap.values()).sort((a, b) => a.orden - b.orden)
  }, [variantes])

  // Obtener colores únicos
  const colores = useMemo(() => {
    const coloresMap = new Map<string, { nombre: string; hex: string | null }>()
    variantes.forEach(v => {
      if (v.color_nombre && !coloresMap.has(v.color_nombre)) {
        coloresMap.set(v.color_nombre, {
          nombre: v.color_nombre,
          hex: v.color_hex,
        })
      }
    })
    return Array.from(coloresMap.values())
  }, [variantes])

  // Encontrar variante seleccionada
  const varianteSeleccionada = useMemo(() => {
    return variantes.find(v =>
      v.talla_codigo === tallaSeleccionada &&
      v.color_nombre === colorSeleccionado
    )
  }, [variantes, tallaSeleccionada, colorSeleccionado])

  // Variantes disponibles para la talla seleccionada
  const coloresDisponibles = useMemo(() => {
    if (!tallaSeleccionada) return colores.map(c => c.nombre)
    return variantes
      .filter(v => v.talla_codigo === tallaSeleccionada)
      .map(v => v.color_nombre)
      .filter(Boolean) as string[]
  }, [variantes, tallaSeleccionada, colores])

  if (variantes.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Selector de Talla */}
      {tallas.length > 0 && (
        <div className="space-y-3">
          <div className="text-[12px] uppercase tracking-[0.05em] text-store-ink font-semibold">
            Talla
          </div>
          <div className="flex flex-wrap gap-2">
            {tallas.map((talla) => {
              const isSelected = tallaSeleccionada === talla.codigo
              const hasVariante = variantes.some(
                v => v.talla_codigo === talla.codigo
              )

              return (
                <button
                  key={talla.codigo}
                  type="button"
                  disabled={!hasVariante}
                  onClick={() => setTallaSeleccionada(talla.codigo)}
                  className={cn(
                    'h-10 px-4 min-w-[2.5rem] flex items-center justify-center rounded-[4px] border text-[13px] font-medium transition-colors',
                    isSelected
                      ? 'border-store-ink bg-store-ink text-white'
                      : 'border-store-border bg-store-surface text-store-ink hover:border-store-ink',
                    !hasVariante && 'opacity-30 cursor-not-allowed bg-store-bg'
                  )}
                >
                  {talla.codigo}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selector de Color */}
      {colores.length > 0 && (
        <div className="space-y-3">
          <div className="text-[12px] uppercase tracking-[0.05em] text-store-ink font-semibold">
            Color
          </div>
          <div className="flex flex-wrap gap-3">
            {colores.map((color) => {
              const isSelected = colorSeleccionado === color.nombre
              const isDisponible = coloresDisponibles.includes(color.nombre)

              return (
                <button
                  key={color.nombre}
                  type="button"
                  disabled={!isDisponible}
                  onClick={() => setColorSeleccionado(color.nombre)}
                  className={cn(
                    'group relative w-8 h-8 rounded-full border border-store-border transition-transform outline outline-offset-2',
                    isSelected
                      ? 'outline-store-ink scale-100'
                      : 'outline-transparent hover:scale-105',
                    !isDisponible && 'opacity-30 cursor-not-allowed'
                  )}
                  title={color.nombre}
                  style={color.hex ? { backgroundColor: color.hex } : { backgroundColor: '#f0f0f0' }}
                >
                  <span className="sr-only">{color.nombre}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* SKU de variante seleccionada */}
      {varianteSeleccionada && config?.mostrar_sku && (
        <div className="text-[12px] text-store-ink3 mb-4 pt-4 border-t border-store-border">
          SKU: <code>{varianteSeleccionada.sku_completo}</code>
          {varianteSeleccionada.activo ? ' · Stock disponible' : ' · Agotado'}
        </div>
      )}
    </div>
  )
}
