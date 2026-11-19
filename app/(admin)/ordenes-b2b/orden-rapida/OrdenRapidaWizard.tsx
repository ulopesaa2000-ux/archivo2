// app/(admin)/ordenes-b2b/orden-rapida/OrdenRapidaWizard.tsx
// Orquestador delizado vertical del wizard Orden Rápida (AGENTS.md 3.7)
'use client'

import { useState, useCallback, useRef } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { CatalogoColorOrdenRapida, DbProductoData, SkuProbable } from '@/modules/ordenes-b2b/actions'
import type { ColorPorConfirmar, WizardCaja, WizardProducto, WizardProps } from './_hooks/orden-rapida-types'
import { useOrdenConfig } from './_hooks/use-orden-config'
import { useOrdenProductos } from './_hooks/use-orden-productos'
import { useOrdenCajasColores } from './_hooks/use-orden-cajas-colores'
import { useOrdenVerificacion } from './_hooks/use-orden-verificacion'
import { Step1Config } from './_components/Step1Config'
import { Step2Upload } from './_components/Step2Upload'
import { Step3Productos } from './_components/Step3Productos'
import { Step4Cajas } from './_components/Step4Cajas'
import { Step5Resultado } from './_components/Step5Resultado'
import { ConfirmFinalModal } from './_components/ConfirmFinalModal'
import { WizardModales } from './_components/WizardModales'

const WIZARD_STEPS = [
  { number: 1, label: 'Config' },
  { number: 2, label: 'Carga' },
  { number: 3, label: 'Productos' },
  { number: 4, label: 'Cajas' },
  { number: 5, label: 'Revision' },
] as const

