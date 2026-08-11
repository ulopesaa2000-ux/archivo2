// app/(admin)/configuracion/inventario/ResetInventarioClient.tsx
'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  resetCompletoInventarioAction,
} from '@/modules/config/inventory-reset-actions'

type ActionType = 'notas' | 'stock' | 'completo' | null

export function ResetInventarioClient() {
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [confirmText, setConfirmText] = useState('')
  const [isPending, startTransition] = useTransition()

  const REQUIRED_KEYWORD = 'REINICIAR INVENTARIO'

  const handleOpenDialog = (action: ActionType) => {
    setActiveAction(action)
    setConfirmText('')
  }

  const handleCloseDialog = () => {
    if (isPending) return
    setActiveAction(null)
    setConfirmText('')
  }

  const handleExecuteReset = () => {
    if (confirmText.trim().toUpperCase() !== REQUIRED_KEYWORD) {
      toast.error(`Escribe exactamente '${REQUIRED_KEYWORD}' para confirmar.`)
      return
    }

    startTransition(async () => {
      let res
      if (activeAction === 'notas') {
        res = await resetNotasAction()
      } else if (activeAction === 'stock') {
        res = await resetStockCeroAction()
      } else if (activeAction === 'completo') {
        res = await resetCompletoInventarioAction()
      }

      if (res?.success) {
        toast.success(res.message || 'Operación ejecutada exitosamente.')
        handleCloseDialog()
      } else {
        toast.error(res?.error || 'Error al ejecutar la acción de reinicio.')
      }
    })
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
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

      {/* Grid de Opciones de Reinicio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Opción 1: Vaciar Notas */}
        <Card className="border shadow-md hover:shadow-lg transition-all flex flex-col justify-between group">
          <CardHeader className="pb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit mb-2">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">1. Vaciar Historial de Notas</CardTitle>
            <CardDescription className="text-xs">
              Oculta las notas de inventario existentes (`activo = false`). El listado de notas parecerá vacío sin borrar físicamente los registros.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenDialog('notas')}
              className="w-full font-bold text-xs uppercase tracking-wider h-10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 rounded-xl"
            >
              Vaciar Notas
            </Button>
          </CardContent>
        </Card>

        {/* Opción 2: Poner Stock a 0 */}
        <Card className="border shadow-md hover:shadow-lg transition-all flex flex-col justify-between group">
          <CardHeader className="pb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit mb-2">
              <Warehouse className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">2. Poner Stock a 0</CardTitle>
            <CardDescription className="text-xs">
              Establece las existencias en `0 cajas` y `0 piezas` para todos los productos en todas las bodegas registradas.
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

        {/* Opción 3: Reinicio Total */}
        <Card className="border-red-500/40 bg-gradient-to-br from-card via-card to-red-500/5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
          <CardHeader className="pb-3">
            <div className="p-2.5 rounded-xl bg-red-500 text-white shadow-md w-fit mb-2">
              <RotateCcw className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-black text-red-600 dark:text-red-400">3. Reinicio Total de Inventario</CardTitle>
            <CardDescription className="text-xs">
              Ejecuta ambas acciones en un solo paso: oculta todo el historial de notas y reinicia todas las existencias de stock a 0.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              type="button"
              onClick={() => handleOpenDialog('completo')}
              className="w-full font-black text-xs uppercase tracking-wider h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reinicio Total
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ventana Modal Emergente de Advertencia (Adaptada Modo Claro / Oscuro con Sombras Rojas) */}
      <AlertDialog open={activeAction !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <AlertDialogContent className="sm:max-w-lg max-w-full w-full rounded-2xl border-2 border-red-500/50 bg-card p-6 shadow-[0_10px_50px_rgba(239,68,68,0.3)] dark:shadow-[0_10px_60px_rgba(239,68,68,0.55)] ring-4 ring-red-500/20 backdrop-blur-md">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto p-3 rounded-full bg-red-500/10 text-red-500 border border-red-500/30 flex items-center justify-center w-14 h-14 shadow-inner">
              <AlertTriangle className="h-8 w-8 animate-bounce" />
            </div>

            <AlertDialogTitle className="text-center text-xl font-black uppercase tracking-tight text-red-600 dark:text-red-400">
              Confirmación de Alta Seguridad
            </AlertDialogTitle>

            {/* Letrero en Negritas Destacado */}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center space-y-2">
              <p className="font-black text-red-600 dark:text-red-400 text-sm sm:text-base uppercase tracking-tight leading-snug">
                ⚠️ ESTA ACCIÓN REINICIARÁ A 0 LA PARTE DEL INVENTARIO Y NOTAS PARA VOLVER A INICIAR.
              </p>
              <p className="text-[11px] text-muted-foreground font-semibold">
                Acción reservada únicamente para Super Admin Nivel 1.
              </p>
            </div>

            <AlertDialogDescription className="text-xs text-center text-muted-foreground pt-1">
              Para confirmar que deseas continuar con el reinicio, escribe la siguiente palabra clave en mayúsculas:
            </AlertDialogDescription>

            <div className="p-2 bg-muted rounded-xl text-center font-mono font-black text-sm text-foreground tracking-widest border">
              {REQUIRED_KEYWORD}
            </div>

            <div className="pt-2">
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Escribe '${REQUIRED_KEYWORD}' aquí...`}
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
              disabled={isPending || confirmText.trim().toUpperCase() !== REQUIRED_KEYWORD}
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
