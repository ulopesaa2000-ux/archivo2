// app/(admin)/inventario/notas/nueva/_components/NotaModales.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, AlertTriangle, ArrowLeftRight, CalendarClock, RefreshCw, Sparkles } from 'lucide-react'
import { todayMX, formatDate } from '@/lib/utils'
import { OcrLineasSyncModal } from '@/components/admin/OcrLineasSyncModal'
import { SustitutoFamiliaModal } from '@/components/admin/inventario/SustitutoFamiliaModal'
import { ConciliadorAmpliadoStockModal } from '@/components/admin/ConciliadorAmpliadoStockModal'
import { PasteExcelProductosModal } from '@/components/admin/inventario/PasteExcelProductosModal'
import { ModalStockInsuficiente } from '@/components/admin/inventario/ModalStockInsuficiente'
import { SkuQuickSearchInput } from '@/components/admin/SkuQuickSearchInput'
import type { ResolvedProductoPegado } from '@/modules/inventario/actions'
import type { BodegaRow, TipoMovimientoRow } from '@/lib/types/tables'
import type {
  DraftNota,
  DraftProducto,
  FaltanteStock,
  NotaOcrPropuestaLineRaw,
  ProductoBusqueda,
  ProductoSustitutoAmpliado,
  ProductoSustitutoFamilia,
} from '@/modules/inventario/types'

interface NotaModalesProps {
  draft: DraftNota
  bodegas: BodegaRow[]
  tiposMovimiento: TipoMovimientoRow[]
  tipoSeleccionado: TipoMovimientoRow | undefined
  totalCajas: number
  permitirStockNegativo: boolean
  hayDeficitStock: boolean
  productosConDeficitCount: number
  showConfirmDialog: boolean
  onShowConfirmDialogChange: (open: boolean) => void
  onConfirmSave: () => void
  swapProductTempId: string | null
  swapSearchTerm: string
  onCloseSwap: () => void
  onSwapSearchTermChange: (val: string) => void
  onSwapProduct: (tempId: string, newProduct: ProductoBusqueda) => void
  showOcrSyncModal: boolean
  onShowOcrSyncModalChange: (open: boolean) => void
  ocrProposalId?: string
  ocrRawLineas: NotaOcrPropuestaLineRaw[]
  comprobanteUrl?: string | null
  onApplyOcrLines: (newProducts: DraftProducto[], updatedRawLineas: NotaOcrPropuestaLineRaw[]) => void
  showPasteExcelModal: boolean
  onShowPasteExcelModalChange: (open: boolean) => void
  onApplyPastedProducts: (items: ResolvedProductoPegado[], modoFusion: 'sumar' | 'anexar') => void
  showChangeBodegaDialog: boolean
  onShowChangeBodegaDialogChange: (open: boolean) => void
  pendingBodegaOrigenId: number | null
  onCancelBodegaChange: () => void
  onConfirmBodegaChange: () => void
  showChangeTipoDialog: boolean
  onShowChangeTipoDialogChange: (open: boolean) => void
  pendingTipoMovimientoId: number | null
  onCancelTipoChange: () => void
  onConfirmTipoChange: () => void
  sustitutoModalOpen: boolean
  onSustitutoModalOpenChange: (open: boolean) => void
  sustitutoTargetProduct: { tempId: string; productoId: number; sku: string; nombre: string | null } | null
  onSelectSustituto: (sustituto: ProductoSustitutoFamilia, originalSku: string, familia: string | null) => void
  showConciliadorModal: boolean
  onShowConciliadorModalChange: (open: boolean) => void
  onReasignarProducto: (
    tempId: string,
    nuevoSustituto: ProductoSustitutoAmpliado | ProductoBusqueda,
    codigoOriginalFisico: string
  ) => void
  showRevisionDialog: boolean
  onShowRevisionDialogChange: (open: boolean) => void
  hayAvisoFecha: boolean
  ladoDurazno: 'origen' | 'destino' | 'ambos' | null
  onChangeFechaNota: (date: string) => void
  onCambiarACocina: () => void
  onConfirmRevision: () => void
  showStockModal: boolean
  onShowStockModalChange: (open: boolean) => void
  stockFaltantes: FaltanteStock[]
  stockAvisoModo: 'confirmar' | 'borrador'
  isValidandoStock: boolean
  onAjustarYContinuar: () => void
  onGuardarBorrador: () => void
  onVerSustitutosPorProducto: (productoId: number) => void
}