export function OrdenRapidaWizard({
  proveedores,
  clientes,
  contenedores,
  marcas = [],
  generos = [],
  edades = [],
  tipos_prenda = [],
}: WizardProps) {
  // Estado núcleo compartido entre pasos y hooks
  const [editableProductos, setEditableProductos] = useState<WizardProducto[]>([])
  const [editableCajas, setEditableCajas] = useState<WizardCaja[]>([])
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // Puente estable para callbacks asíncronos post-parseo
  const parseBridgeRef = useRef<{
    applyColorSeed?: (catalogo: CatalogoColorOrdenRapida[], colores: ColorPorConfirmar[]) => void
    applyDbVerification?: (res: {
      allMatched: Set<string>
      probables: SkuProbable[]
      skuN8nMap: Record<string, string>
      productosMap?: Record<string, DbProductoData>
      skuMap?: Record<string, string>
    }) => void
    setCheckingDb?: (checking: boolean) => void
    resetChildren?: () => void
    setSeparacionIgnorada?: (val: boolean) => void
    setColoresModalOpen?: (val: boolean) => void
    setColorDrafts?: (val: Record<string, never>) => void
  }>({})

  const config = useOrdenConfig({
    proveedores,
    clientes,
    contenedores,
    marcas,
    generos,
    edades,
    tipos_prenda,
    onHydrateAfterParse: ({ enrichedProductos, enrichedCajas }) => {
      parseBridgeRef.current.setSeparacionIgnorada?.(false)
      parseBridgeRef.current.setColoresModalOpen?.(false)
      parseBridgeRef.current.setColorDrafts?.({})
      setEditableProductos(structuredClone(enrichedProductos))
      setEditableCajas(structuredClone(enrichedCajas))
    },
    onApplyColorSeed: (catalogo, seed) => parseBridgeRef.current.applyColorSeed?.(catalogo, seed),
    onApplyDbVerification: (res) => parseBridgeRef.current.applyDbVerification?.(res),
    onCheckingDbSkusChange: (val) => parseBridgeRef.current.setCheckingDb?.(val),
    onResetParsedChildren: () => parseBridgeRef.current.resetChildren?.(),
  })

  const productos = useOrdenProductos({
    proveedores,
    selectedProveedor: config.selectedProveedor,
    marcas,
    generos,
    edades,
    tipos_prenda,
    editableProductos,
    setEditableProductos,
    setEditableCajas,
    setExpandedProducts,
  })

  const cajasColores = useOrdenCajasColores({
    step: config.step,
    parsedData: config.parsedData,
    setParsedData: config.setParsedData,
    editableProductos,
    setEditableProductos,
    editableCajas,
    setEditableCajas,
    expandedProducts,
    setExpandedProducts,
    proveedores,
    selectedProveedor: config.selectedProveedor,
    marcas,
    generos,
    edades,
    tipos_prenda,
    setDbSkusSet: productos.setDbSkusSet,
    setProbablesDb: productos.setProbablesDb,
  })

  const verificacion = useOrdenVerificacion({
    step: config.step,
    setStep: config.setStep,
    selectedProveedor: config.selectedProveedor,
    selectedCliente: config.selectedCliente,
    selectedContenedor: config.selectedContenedor,
    newContainerCode: config.newContainerCode,
    newContainerNumber: config.newContainerNumber,
    parsedData: config.parsedData,
    setParsedData: config.setParsedData,
    editableProductos,
    editableCajas,
    setEditableCajas,
    setExpandedProducts,
    setEditandoSku: productos.setEditandoSku,
    vinculosDb: productos.vinculosDb,
    probablesSinResolverCount: productos.probablesSinResolver.length,
    setAlertaAmbarOpen: productos.setAlertaAmbarOpen,
    principalPorSku: cajasColores.principalPorSku,
    setPrincipalPorSku: cajasColores.setPrincipalPorSku,
    catalogoColores: cajasColores.catalogoColores,
    coloresPorConfirmar: cajasColores.coloresPorConfirmar,
    setColoresModalOpen: cajasColores.setColoresModalOpen,
    totalCajasCount: cajasColores.totalCajasCount,
    totalCbm: cajasColores.totalCbm,
    totalPesoBruto: cajasColores.totalPesoBruto,
    overrideCbm: cajasColores.overrideCbm,
    overridePeso: cajasColores.overridePeso,
    cajaPrincipalDe: cajasColores.cajaPrincipalDe,
  })

  parseBridgeRef.current.applyColorSeed = (catalogo, seed) => {
    cajasColores.setCatalogoColores(catalogo)
    cajasColores.setColoresPorConfirmar(seed)
  }
  parseBridgeRef.current.applyDbVerification = productos.applyDbVerification
  parseBridgeRef.current.setCheckingDb = productos.setIsCheckingDbSkus
  parseBridgeRef.current.setSeparacionIgnorada = cajasColores.setSeparacionIgnorada
  parseBridgeRef.current.setColoresModalOpen = cajasColores.setColoresModalOpen
  parseBridgeRef.current.setColorDrafts = cajasColores.setColorDrafts as (v: Record<string, never>) => void
  parseBridgeRef.current.resetChildren = () => {
    productos.resetProductosState()
    cajasColores.resetCajasColoresState()
    verificacion.resetVerificacionState()
  }

  const handleNuevaOrden = useCallback(() => {
    config.resetParsedBase()
    config.setSelectedFile(null)
    productos.setAlertaAmbarOpen(false)
    config.setStep(1)
    toast.info('Lista para una nueva orden: sube otro Packing List.')
  }, [config, productos])

  return (
    <div className="space-y-6">
      <div className="mx-auto mb-8 flex max-w-2xl items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
        {WIZARD_STEPS.map((item, index) => (
          <div key={item.number} className="flex flex-1 items-center last:flex-none">
            <div className="z-10 flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  config.step === item.number
                    ? 'scale-110 bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md'
                    : config.step > item.number
                      ? 'bg-green-600 text-white'
                      : 'border border-border/80 bg-muted text-muted-foreground'
                }`}
              >
                {config.step > item.number ? 'OK' : item.number}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  config.step === item.number ? 'font-bold text-primary' : 'text-muted-foreground/80'
                }`}
              >
                {item.label}
              </span>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 rounded transition-colors ${
                  config.step > item.number ? 'bg-green-600' : 'bg-border/60'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card className="overflow-hidden border-border/60 bg-card/65 shadow-md">
        <CardContent className="p-6">
          {config.step === 1 && (
            <Step1Config
              proveedores={proveedores}
              clientes={clientes}
              selectedProveedor={config.selectedProveedor}
              selectedProveedorObj={config.selectedProveedorObj}
              onProveedorChange={config.handleProveedorChange}
              selectedCliente={config.selectedCliente}
              selectedClienteObj={config.selectedClienteObj}
              onClienteChange={config.setSelectedCliente}
              selectedContenedor={config.selectedContenedor}
              selectedContenedorObj={config.selectedContenedorObj}
              selectedContenedorEsSurtido={config.selectedContenedorEsSurtido}
              filteredContenedores={config.filteredContenedores}
              contenedorPopoverOpen={config.contenedorPopoverOpen}
              onContenedorPopoverOpenChange={config.setContenedorPopoverOpen}
              contenedorSearch={config.contenedorSearch}
              onContenedorSearchChange={config.setContenedorSearch}
              onContenedorSelect={config.handleContenedorSelect}
              newContainerCode={config.newContainerCode}
              onNewContainerCodeChange={config.setNewContainerCode}
              newContainerNumber={config.newContainerNumber}
              onNewContainerNumberChange={config.setNewContainerNumber}
              selectedParserFormat={config.selectedParserFormat}
              onParserFormatChange={config.setSelectedParserFormat}
              onOpenParserGuide={() => config.setIsParserGuideOpen(true)}
            />
          )}

          {config.step === 2 && (
            <Step2Upload
              selectedParserFormat={config.selectedParserFormat}
              onParserFormatChange={config.setSelectedParserFormat}
              onOpenParserGuide={() => config.setIsParserGuideOpen(true)}
              selectedFile={config.selectedFile}
              fileName={config.fileName}
              processing={config.processing}
              progress={config.progress}
              progressMsg={config.progressMsg}
              warnings={config.warnings}
              rawN8nResponse={config.rawN8nResponse}
              debugInfo={config.debugInfo}
              onFileSelected={(file) => {
                config.setSelectedFile(file)
                config.setFileName(file?.name ?? null)
                config.resetParsedBase()
              }}
              onProcessFile={() => void config.procesarPackingList()}
            />
          )}

          {config.step === 3 && (
            <Step3Productos
              editableProductos={editableProductos}
              onUpdateProductos={setEditableProductos}
              editableCajas={editableCajas}
              parsedData={config.parsedData}
              marcas={marcas}
              generos={generos}
              edades={edades}
              tipos_prenda={tipos_prenda}
              isCheckingDbSkus={productos.isCheckingDbSkus}
              isSyncingDbProducts={productos.isSyncingDbProducts}
              warnings={config.warnings}
              dbSkusSet={productos.dbSkusSet}
              vinculosDb={productos.vinculosDb}
              probablesDb={productos.probablesDb}
              skuN8nPorSku={productos.skuN8nPorSku}
              alertasPorSku={cajasColores.alertasPorSku}
              rellenadosN8n={cajasColores.rellenadosN8n}
              separacionPorSku={cajasColores.separacionPorSku}
              separacionIgnorada={cajasColores.separacionIgnorada}
              onIgnorarSeparacion={() => cajasColores.setSeparacionIgnorada(true)}
              buscandoDb={productos.buscandoDb}
              editandoSku={productos.editandoSku}
              onSetEditandoSku={productos.setEditandoSku}
              onAutoDetectAll={productos.handleAutoDetectAllProducts}
              onAutoDetectProduct={productos.handleAutoDetectProduct}
              onSyncProductsFromDb={() => void productos.handleSyncProductsFromDb()}
              onOpenAddProduct={() => productos.setIsAddProductOpen(true)}
              onQuitarVinculo={productos.handleQuitarVinculo}
              onSincronizarProbable={productos.handleSincronizarProbable}
              onSepararSugerido={cajasColores.handleSepararSugerido}
              onDividirPack={cajasColores.handleDividirPack}
              onCommitSkuEdit={productos.commitSkuEdit}
              onBuscarSkuEnBD={(prod, idx) => void productos.handleBuscarSkuEnBD(prod, idx)}
              onRequestDeleteProduct={(index, sku) => productos.setDeleteProductModal({ open: true, index, sku })}
            />
          )}

          {config.step === 4 && (
            <Step4Cajas
              modoArrastre={cajasColores.modoArrastre}
              onToggleModoArrastre={() => {
                cajasColores.setModoArrastre((prev) => {
                  if (!prev) {
                    cajasColores.setShowWarnings(false)
                    cajasColores.setShowHuecos(false)
                    toast.info(
                      'Modo arrastre: usa el grip ✋ de cada caja o tócala y luego toca el producto destino.'
                    )
                  }
                  return !prev
                })
                cajasColores.setCajaArrastrada(null)
                cajasColores.setDragOverProducto(null)
              }}
              onExpandAll={cajasColores.expandAllProducts}
              onCollapseAll={cajasColores.collapseAllProducts}
              cajasAgrupadas={cajasColores.cajasAgrupadas}
              totalCajasCount={cajasColores.totalCajasCount}
              totalPiezasCount={cajasColores.totalPiezasCount}
              totalCbm={cajasColores.totalCbm}
              totalPesoNeto={cajasColores.totalPesoNeto}
              totalPesoBruto={cajasColores.totalPesoBruto}
              parsedData={config.parsedData}
              overrideProductos={cajasColores.overrideProductos}
              onSetOverrideProductos={cajasColores.setOverrideProductos}
              overrideCajas={cajasColores.overrideCajas}
              onSetOverrideCajas={cajasColores.setOverrideCajas}
              overridePiezas={cajasColores.overridePiezas}
              onSetOverridePiezas={cajasColores.setOverridePiezas}
              overrideCbm={cajasColores.overrideCbm}
              onSetOverrideCbm={cajasColores.setOverrideCbm}
              overridePesoNeto={cajasColores.overridePesoNeto}
              onSetOverridePesoNeto={cajasColores.setOverridePesoNeto}
              overridePeso={cajasColores.overridePeso}
              onSetOverridePeso={cajasColores.setOverridePeso}
              onAbrirOverride={cajasColores.abrirOverride}
              huecosFisico={verificacion.huecosFisico}
              huecosRellenados={verificacion.huecosRellenados}
              showHuecos={cajasColores.showHuecos}
              onToggleShowHuecos={() => cajasColores.setShowHuecos((prev) => !prev)}
              onRellenarHuecos={verificacion.handleRellenarHuecos}
              expandedProducts={expandedProducts}
              onToggleProduct={cajasColores.toggleProduct}
              dragOverProducto={cajasColores.dragOverProducto}
              onSetDragOverProducto={cajasColores.setDragOverProducto}
              cajaArrastrada={cajasColores.cajaArrastrada}
              onMoverCaja={cajasColores.handleMoverCaja}
              jsonTotalesPorSku={verificacion.jsonTotalesPorSku}
              alertasPorSku={cajasColores.alertasPorSku}
              alertasPorCaja={cajasColores.alertasPorCaja}
              detallesPorCaja={cajasColores.detallesPorCaja}
              cajaPrincipalDe={cajasColores.cajaPrincipalDe}
              onSetPrincipalPorSku={cajasColores.setPrincipalPorSku}
              lineaEsperada={verificacion.lineaEsperada}
              lineaEditadaPorSku={verificacion.lineaEditadaPorSku}
              onSetLineaEditadaPorSku={verificacion.setLineaEditadaPorSku}
              editLineaSku={verificacion.editLineaSku}
              onSetEditLineaSku={verificacion.setEditLineaSku}
              editLineaVal={verificacion.editLineaVal}
              onSetEditLineaVal={verificacion.setEditLineaVal}
              onCajaAdd={cajasColores.handleCajaAdd}
              lineaPackEsperada={verificacion.lineaPackEsperada}
              jsonPackTieneSku={verificacion.jsonPackTieneSku}
              lineaEditadaPorPack={verificacion.lineaEditadaPorPack}
              onSetLineaEditadaPorPack={verificacion.setLineaEditadaPorPack}
              editPackSku={verificacion.editPackSku}
              onSetEditPackSku={verificacion.setEditPackSku}
              editPackVal={verificacion.editPackVal}
              onSetEditPackVal={verificacion.setEditPackVal}
              editPackNombre={cajasColores.editPackNombre}
              onSetEditPackNombre={cajasColores.setEditPackNombre}
              editPackNombreVal={cajasColores.editPackNombreVal}
              onSetEditPackNombreVal={cajasColores.setEditPackNombreVal}
              onRenombrarPack={cajasColores.handleRenombrarPack}
              onDividirPack={cajasColores.handleDividirPack}
              catalogoColores={cajasColores.catalogoColores}
              matchColoresPorCaja={cajasColores.matchColoresPorCaja}
              onToggleArrastrada={cajasColores.handleToggleArrastrada}
              onDragStartArrastrada={cajasColores.handleDragStartArrastrada}
              onDragEndArrastrada={cajasColores.handleDragEndArrastrada}
              onCajaEdit={cajasColores.handleCajaEdit}
              onCajaRemove={cajasColores.handleCajaRemove}
              onAbrirColoresRaw={cajasColores.handleAbrirColoresRaw}
              mapaNombres={cajasColores.mapaNombres}
              selectedContenedor={config.selectedContenedor}
              newContainerCode={config.newContainerCode}
              newContainerNumber={config.newContainerNumber}
              sortedContenedores={config.sortedContenedores}
              selectedContenedorObj={config.selectedContenedorObj}
              selectedContenedorEsSurtido={config.selectedContenedorEsSurtido}
              warnings={config.warnings}
              showWarnings={cajasColores.showWarnings}
              onToggleWarnings={() => cajasColores.setShowWarnings((prev) => !prev)}
              coloresNuevos={cajasColores.coloresNuevos}
              coloresOmitidos={cajasColores.coloresOmitidos}
              coloresPorConfirmar={cajasColores.coloresPorConfirmar}
              onEnsureDraftsAndOpenColores={() => {
                cajasColores.ensureDrafts(cajasColores.coloresNuevos)
                cajasColores.setColoresModalOpen(true)
              }}
              overrideModal={cajasColores.overrideModal}
              onCloseOverrideModal={() => cajasColores.setOverrideModal(null)}
              overrideValor={cajasColores.overrideValor}
              onOverrideValorChange={cajasColores.setOverrideValor}
              onAplicarOverride={cajasColores.aplicarOverride}
              coloresModalOpen={cajasColores.coloresModalOpen}
              onColoresModalOpenChange={cajasColores.setColoresModalOpen}
              filtroPendientes={cajasColores.filtroPendientes}
              onFiltroPendientesChange={cajasColores.setFiltroPendientes}
              pendientesFiltrados={cajasColores.pendientesFiltrados}
              coloresAmbar={cajasColores.coloresAmbar}
              coloresAmbarDobles={cajasColores.coloresAmbarDobles}
              colorDrafts={cajasColores.colorDrafts}
              onSetColorDrafts={cajasColores.setColorDrafts}
              hexSugiriendo={cajasColores.hexSugiriendo}
              ambarEditando={cajasColores.ambarEditando}
              onMapearColor={cajasColores.handleMapearColor}
              onCrearColorFila={cajasColores.handleCrearColorFila}
              onCrearTodosColores={() => void cajasColores.handleCrearTodosColores()}
              onOmitirColor={cajasColores.handleOmitirColor}
              onReabrirColor={cajasColores.handleReabrirColor}
              onSugerirHex={(raw) => void cajasColores.handleSugerirHex(raw)}
              onAbrirEditorAmbar={cajasColores.abrirEditorAmbar}
              onCerrarEditorAmbar={cajasColores.cerrarEditorAmbar}
            />
          )}

          {config.step === 5 && <Step5Resultado onNuevaOrden={handleNuevaOrden} />}
        </CardContent>
      </Card>

      {config.step < 5 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={verificacion.handleBack}
            disabled={config.step === 1 || verificacion.isPending}
            className="h-9 gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Atras
          </Button>

          <Button
            size="sm"
            onClick={verificacion.handleNext}
            disabled={
              verificacion.isPending ||
              config.processing ||
              (config.step === 2 && (!config.parsedData || config.parsedData.productos.length === 0))
            }
            className="h-9 gap-1 font-semibold"
          >
            {verificacion.isPending || config.processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                {config.step === 4 ? 'Confirmar revision' : 'Siguiente'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}

      <WizardModales
        deleteProductModal={productos.deleteProductModal}
        onCloseDeleteProductModal={() => productos.setDeleteProductModal(null)}
        onConfirmDeleteProduct={productos.handleConfirmDeleteProduct}
        isSurtidoModalOpen={config.isSurtidoModalOpen}
        onOpenSurtidoModalChange={config.setIsSurtidoModalOpen}
        selectedContenedorObj={config.selectedContenedorObj}
        onElegirOtroContenedor={() => {
          config.setIsSurtidoModalOpen(false)
          config.handleContenedorSelect('')
          config.setContenedorPopoverOpen(true)
        }}
        isAddProductOpen={productos.isAddProductOpen}
        onOpenAddProductChange={productos.setIsAddProductOpen}
        newSku={productos.newSku}
        onNewSkuChange={productos.setNewSku}
        newDesc={productos.newDesc}
        onNewDescChange={productos.setNewDesc}
        newMarca={productos.newMarca}
        onNewMarcaChange={productos.setNewMarca}
        newPrecio={productos.newPrecio}
        onNewPrecioChange={productos.setNewPrecio}
        onAddProduct={productos.handleAddProduct}
        discrepancyModal={verificacion.discrepancyModal}
        onCloseDiscrepancyModal={() => verificacion.setDiscrepancyModal(null)}
        onContinueFromDiscrepancy={() => {
          verificacion.setDiscrepancyModal(null)
          config.setStep(4)
        }}
        cajasBlockModal={verificacion.cajasBlockModal}
        onCloseCajasBlockModal={() => verificacion.setCajasBlockModal(null)}
        huecosFisicoCount={verificacion.huecosFisico.length}
        onRellenarDesdeAviso={verificacion.handleRellenarDesdeAviso}
        onContinueFromCajasBlock={() => {
          verificacion.setCajasBlockModal(null)
          config.setStep(4)
        }}
        alertaAmbarOpen={productos.alertaAmbarOpen}
        onOpenAlertaAmbarChange={productos.setAlertaAmbarOpen}
        probablesSinResolver={productos.probablesSinResolver}
        onSincronizarProbable={productos.handleSincronizarProbable}
        onContinueFromAlertaAmbar={() => {
          productos.setAlertaAmbarOpen(false)
          verificacion.doGuardarOrden()
        }}
        isParserGuideOpen={config.isParserGuideOpen}
        onOpenParserGuideChange={config.setIsParserGuideOpen}
        selectedParserFormat={config.selectedParserFormat}
        onSelectParserFormat={config.setSelectedParserFormat}
      />

      <ConfirmFinalModal
        open={verificacion.isConfirmFinalModalOpen}
        onOpenChange={verificacion.setIsConfirmFinalModalOpen}
        verificadoOk={verificacion.verificadoOk}
        verificacionManual={verificacion.verificacionManual}
        necesitaReverificar={verificacion.necesitaReverificar}
        onVerificarLocal={verificacion.handleVerificarLocal}
        erroresBloqueantes={verificacion.erroresBloqueantes}
        advertenciasSubida={verificacion.advertenciasSubida}
        mostrarErroresSubida={verificacion.mostrarErroresSubida}
        onToggleMostrarErrores={() => verificacion.setMostrarErroresSubida((v) => !v)}
        mostrarAdvertenciasSubida={verificacion.mostrarAdvertenciasSubida}
        onToggleMostrarAdvertencias={() => verificacion.setMostrarAdvertenciasSubida((v) => !v)}
        verificacionPrevia={verificacion.verificacionPrevia}
        onFijarPzMinima={cajasColores.handleFijarPzMinima}
        alertasN8n={cajasColores.alertasN8n}
        auditoriaN8n={cajasColores.auditoriaN8n}
        coloresAmbar={cajasColores.coloresAmbar}
        onOpenColoresModal={() => cajasColores.setColoresModalOpen(true)}
        onIrACorregir={verificacion.handleIrACorregir}
        codigoRenameDrafts={verificacion.codigoRenameDrafts}
        onSetCodigoRenameDrafts={verificacion.setCodigoRenameDrafts}
        onRenombrarCodigoEnModal={verificacion.handleRenombrarCodigoEnModal}
        modalLineaDrafts={verificacion.modalLineaDrafts}
        onSetModalLineaDrafts={verificacion.setModalLineaDrafts}
        lineaEsperada={verificacion.lineaEsperada}
        onSetLineaEditadaPorSku={verificacion.setLineaEditadaPorSku}
        modalPackDrafts={verificacion.modalPackDrafts}
        onSetModalPackDrafts={verificacion.setModalPackDrafts}
        lineaPackEsperada={verificacion.lineaPackEsperada}
        onSetLineaEditadaPorPack={verificacion.setLineaEditadaPorPack}
        modalCajaNumDrafts={verificacion.modalCajaNumDrafts}
        onSetModalCajaNumDrafts={verificacion.setModalCajaNumDrafts}
        editableCajas={editableCajas}
        onAjustarCajaNumero={verificacion.handleAjustarCajaNumero}
        proveedores={proveedores}
        selectedProveedor={config.selectedProveedor}
        selectedProveedorObj={config.selectedProveedorObj}
        onProveedorChange={config.handleProveedorChange}
        selectedCliente={config.selectedCliente}
        selectedClienteObj={config.selectedClienteObj}
        selectedContenedor={config.selectedContenedor}
        newContainerCode={config.newContainerCode}
        newContainerNumber={config.newContainerNumber}
        selectedContenedorObj={config.selectedContenedorObj}
        editableProductos={editableProductos}
        totalCajasCount={cajasColores.totalCajasCount}
        totalPiezasCount={cajasColores.totalPiezasCount}
        resumenSku={verificacion.resumenSku}
        isPending={verificacion.isPending}
        onConfirmGuardar={verificacion.handleConfirmReview}
      />
    </div>
  )
}
