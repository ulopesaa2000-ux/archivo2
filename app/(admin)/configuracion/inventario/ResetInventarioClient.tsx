// app/(admin)/configuracion/inventario/ResetInventarioClient.tsx
'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, ShieldAlert, RotateCcw, FileText, Warehouse, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  resetNotasAction,
  resetStockCeroAction,
  resetStockCeroBodegaAction,
  resetCompletoInventarioAction,
} from '@/modules/config/inventory-reset-actions'

type ActionType = 'notas' | 'stock' | 'completo' | 'bodega' | null

export type BodegaSimple = {
  id: number
  nombre: string
  codigo: string | null
  ciudad: string | null
  activa: boolean | null
  es_virtual: boolean | null
}

type Props = {
  bodegas?: BodegaSimple[]
}

export function ResetInventarioClient({ bodegas = [] }: Props) {
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [selectedBodega, setSelectedBodega] = useState<BodegaSimple | null>(null)
  const [selectedCardBodegaId, setSelectedCardBodegaId] = useState<number>(0)
  const [selectedNotasBodegaId, setSelectedNotasBodegaId] = useState<number>(0)
  const [confirmText, setConfirmText] = useState('')
  const [isPending, startTransition] = useTransition()

  const getRequiredKeyword = () => {
    if (activeAction === 'bodega') return 'REINICIAR BODEGA'
    if (activeAction === 'notas' && selectedNotasBodegaId > 0) return 'REINICIAR BODEGA'
    return 'REINICIAR INVENTARIO'
  }

  const handleOpenDialog = (action: ActionType) => {
    setActiveAction(action)
    setSelectedBodega(null)
    setSelectedNotasBodegaId(0)
    setConfirmText('')
  }

  const handleOpenNotasDialog = (bodegaId: number = 0) => {
    setActiveAction('notas')
    setSelectedNotasBodegaId(bodegaId)
    setSelectedBodega(null)
    setConfirmText('')
  }

  const handleOpenBodegaDialog = (bodega: BodegaSimple) => {
    setActiveAction('bodega')
    setSelectedBodega(bodega)
    setConfirmText('')
  }

  const handleOpenCardBodegaDialog = () => {
    const b = bodegas.find((item) => item.id === selectedCardBodegaId)
    if (b) {
      handleOpenBodegaDialog(b)
    } else {
      toast.error('Por favor selecciona una bodega válida.')
    }
  }

  const handleCloseDialog = () => {
    if (isPending) return
    setActiveAction(null)
    setSelectedBodega(null)
    setSelectedNotasBodegaId(0)
    setConfirmText('')
  }

  const handleExecuteReset = () => {
    const requiredKeyword = getRequiredKeyword()
    if (confirmText.trim().toUpperCase() !== requiredKeyword) {
      toast.error(`Escribe exactamente '${requiredKeyword}' para confirmar.`)
      return
    }

    startTransition(async () => {
      let res
      if (activeAction === 'notas') {
        res = await resetNotasAction(selectedNotasBodegaId)
      } else if (activeAction === 'stock') {
        res = await resetStockCeroAction()
      } else if (activeAction === 'completo') {
        res = await resetCompletoInventarioAction()
      } else if (activeAction === 'bodega' && selectedBodega) {
        res = await resetStockCeroBodegaAction(selectedBodega.id)
      }

      if (res?.success) {
        toast.success(res.message || 'Operación ejecutada exitosamente.')
        handleCloseDialog()
      } else {
        toast.error(res?.error || 'Error al ejecutar la acción de reinicio.')
      }
    })
  }

  const currentKeyword = getRequiredKeyword()

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner de Advertencia de Alta Seguridad */}
      <Card className="border-red-500/40 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent shadow-lg shadow-red-500/5 overflow-hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="p-3.5 rounded-2xl bg-red-500 text-white shadow-md shadow-red-500/30 shrink-0">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-500 text-white font-black uppercase text-[10px] tracking-wider">
                Super Admin Nivel 1 Exclusivo
              </Badge>
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground">
              Herramienta de Reinicio Operativo de Inventario
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Esta sección permite vaciar el historial de notas e iniciar las existencias de stock en cero para reiniciar las operaciones. Reservado exclusivamente para la Administración General.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grid de 4 Opciones de Reinicio Operativo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Opción 1: Vaciar Notas */}
        <Card className="border shadow-md hover:shadow-lg transition-all flex flex-col justify-between group border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit mb-2">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-bold">1. Vaciar Notas</CardTitle>
            <CardDescription className="text-xs">
              Oculta las notas (`activo = false`) de todas las bodegas o una específica sin romper relaciones con `nota_detalles`.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenNotasDialog(0)}
              className="w-full font-bold text-xs uppercase tracking-wider h-10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 rounded-xl"
            >
              Vaciar Notas
            </Button>
          </CardContent>
        </Card>

        {/* Opción 2: Poner Stock a 0 (Global) */}
        <Card className="border shadow-md hover:shadow-lg transition-all flex flex-col justify-between group">
          <CardHeader className="pb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit mb-2">
              <Warehouse className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-bold">2. Stock 0 (Global)</CardTitle>
            <CardDescription className="text-xs">
              Establece existencias en `0 cajas` y `0 piezas` para todos los productos en todas las bodegas.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenDialog('stock')}
              className="w-full font-bold text-xs uppercase tracking-wider h-10 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 rounded-xl"
            >
              Poner Stock a 0
            </Button>
          </CardContent>
        </Card>

        {/* Opción 3: Poner Stock a 0 (Personalizado por Bodega) */}
        <Card className="border shadow-md hover:shadow-lg transition-all flex flex-col justify-between group border-indigo-500/30 bg-indigo-500/5">
          <CardHeader className="pb-2">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-fit mb-2">
              <Warehouse className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-bold text-indigo-950 dark:text-indigo-200">3. Stock 0 (Por Bodega)</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Establece a 0 las existencias únicamente en la bodega que selecciones sin tocar las demás.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <select
              value={selectedCardBodegaId}
              onChange={(e) => setSelectedCardBodegaId(Number(e.target.value))}
              className="w-full h-9 rounded-xl border bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={0}>Selecciona una bodega...</option>
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.id} - {b.nombre} {b.ciudad ? `(${b.ciudad})` : ''}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              disabled={!selectedCardBodegaId}
              onClick={handleOpenCardBodegaDialog}
              className="w-full font-bold text-xs uppercase tracking-wider h-10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 rounded-xl disabled:opacity-50"
            >
              Poner a 0 Bodega
            </Button>
          </CardContent>
        </Card>

        {/* Opción 4: Reinicio Total */}
        <Card className="border-red-500/40 bg-gradient-to-br from-card via-card to-red-500/5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
          <CardHeader className="pb-3">
            <div className="p-2.5 rounded-xl bg-red-500 text-white shadow-md w-fit mb-2">
              <RotateCcw className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-black text-red-600 dark:text-red-400">4. Reinicio Total</CardTitle>
            <CardDescription className="text-xs">
              Oculta todo el historial de notas y reinicia todas las existencias de stock a 0 en un solo paso.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              type="button"
              onClick={() => handleOpenDialog('completo')}
              className="w-full font-black text-xs uppercase tracking-wider h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reinicio Total
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Detalle y Acciones Rápidas por Bodega */}
      <Card className="border shadow-md hover:shadow-lg transition-all overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Detalle y Acciones Rápidas por Bodega</CardTitle>
                <CardDescription className="text-xs">
                  Consulta el listado de bodegas y ejecuta de forma individual el vaciado de notas o el reinicio de stock a 0.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
              {bodegas.length} bodegas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {bodegas.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No se encontraron bodegas registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b">
                    <th className="px-4 py-3 text-left w-[90px]">ID Bodega</th>
                    <th className="px-4 py-3 text-left">Nombre de la Bodega</th>
                    <th className="px-4 py-3 text-left">Código / Ciudad</th>
                    <th className="px-4 py-3 text-center w-[110px]">Estado</th>
                    <th className="px-4 py-3 text-right w-[240px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {bodegas.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold">
                        <Badge variant="secondary" className="font-mono text-[11px] font-bold">
                          ID: {b.id}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-sm text-foreground">{b.nombre}</div>
                        {b.es_virtual && (
                          <span className="inline-block text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                            Bodega Virtual
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        <div className="font-mono font-medium">{b.codigo || '—'}</div>
                        <div className="text-[11px]">{b.ciudad || 'Sin ciudad'}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant={b.activa ? 'default' : 'outline'} className="text-[10px]">
                          {b.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenNotasDialog(b.id)}
                            className="font-bold text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 rounded-lg gap-1 h-8 px-2.5"
                            title="Vaciar notas de esta bodega"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Vaciar Notas
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenBodegaDialog(b)}
                            className="font-bold text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 rounded-lg gap-1 h-8 px-2.5"
                            title="Poner stock a 0 en esta bodega"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Stock 0
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ventana Modal Emergente de Advertencia */}
      <AlertDialog open={activeAction !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <AlertDialogContent className="sm:max-w-lg max-w-full w-full rounded-2xl border-2 border-red-500/50 bg-card p-6 shadow-[0_10px_50px_rgba(239,68,68,0.3)] dark:shadow-[0_10px_60px_rgba(239,68,68,0.55)] ring-4 ring-red-500/20 backdrop-blur-md">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto p-3 rounded-full bg-red-500/10 text-red-500 border border-red-500/30 flex items-center justify-center w-14 h-14 shadow-inner">
              <AlertTriangle className="h-8 w-8 animate-bounce" />
            </div>

            <AlertDialogTitle className="text-center text-xl font-black uppercase tracking-tight text-red-600 dark:text-red-400">
              Confirmación de Alta Seguridad
            </AlertDialogTitle>

            {/* Selector de alcance si la acción es 'vaciar notas' */}
            {activeAction === 'notas' && (
              <div className="space-y-1.5 text-left pt-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Alcance para vaciar notas:
                </label>
                <select
                  value={selectedNotasBodegaId}
                  onChange={(e) => setSelectedNotasBodegaId(Number(e.target.value))}
                  disabled={isPending}
                  className="w-full h-10 rounded-xl border bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={0}>🌐 Todas las Bodegas (Reinicio Global)</option>
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>
                      🏬 Bodega #{b.id} - {b.nombre} {b.ciudad ? `(${b.ciudad})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Letrero en Negritas Destacado */}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center space-y-2">
              <p className="font-black text-red-600 dark:text-red-400 text-sm sm:text-base uppercase tracking-tight leading-snug">
                {activeAction === 'bodega' && selectedBodega
                  ? `⚠️ ESTA ACCIÓN REINICIARÁ A 0 TODO EL STOCK EXCLUSIVAMENTE EN LA BODEGA '${selectedBodega.nombre}' (ID: ${selectedBodega.id}).`
                  : activeAction === 'notas' && selectedNotasBodegaId > 0
                  ? `⚠️ ESTA ACCIÓN OCULTARÁ (ACTIVO = FALSE) TODAS LAS NOTAS DE LA BODEGA '${bodegas.find((b) => b.id === selectedNotasBodegaId)?.nombre}' (ID: ${selectedNotasBodegaId}).`
                  : activeAction === 'notas'
                  ? `⚠️ ESTA ACCIÓN OCULTARÁ (ACTIVO = FALSE) TODAS LAS NOTAS DE INVENTARIO DEL SISTEMA (GLOBAL).`
                  : '⚠️ ESTA ACCIÓN REINICIARÁ A 0 LA PARTE DEL INVENTARIO Y NOTAS PARA VOLVER A INICIAR.'}
              </p>
              <p className="text-[11px] text-muted-foreground font-semibold">
                Acción reservada únicamente para Super Admin Nivel 1.
              </p>
            </div>

            {activeAction === 'notas' && (
              <p className="text-[11px] text-muted-foreground leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-amber-800 dark:text-amber-300 text-left">
                💡 <strong>Nota técnica de BD:</strong> Las notas no se eliminan físicamente (DELETE) para preservar las llaves foráneas con <code>nota_detalles</code>. Se marcan como <code>activo = false</code>, lo cual oculta el historial dejando las vistas de notas completamente vacías.
              </p>
            )}

            <AlertDialogDescription className="text-xs text-center text-muted-foreground pt-1">
              Para confirmar que deseas continuar con el reinicio, escribe la siguiente palabra clave en mayúsculas:
            </AlertDialogDescription>

            <div className="p-2 bg-muted rounded-xl text-center font-mono font-black text-sm text-foreground tracking-widest border">
              {currentKeyword}
            </div>

            <div className="pt-2">
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Escribe '${currentKeyword}' aquí...`}
                className="h-11 rounded-xl text-center font-mono text-sm uppercase tracking-wider font-bold border-red-500/30 focus-visible:ring-red-500"
                disabled={isPending}
                autoFocus
              />
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={handleCloseDialog}
              disabled={isPending}
              className="rounded-xl h-11 text-xs font-bold"
            >
              Cancelar
            </AlertDialogCancel>

            <Button
              type="button"
              onClick={handleExecuteReset}
              disabled={isPending || confirmText.trim().toUpperCase() !== currentKeyword}
              className="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider h-11 rounded-xl shadow-lg gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ejecutando Reinicio...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar y Reiniciar
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
