'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import type { SharedCajaData } from '@/modules/cajas/types'
import type { CatalogoItem } from '@/modules/catalogo/types'
import { desactivarCajaAction, updateCajaCompletaAction, createCajaAction, marcarCajaPrincipalAction } from '@/modules/cajas/actions'

interface TabCajasProps {
  cajas: any[]
  productoId: number
  tallasDisponibles: CatalogoItem[]
  coloresDisponibles: CatalogoItem[]
  edadNombre?: string | null
}

// Caja temporal vacía para crear nueva
const crearCajaVacia = (tempId: number): SharedCajaData => ({
  id: tempId,
  codigo_caja: '',
  nombre_pack: '',
  piezas_por_caja: 0,
  cbm: 0,
  peso_bruto_kg: 0,
  largo_cm: 0,
  ancho_cm: 0,
  alto_cm: 0,
  costo_total_caja: 0,
  producto_id: 0,
  contenidoMap: {
    tallas: [],
    colores: [],
    matriz: {},
    totalPiezas: 0
  }
})

export function TabCajas({ cajas, productoId, tallasDisponibles, coloresDisponibles, edadNombre }: TabCajasProps) {
  const router = useRouter()
  const [cajasNuevas, setCajasNuevas] = useState<SharedCajaData[]>([])
  const [nextTempId, setNextTempId] = useState(-1)

  const totalCajas = (cajas?.length || 0) + cajasNuevas.length

  const handleAddCaja = () => {
    const nuevaCaja = crearCajaVacia(nextTempId)
    setCajasNuevas([nuevaCaja, ...cajasNuevas])
    setNextTempId(prev => prev - 1)
  }

  const handleRemoveNueva = (tempId: number) => {
    setCajasNuevas(prev => prev.filter(c => c.id !== tempId))
  }

  const handleCreateCaja = async (data: {
    base: Partial<SharedCajaData>
    detalles: { talla_id: number; color_id: number; cantidad: number }[]
  }) => {
    await createCajaAction(productoId, data)
    router.refresh()
  }

  const handleEditCaja = async (cajaId: number, data: {
    base: Partial<SharedCajaData>
    detalles: { talla_id: number; color_id: number; cantidad: number }[]
  }) => {
    await updateCajaCompletaAction(cajaId, data)
    // La revalidación del path debería actualizar los datos
  }

  const handleMarcarPrincipal = async (cajaId: number, prodId: number) => {
    const res = await marcarCajaPrincipalAction(cajaId, prodId)
    router.refresh()
    return res
  }

  return (
    <div className="space-y-4">
      {/* Header con conteo y botón agregar */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-3">
          <Box className="h-5 w-5 text-primary" />
          <div>
            <span className="text-sm font-medium text-foreground">
              Cajas configuradas
            </span>
            <Badge variant="secondary" className="ml-2 font-bold">
              {totalCajas}
            </Badge>
          </div>
        </div>
        <Button
          onClick={handleAddCaja}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar Caja
        </Button>
      </div>

      {/* Cajas nuevas (formularios vacíos) */}
      {cajasNuevas.map((cajaNueva) => (
        <CajaCard
          key={cajaNueva.id}
          caja={cajaNueva}
          isNew={true}
          onCreate={handleCreateCaja}
          onRemove={handleRemoveNueva}
          tallasDisponibles={tallasDisponibles}
          coloresDisponibles={coloresDisponibles}
          edadNombre={edadNombre}
        />
      ))}

      {/* Cajas existentes */}
      {cajas && cajas.length > 0 ? (
        cajas.map((caja) => (
          <CajaCard
            key={caja.id}
            caja={caja as SharedCajaData}
            onDeactivate={desactivarCajaAction}
            onEdit={handleEditCaja}
            tallasDisponibles={tallasDisponibles}
            coloresDisponibles={coloresDisponibles}
            edadNombre={edadNombre}
            esPrincipal={caja.es_principal ?? false}
            onMarcarPrincipal={handleMarcarPrincipal}
            productoId={productoId}
          />
        ))
      ) : (
        cajasNuevas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed">
            <Package className="h-8 w-8 mb-2 opacity-20" />
            <p>Este producto aún no tiene cajas vinculadas.</p>
            <p className="text-sm mt-1">Haz clic en &ldquo;Agregar Caja&rdquo; para crear la primera.</p>
          </div>
        )
      )}
    </div>
  )
}
