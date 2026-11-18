// app/(admin)/catalogo/familias/_components/BarraBorrador.tsx
'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'

interface BarraBorradorProps {
  hasPendingChanges: boolean
  movesCount: number
  renamesCount: number
  onDiscardChanges: () => void
  onOlvidarBorrador: () => void
  onOpenConfirmModal: () => void
}

export function BarraBorrador({
  hasPendingChanges,
  movesCount,
  renamesCount,
  onDiscardChanges,
  onOlvidarBorrador,
  onOpenConfirmModal,
}: BarraBorradorProps) {
  return (
    <AnimatePresence>
      {hasPendingChanges && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center justify-between p-3 border-b border-amber-500/20 bg-amber-500/10 backdrop-blur shadow-sm shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Cambios pendientes en borrador:
              <span className="ml-2 font-mono text-xs px-2 py-0.5 bg-amber-500/20 rounded-md text-amber-700 dark:text-amber-400">
                {movesCount} movimientos, {renamesCount} renombrados
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={onDiscardChanges}
              className="h-8 border-amber-500/30 text-amber-800 hover:bg-amber-500/10 dark:text-amber-300"
            >
              Restablecer a Original
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={onOlvidarBorrador}
              title="Borra el borrador guardado en este navegador"
              className="h-8 border-amber-500/30 text-amber-800 hover:bg-amber-500/10 dark:text-amber-300"
            >
              Olvidar guardado
            </Button>
            <Button
              size="xs"
              onClick={onOpenConfirmModal}
              className="h-8 bg-amber-600 hover:bg-amber-500 text-white"
            >
              Guardar Cambios
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
