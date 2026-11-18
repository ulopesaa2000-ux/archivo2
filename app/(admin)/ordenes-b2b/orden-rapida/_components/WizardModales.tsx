// app/(admin)/ordenes-b2b/orden-rapida/_components/WizardModales.tsx
'use client'

import { AlertTriangle, Check, HelpCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SkuProbable } from '@/modules/ordenes-b2b/actions'
import { PARSER_FORMATS, type ContainerMock } from '../_hooks/orden-rapida-types'

interface WizardModalesProps {
  deleteProductModal: { open: boolean; index: number; sku: string } | null
  onCloseDeleteProductModal: () => void
  onConfirmDeleteProduct: () => void
  isSurtidoModalOpen: boolean
  onOpenSurtidoModalChange: (open: boolean) => void
  selectedContenedorObj: ContainerMock | undefined
  onElegirOtroContenedor: () => void
  isAddProductOpen: boolean
  onOpenAddProductChange: (open: boolean) => void
  newSku: string
  onNewSkuChange: (val: string) => void
  newDesc: string
  onNewDescChange: (val: string) => void
  newMarca: string
  onNewMarcaChange: (val: string) => void
  newPrecio: string
  onNewPrecioChange: (val: string) => void
  onAddProduct: () => void
  discrepancyModal: {
    open: boolean
    items: Array<{ sku: string; piezasProducto: number; piezasCajas: number; diferencia: number }>
  } | null
  onCloseDiscrepancyModal: () => void
  onContinueFromDiscrepancy: () => void
  cajasBlockModal: {
    open: boolean
    blocking: boolean
    items: Array<{ sku: string; cajasEsperadas: number; cajasArmadas: number; diferencia: number }>
  } | null
  onCloseCajasBlockModal: () => void
  huecosFisicoCount: number
  onRellenarDesdeAviso: () => void
  onContinueFromCajasBlock: () => void
  alertaAmbarOpen: boolean
  onOpenAlertaAmbarChange: (open: boolean) => void
  probablesSinResolver: SkuProbable[]
  onSincronizarProbable: (prob: SkuProbable) => void
  onContinueFromAlertaAmbar: () => void
  isParserGuideOpen: boolean
  onOpenParserGuideChange: (open: boolean) => void
  selectedParserFormat: string
  onSelectParserFormat: (formatId: string) => void
}