export function NotaModales({
  draft,
  bodegas,
  tiposMovimiento,
  tipoSeleccionado,
  totalCajas,
  permitirStockNegativo,
  hayDeficitStock,
  productosConDeficitCount,
  showConfirmDialog,
  onShowConfirmDialogChange,
  onConfirmSave,
  swapProductTempId,
  swapSearchTerm,
  onCloseSwap,
  onSwapSearchTermChange,
  onSwapProduct,
  showOcrSyncModal,
  onShowOcrSyncModalChange,
  ocrProposalId,
  ocrRawLineas,
  comprobanteUrl,
  onApplyOcrLines,
  showPasteExcelModal,
  onShowPasteExcelModalChange,
  onApplyPastedProducts,
  showChangeBodegaDialog,
  onShowChangeBodegaDialogChange,
  pendingBodegaOrigenId,
  onCancelBodegaChange,
  onConfirmBodegaChange,
  showChangeTipoDialog,
  onShowChangeTipoDialogChange,
  pendingTipoMovimientoId,
  onCancelTipoChange,
  onConfirmTipoChange,
  sustitutoModalOpen,
  onSustitutoModalOpenChange,
  sustitutoTargetProduct,
  onSelectSustituto,
  showConciliadorModal,
  onShowConciliadorModalChange,
  onReasignarProducto,
  showRevisionDialog,
  onShowRevisionDialogChange,
  hayAvisoFecha,
  ladoDurazno,
  onChangeFechaNota,
  onCambiarACocina,
  onConfirmRevision,
  showStockModal,
  onShowStockModalChange,
  stockFaltantes,
  stockAvisoModo,
  isValidandoStock,
  onAjustarYContinuar,
  onGuardarBorrador,
  onVerSustitutosPorProducto,
}: NotaModalesProps) {
  const bodegaOrigenNombre = bodegas.find((b) => b.id === draft.bodega_origen_id)?.nombre

  return (
    <>
      <AlertDialog open={showConfirmDialog} onOpenChange={onShowConfirmDialogChange}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-lg">¿Confirmar nota de movimiento?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">Esta acción aplicará de forma definitiva los movimientos de inventario en la base de datos.</span>
              {tipoSeleccionado?.afecta_inventario === -1 && (
                <span className="block p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 font-bold uppercase tracking-tight text-[11px] animate-pulse">
                  ⚠️ SE DESCONTARÁ STOCK de la bodega origen: {bodegaOrigenNombre}.
                </span>
              )}
              {tipoSeleccionado?.codigo === 'TRF' && (
                <span className="block p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold uppercase tracking-tight text-[11px]">
                  ↔ SE TRANSFERIRÁ STOCK de origen a destino de manera automática.
                </span>
              )}
              <span className="block text-xs font-semibold text-muted-foreground pt-1">
                {draft.productos.length} producto{draft.productos.length !== 1 ? 's' : ''} · {totalCajas} cajas en borrador.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmSave} className="rounded-xl font-bold uppercase tracking-wider">
              Confirmar Nota
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!swapProductTempId} onOpenChange={(open) => !open && onCloseSwap()}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Sustituir Producto / SKU
            </DialogTitle>
            <DialogDescription className="text-xs">
              Busca y selecciona el producto correcto para reemplazar el SKU de esta fila manteniendo la cantidad de cajas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <SkuQuickSearchInput
              autoFocus
              value={swapSearchTerm}
              placeholder="Buscar por SKU o nombre de producto..."
              inputClassName="h-10 rounded-xl text-sm"
              delay={280}
              onSelectProduct={(prod) => {
                if (swapProductTempId) {
                  onSwapProduct(swapProductTempId, {
                    id: prod.id,
                    sku_base: prod.sku_base,
                    nombre: prod.nombre,
                    descripcion: prod.descripcion ?? null,
                    pz_en_caja: prod.pz_en_caja ?? null,
                    marca_nombre: null,
                    imagen_url: null,
                  })
                }
              }}
              onValueChange={onSwapSearchTermChange}
              onClear={() => onSwapSearchTermChange('')}
            />
          </div>
        </DialogContent>
      </Dialog>

      <OcrLineasSyncModal
        open={showOcrSyncModal}
        onOpenChange={onShowOcrSyncModalChange}
        ocrProposalId={ocrProposalId}
        initialLineas={ocrRawLineas}
        comprobanteUrl={comprobanteUrl}
        bodegaOrigenId={draft.bodega_origen_id}
        onApplyToDraft={onApplyOcrLines}
      />

      <PasteExcelProductosModal
        open={showPasteExcelModal}
        onOpenChange={onShowPasteExcelModalChange}
        bodegaOrigenId={draft.bodega_origen_id}
        onApplyProducts={onApplyPastedProducts}
      />

      <AlertDialog open={showChangeBodegaDialog} onOpenChange={onShowChangeBodegaDialogChange}>
        <AlertDialogContent className="rounded-2xl max-w-md bg-card border shadow-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              ¿Cambiar Bodega de Origen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm space-y-3 text-muted-foreground pt-1">
              <span>
                Estás a punto de cambiar el origen a{' '}
                <strong className="text-foreground">
                  {bodegas.find((b) => b.id === pendingBodegaOrigenId)?.nombre || 'la nueva bodega'}
                </strong>.
              </span>
              <span className="block text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                ⚠️ Esta acción recalculará automáticamente las existencias en vivo de todos los productos agregados en la nota con base en el inventario real de la nueva bodega.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel onClick={onCancelBodegaChange} className="rounded-xl font-bold uppercase text-xs tracking-wider">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmBodegaChange} className="rounded-xl bg-primary font-bold uppercase text-xs tracking-wider shadow-md">
              Confirmar Cambio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showChangeTipoDialog} onOpenChange={onShowChangeTipoDialogChange}>
        <AlertDialogContent className="rounded-2xl max-w-md bg-card border shadow-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <AlertCircle className="h-5 w-5 text-sky-500 shrink-0" />
              ¿Cambiar Tipo de Movimiento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm space-y-3 text-muted-foreground pt-1">
              <span>
                Estás a punto de cambiar el tipo de movimiento de esta nota a{' '}
                <strong className="text-foreground">
                  {tiposMovimiento.find((t) => t.id === pendingTipoMovimientoId)?.nombre || 'el nuevo tipo'}
                </strong>.
              </span>
              <span className="block text-xs font-medium text-sky-900 dark:text-sky-200 bg-sky-500/10 border border-sky-500/20 p-3 rounded-xl">
                ℹ️ El tipo de movimiento define cómo afectará al inventario (Entrada, Salida, Traspaso o Ajuste). La lista de productos y cantidades se mantendrá intacta.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel onClick={onCancelTipoChange} className="rounded-xl font-bold uppercase text-xs tracking-wider">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmTipoChange} className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold uppercase text-xs tracking-wider shadow-md">
              Confirmar Cambio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SustitutoFamiliaModal
        open={sustitutoModalOpen}
        onOpenChange={onSustitutoModalOpenChange}
        productoId={sustitutoTargetProduct?.productoId ?? null}
        productoActualSku={sustitutoTargetProduct?.sku ?? null}
        productoActualNombre={sustitutoTargetProduct?.nombre ?? null}
        bodegaOrigenId={draft.bodega_origen_id}
        bodegaNombre={bodegaOrigenNombre}
        onSelectSustituto={onSelectSustituto}
      />

      <ConciliadorAmpliadoStockModal
        open={showConciliadorModal}
        onOpenChange={onShowConciliadorModalChange}
        productos={draft.productos}
        bodegaOrigenId={draft.bodega_origen_id}
        bodegaOrigenNombre={bodegaOrigenNombre}
        permitirStockNegativo={permitirStockNegativo}
        onReasignarProducto={onReasignarProducto}
      />

      <AlertDialog open={showRevisionDialog} onOpenChange={onShowRevisionDialogChange}>
        <AlertDialogContent className="rounded-2xl max-w-md bg-card border shadow-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              Revisar antes de guardar
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-1">
              Hay puntos a revisar en esta nota. Son solo avisos: puedes corregir o continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-1">
            {hayDeficitStock && permitirStockNegativo && (
              <div className="text-xs font-medium text-amber-900 dark:text-amber-200 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  Saldo negativo proyectado
                </p>
                <p>
                  <strong className="text-foreground">{productosConDeficitCount} producto(s)</strong> superan el stock de{' '}
                  <strong className="text-foreground">{bodegaOrigenNombre || 'la bodega origen'}</strong>. Con stock negativo habilitado quedarán existencias menores a 0.
                </p>
              </div>
            )}
            {hayAvisoFecha && (
              <div className="text-xs font-medium text-sky-900 dark:text-sky-200 bg-sky-500/10 border border-sky-500/20 p-3 rounded-xl space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-sky-500 shrink-0" />
                  Nota a futuro: movimiento programado
                </p>
                <p>
                  Fecha de la nota: <strong className="font-mono">{formatDate(draft.fecha_nota) || draft.fecha_nota}</strong>
                  {' '}· Hoy: <strong className="font-mono">{formatDate(todayMX())}</strong>. Si no es el caso puede cambiar la fecha aquí:
                </p>
                <Input
                  type="date"
                  value={draft.fecha_nota || todayMX()}
                  onChange={(e) => onChangeFechaNota(e.target.value)}
                  className="h-9 rounded-xl font-mono text-xs bg-background"
                />
              </div>
            )}
            {ladoDurazno && (
              <div className="text-xs font-medium text-violet-900 dark:text-violet-200 bg-violet-500/10 border border-violet-500/20 p-3 rounded-xl space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <ArrowLeftRight className="h-4 w-4 text-violet-500 shrink-0" />
                  Bodega Durazno unificada con Cocina
                </p>
                <p>
                  ¿Seguro que la nota desea que esté en{' '}
                  <strong className="text-foreground">
                    Durazno ({ladoDurazno === 'ambos' ? 'origen y destino' : ladoDurazno})
                  </strong>
                  ? ¿Desea cambiarlo a Cocina?
                </p>
                <Button type="button" variant="outline" size="sm" onClick={onCambiarACocina} className="h-8 text-xs font-bold gap-1.5 rounded-xl">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Cambiar a Cocina
                </Button>
              </div>
            )}
          </div>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel onClick={() => onShowRevisionDialogChange(false)} className="rounded-xl font-bold uppercase text-xs tracking-wider">
              Revisar / Modificar
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmRevision} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-xs tracking-wider shadow-md">
              Continuar y Guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ModalStockInsuficiente
        open={showStockModal}
        onOpenChange={onShowStockModalChange}
        faltantes={stockFaltantes}
        bodegaOrigenNombre={bodegaOrigenNombre}
        modo={stockAvisoModo}
        isBusy={isValidandoStock}
        onAjustar={onAjustarYContinuar}
        onGuardarBorrador={stockAvisoModo === 'borrador' ? onGuardarBorrador : undefined}
        onVerSustitutos={onVerSustitutosPorProducto}
      />
    </>
  )
}
