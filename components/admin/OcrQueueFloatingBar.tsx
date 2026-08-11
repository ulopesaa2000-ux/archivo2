// components/admin/OcrQueueFloatingBar.tsx
'use client'

import { useState } from 'react'
import { useOcrBatchQueue } from '@/hooks/useOcrBatchQueue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles, Loader2, CheckCircle2, AlertCircle, ChevronUp, ChevronDown, Trash2, RefreshCw, X
} from 'lucide-react'
import Image from 'next/image'

export function OcrQueueFloatingBar() {
  const { items, stats, isProcessing, clearCompleted, removeItem, retryItem } = useOcrBatchQueue()
  const [isExpanded, setIsExpanded] = useState(false)

  if (items.length === 0) return null

  const percentage = Math.round(((stats.done + stats.error) / stats.total) * 100) || 0

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm sm:max-w-md px-4 sm:px-0 pointer-events-auto">
      <div className="bg-card/95 backdrop-blur-md border border-amber-500/30 dark:border-amber-500/20 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
        
        {/* Header / Summary Bar */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md shrink-0">
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-tight text-foreground">
                  Cola OCR IA
                </span>
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                  {stats.done}/{stats.total} Procesadas
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {isProcessing
                  ? `Subiendo y analizando ${stats.uploading + stats.pending} ${stats.uploading + stats.pending === 1 ? 'nota' : 'notas'}...`
                  : stats.error > 0
                  ? `${stats.error} ${stats.error === 1 ? 'nota falló' : 'notas fallaron'}`
                  : 'Procesamiento masivo finalizado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Progress Line */}
        <div className="px-3 pb-1.5">
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Expanded Details List */}
        {isExpanded && (
          <div className="p-3 border-t max-h-72 overflow-y-auto space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1 border-b text-[11px] text-muted-foreground font-semibold">
              <span>{stats.total} notas en total</span>
              {stats.done > 0 && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
                >
                  Limpiar completadas
                </button>
              )}
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border gap-3"
              >
                <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 border bg-background">
                  <Image
                    src={item.previewUrl}
                    alt="Vista previa nota"
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate">
                      {item.file.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {(item.file.size / 1024).toFixed(0)} KB
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item.status === 'uploading' && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Procesando IA...
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="text-[10px] text-muted-foreground">En espera...</span>
                    )}
                    {item.status === 'done' && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Escaneada exitosamente
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-[10px] text-destructive font-bold flex items-center gap-1 truncate" title={item.errorMsg}>
                        <AlertCircle className="h-3 w-3 shrink-0" /> {item.errorMsg || 'Error'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.status === 'error' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-amber-600 hover:text-amber-700"
                      onClick={() => retryItem(item.id)}
                      title="Reintentar"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                    title="Quitar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