export function WizardModales({
  deleteProductModal,
  onCloseDeleteProductModal,
  onConfirmDeleteProduct,
  isSurtidoModalOpen,
  onOpenSurtidoModalChange,
  selectedContenedorObj,
  onElegirOtroContenedor,
  isAddProductOpen,
  onOpenAddProductChange,
  newSku,
  onNewSkuChange,
  newDesc,
  onNewDescChange,
  newMarca,
  onNewMarcaChange,
  newPrecio,
  onNewPrecioChange,
  onAddProduct,
  discrepancyModal,
  onCloseDiscrepancyModal,
  onContinueFromDiscrepancy,
  cajasBlockModal,
  onCloseCajasBlockModal,
  huecosFisicoCount,
  onRellenarDesdeAviso,
  onContinueFromCajasBlock,
  alertaAmbarOpen,
  onOpenAlertaAmbarChange,
  probablesSinResolver,
  onSincronizarProbable,
  onContinueFromAlertaAmbar,
  isParserGuideOpen,
  onOpenParserGuideChange,
  selectedParserFormat,
  onSelectParserFormat,
}: WizardModalesProps) {
  return (
    <>
      {/* Modal 1: Confirmación de eliminación de producto */}
      <AlertDialog open={Boolean(deleteProductModal)} onOpenChange={(open) => !open && onCloseDeleteProductModal()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> ¿Eliminar producto de la revisión?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el producto{' '}
              <strong className="font-mono text-foreground">{deleteProductModal?.sku}</strong> de esta revisión? Esta
              acción también removerá las cajas asociadas a este SKU.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Sí, eliminar producto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: aviso de contenedor ya surtido */}
      <Dialog open={isSurtidoModalOpen} onOpenChange={onOpenSurtidoModalChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="h-5 w-5 shrink-0" /> Este contenedor ya está surtido
            </DialogTitle>
            <DialogDescription>
              {selectedContenedorObj ? (
                <>
                  El contenedor{' '}
                  <strong className="font-mono text-foreground">
                    {selectedContenedorObj.codigo_contenedor} ({selectedContenedorObj.numero_contenedor ?? 'S/N'})
                  </strong>{' '}
                  está en estado <strong className="text-foreground">{selectedContenedorObj.estado}</strong>. Se resalta
                  en amarillo para que puedas ubicar los contenedores recientes, esten o no surtidos.
                </>
              ) : (
                'El contenedor seleccionado ya fue surtido.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100">
            Si cargas otra orden sobre este contenedor se asociará al mismo destino. Si buscabas un contenedor libre, elige
            otro de la lista.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onElegirOtroContenedor}>
              Elegir otro contenedor
            </Button>
            <Button onClick={() => onOpenSurtidoModalChange(false)} className="gap-1 font-bold">
              <Check className="h-4 w-4" /> Entendido, usarlo igual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Agregar nuevo producto manualmente */}
      <Dialog open={isAddProductOpen} onOpenChange={onOpenAddProductChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Agregar nuevo producto
            </DialogTitle>
            <DialogDescription>Ingresa los datos del producto para añadirlo a la lista de revisión.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-sku" className="text-xs font-bold">
                SKU Base *
              </Label>
              <Input
                id="add-sku"
                placeholder="Ej: K24-MOD-01"
                value={newSku}
                onChange={(e) => onNewSkuChange(e.target.value)}
                className="h-9 font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-desc" className="text-xs font-bold">
                Descripción
              </Label>
              <Input
                id="add-desc"
                placeholder="Ej: Playera estampada caballero"
                value={newDesc}
                onChange={(e) => onNewDescChange(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-marca" className="text-xs font-bold">
                  Marca
                </Label>
                <Input
                  id="add-marca"
                  placeholder="Ej: MOTY"
                  value={newMarca}
                  onChange={(e) => onNewMarcaChange(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-precio" className="text-xs font-bold">
                  Precio USD
                </Label>
                <Input
                  id="add-precio"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 5.50"
                  value={newPrecio}
                  onChange={(e) => onNewPrecioChange(e.target.value)}
                  className="h-9 font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenAddProductChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onAddProduct} className="gap-1 font-bold">
              <Plus className="h-4 w-4" /> Guardar producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Alerta de discrepancia de cantidades */}
      <AlertDialog open={Boolean(discrepancyModal?.open)} onOpenChange={(open) => !open && onCloseDiscrepancyModal()}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              Diferencia detectada en cantidades (Productos vs Cajas)
            </AlertDialogTitle>
            <AlertDialogDescription>Diferencias entre piezas del producto y físico en cajas.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground pt-2">
            <div>
              Se encontraron diferencias entre la cantidad total de piezas del producto y el total físico desglosado en las
              cajas:
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border border-amber-200/80 bg-amber-50/60 p-3 space-y-2">
              {discrepancyModal?.items.map((item) => (
                <div key={item.sku} className="flex flex-col border-b border-amber-200/60 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-mono font-bold text-amber-900">{item.sku}</span>
                  <div className="flex justify-between text-[11px] text-amber-800">
                    <span>
                      Piezas esperadas: <strong>{item.piezasProducto.toLocaleString()}</strong> pzs
                    </span>
                    <span>
                      En Cajas: <strong>{item.piezasCajas.toLocaleString()}</strong> pzs
                    </span>
                    <span className={item.diferencia > 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      ({item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia} pzs)
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] italic">
              ¿Deseas regresar a revisar los datos o continuar a la sección de cajas de todos modos?
            </div>
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={onCloseDiscrepancyModal}>Revisar y corregir</AlertDialogCancel>
            <AlertDialogAction
              onClick={onContinueFromDiscrepancy}
              className="bg-amber-600 text-white hover:bg-amber-700 font-bold"
            >
              Continuar a Cajas de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal 3b: Aviso / Bloqueo modo cajas */}
      <AlertDialog open={Boolean(cajasBlockModal?.open)} onOpenChange={(open) => !open && onCloseCajasBlockModal()}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle
              className={`flex items-center gap-2 ${cajasBlockModal?.blocking ? 'text-destructive' : 'text-amber-600'}`}
            >
              <AlertTriangle className={`h-5 w-5 shrink-0 ${cajasBlockModal?.blocking ? '' : 'text-amber-500'}`} />
              {cajasBlockModal?.blocking
                ? 'Bloqueo modo cajas: líneas sin match con cajas armadas'
                : 'Aviso modo cajas: líneas sin match con cajas armadas'}
            </AlertDialogTitle>
            <AlertDialogDescription>Líneas sin match con cajas armadas (modo solo cajas, exacto).</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground pt-2">
            <div>
              Cada producto debe tener las mismas cajas en línea que en cajas armadas (exacto, sin tolerancia).
              {cajasBlockModal?.blocking
                ? ' Corrige la orden: no se puede guardar así.'
                : ' Las cajas y líneas se revisan en el paso 4: puedes rellenar huecos aquí o continuar a corregirlos.'}
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              {cajasBlockModal?.items.map((item) => (
                <div key={item.sku} className="flex flex-col border-b border-destructive/20 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-mono font-bold text-foreground">{item.sku}</span>
                  <div className="flex justify-between text-[11px]">
                    <span>
                      Línea (esperadas): <strong>{item.cajasEsperadas}</strong> cjs
                    </span>
                    <span>
                      Armadas: <strong>{item.cajasArmadas}</strong> cjs
                    </span>
                    <span className="font-bold text-destructive">
                      ({item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia} cjs)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            {cajasBlockModal?.blocking ? (
              <AlertDialogCancel onClick={onCloseCajasBlockModal}>Revisar y corregir</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel onClick={onCloseCajasBlockModal}>Revisar</AlertDialogCancel>
                {huecosFisicoCount > 0 && (
                  <Button
                    type="button"
                    onClick={onRellenarDesdeAviso}
                    className="bg-amber-600 text-white hover:bg-amber-700 font-bold"
                  >
                    Rellenar desde físico
                  </Button>
                )}
                <AlertDialogAction onClick={onContinueFromCajasBlock} className="font-bold">
                  Continuar a Cajas
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal 3c: Alerta saltable ámbar */}
      <AlertDialog open={alertaAmbarOpen} onOpenChange={(open) => !open && onOpenAlertaAmbarChange(false)}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              {probablesSinResolver.length} código{probablesSinResolver.length !== 1 ? 's' : ''} probablemente ya{' '}
              {probablesSinResolver.length !== 1 ? 'están' : 'está'} en BD
            </AlertDialogTitle>
            <AlertDialogDescription>Códigos probablemente existentes en BD (revisión ámbar).</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground pt-2">
            <div>Revísalos antes de continuar. Puedes sincronizar uno por uno o seguir y se guardarán como nuevos.</div>
            <div className="max-h-56 overflow-y-auto rounded-md border border-amber-200/80 bg-amber-50/60 p-3 space-y-2">
              {probablesSinResolver.map((p) => (
                <div key={p.inputSku} className="flex flex-col border-b border-amber-200/60 pb-1.5 last:border-0 last:pb-0 gap-1">
                  <span className="font-mono font-bold text-foreground">{p.inputSku}</span>
                  <span className="text-[11px] text-amber-800">
                    n8n: <strong>{p.inputSku}</strong> → BD: <strong>{p.dbSku}</strong> ({p.metodo}, {p.score})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] font-bold self-start border-teal-500/50 text-teal-700"
                    onClick={() => onSincronizarProbable(p)}
                  >
                    🔗 Sincronizar con {p.dbSku}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => onOpenAlertaAmbarChange(false)}>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={onContinueFromAlertaAmbar} className="font-bold">
              Continuar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal 5: Guía Visual de Formatos */}
      <Dialog open={isParserGuideOpen} onOpenChange={onOpenParserGuideChange}>
        <DialogContent className="w-[98vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <HelpCircle className="h-5 w-5 text-primary" /> Guía Visual: Formatos y Plantillas de Packing List (n8n)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Compara la estructura de tu archivo Excel con las plantillas soportadas para elegir el camino correcto en el
              procesamiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PARSER_FORMATS.filter((f) => f.id !== 'auto').map((format) => (
                <div
                  key={format.id}
                  className={`rounded-xl border p-4 space-y-3 transition-all ${
                    selectedParserFormat === format.id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                      : 'border-border/70 bg-card hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{format.label}</span>
                    <Badge variant="outline" className={`text-[10px] font-mono ${format.badgeColor}`}>
                      Ruta n8n: {format.id}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{format.fullDesc}</p>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Estructura típica de columnas:
                    </span>
                    <div className="rounded bg-muted/70 p-2 font-mono text-[10px] text-foreground border border-border/50 overflow-x-auto whitespace-nowrap">
                      {format.headerPreview}
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/30 p-2 text-[11px] space-y-1 border border-border/40">
                    <span className="font-semibold text-foreground">Proveedores / Fabricantes de ejemplo:</span>
                    <p className="text-muted-foreground text-[10px]">{format.proveedoresEjemplo}</p>
                  </div>

                  <Button
                    type="button"
                    variant={selectedParserFormat === format.id ? 'default' : 'outline'}
                    size="sm"
                    className="w-full h-7 text-xs font-semibold"
                    onClick={() => {
                      onSelectParserFormat(format.id)
                      onOpenParserGuideChange(false)
                      toast.success(`Formato cambiado a ${format.label}`)
                    }}
                  >
                    {selectedParserFormat === format.id
                      ? '✓ Formato Seleccionado'
                      : `Usar este Formato (${format.id})`}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => onOpenParserGuideChange(false)}>
              Cerrar Guía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
