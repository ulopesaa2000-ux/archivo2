// app/(admin)/ordenes-b2b/orden-rapida/_components/ColoresModal.tsx
'use client'

import type { Dispatch, SetStateAction } from 'react'
import { X } from 'lucide-react'
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
import { buildColorDraft, claveColor } from '@/lib/color-match'
import type { CatalogoColorOrdenRapida } from '@/modules/ordenes-b2b/actions'
import type { ColorDraft, ColorPorConfirmar } from '../_hooks/orden-rapida-types'
import { CamposDraftColor, MapearColorCombobox } from './WizardAtoms'

interface ColoresModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filtroPendientes: string
  onFiltroPendientesChange: (val: string) => void
  coloresNuevos: ColorPorConfirmar[]
  pendientesFiltrados: ColorPorConfirmar[]
  coloresOmitidos: ColorPorConfirmar[]
  coloresAmbar: ColorPorConfirmar[]
  coloresAmbarDobles: ColorPorConfirmar[]
  catalogoColores: CatalogoColorOrdenRapida[]
  colorDrafts: Record<string, ColorDraft>
  onSetColorDrafts: Dispatch<SetStateAction<Record<string, ColorDraft>>>
  hexSugiriendo: Set<string>
  ambarEditando: Set<string>
  onMapearColor: (raw: string, colorId: number | null) => void
  onCrearColorFila: (raw: string) => Promise<boolean>
  onCrearTodosColores: () => void
  onOmitirColor: (raw: string) => void
  onReabrirColor: (raw: string) => void
  onSugerirHex: (raw: string) => void
  onAbrirEditorAmbar: (raw: string) => void
  onCerrarEditorAmbar: (raw: string) => void
}

export function ColoresModal({
  open,
  onOpenChange,
  filtroPendientes,
  onFiltroPendientesChange,
  coloresNuevos,
  pendientesFiltrados,
  coloresOmitidos,
  coloresAmbar,
  coloresAmbarDobles,
  catalogoColores,
  colorDrafts,
  onSetColorDrafts,
  hexSugiriendo,
  ambarEditando,
  onMapearColor,
  onCrearColorFila,
  onCrearTodosColores,
  onOmitirColor,
  onReabrirColor,
  onSugerirHex,
  onAbrirEditorAmbar,
  onCerrarEditorAmbar,
}: ColoresModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onFiltroPendientesChange('')
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="w-full sm:max-w-[85vw] max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            🎨 Se detectaron {coloresNuevos.length} color{coloresNuevos.length !== 1 ? 'es' : ''} nuevo
            {coloresNuevos.length !== 1 ? 's' : ''} — se crearán en el catálogo
          </DialogTitle>
          <DialogDescription>
            Revisa nombre ES, interno EN, código, hex y tipo. Puedes mapear a un color existente en vez de crear, u
            omitir (bloqueará el guardado).
          </DialogDescription>
        </DialogHeader>

        {coloresNuevos.length > 5 && (
          <Input
            placeholder="Filtrar pendientes…"
            value={filtroPendientes}
            onChange={(e) => onFiltroPendientesChange(e.target.value)}
            className="h-8 max-w-xs text-xs"
          />
        )}
        {coloresNuevos.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin colores pendientes: todo está mapeado o creado.</p>
        )}
        {pendientesFiltrados.length === 0 && coloresNuevos.length > 0 && (
          <p className="text-xs text-muted-foreground">Sin coincidencias para &quot;{filtroPendientes}&quot;.</p>
        )}

        <div className="space-y-3">
          {pendientesFiltrados.map((c) => {
            const key = claveColor(c.raw)
            const d = colorDrafts[key] ?? { ...buildColorDraft(c.raw, c.en ?? null, c.es ?? null), mapear_a_id: null }
            const setD = (patch: Partial<ColorDraft>) =>
              onSetColorDrafts((prev) => ({
                ...prev,
                [key]: { ...(prev[key] ?? d), ...patch },
              }))
            return (
              <div key={key} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono font-bold">
                    {c.raw}
                  </Badge>
                  {(c.en || c.es) && (
                    <span className="text-[11px] text-muted-foreground">IA: {[c.en, c.es].filter(Boolean).join(' → ')}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {(c.cajas || []).length} caja(s)
                    {(c.cajas || []).length > 0 ? `: ${(c.cajas || []).slice(0, 3).join(', ')}` : ''}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <MapearColorCombobox catalogo={catalogoColores} onSelect={(id) => onMapearColor(c.raw, id)} />
                    <Button type="button" size="sm" className="h-7 text-[11px] font-bold" onClick={() => void onCrearColorFila(c.raw)}>
                      Crear
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => onOmitirColor(c.raw)}>
                      Omitir
                    </Button>
                  </span>
                </div>
                <CamposDraftColor d={d} setD={setD} sugiriendo={hexSugiriendo.has(key)} onSugerirHex={() => onSugerirHex(c.raw)} />
              </div>
            )
          })}
        </div>

        {coloresOmitidos.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 space-y-1.5">
            <p className="text-[11px] font-bold text-destructive">Omitidos (bloquearán el guardado):</p>
            {coloresOmitidos.map((c) => (
              <div key={c.raw} className="flex items-center gap-2 text-[11px]">
                <Badge variant="outline" className="font-mono">
                  {c.raw}
                </Badge>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] ml-auto" onClick={() => onReabrirColor(c.raw)}>
                  Reabrir
                </Button>
              </div>
            ))}
          </div>
        )}

        {coloresAmbar.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50/60 p-2.5 space-y-1.5 dark:bg-amber-950/30">
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200">
              Revisión ámbar (auto, no bloquea el guardado): {coloresAmbar.length}
            </p>
            {coloresAmbar.slice(0, 10).map((c) => {
              const cat = catalogoColores.find((cc) => cc.id === c.color_id)
              const keyA = claveColor(c.raw)
              const editandoA = ambarEditando.has(keyA)
              const dA = colorDrafts[keyA] ?? { ...buildColorDraft(c.raw, c.en ?? null, c.es ?? null), mapear_a_id: null }
              const setDA = (patch: Partial<ColorDraft>) =>
                onSetColorDrafts((prev) => ({
                  ...prev,
                  [keyA]: { ...(prev[keyA] ?? dA), ...patch },
                }))
              return (
                <div key={c.raw} className="flex flex-wrap items-center gap-2 text-[11px]">
                  <Badge variant="outline" className="font-mono">
                    {c.raw}
                  </Badge>
                  <span className="text-muted-foreground">→ {cat?.nombre ?? c.color_id} (parcial auto)</span>
                  {!editandoA && (
                    <span className="ml-auto flex items-center gap-1.5">
                      <MapearColorCombobox catalogo={catalogoColores} onSelect={(id) => onMapearColor(c.raw, id)} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        title="Editar y crear como color nuevo aquí mismo"
                        onClick={() => onAbrirEditorAmbar(c.raw)}
                      >
                        Crear nuevo
                      </Button>
                    </span>
                  )}
                  {editandoA && (
                    <div className="w-full rounded-md border p-2 space-y-2 bg-background/60">
                      <CamposDraftColor
                        d={dA}
                        setD={setDA}
                        sugiriendo={hexSugiriendo.has(keyA)}
                        onSugerirHex={() => onSugerirHex(c.raw)}
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px]"
                          title="Cerrar sin cambios (no pasa nada)"
                          onClick={() => onCerrarEditorAmbar(c.raw)}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Cerrar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-[11px] font-bold"
                          onClick={async () => {
                            const ok = await onCrearColorFila(c.raw)
                            if (ok) onCerrarEditorAmbar(c.raw)
                          }}
                        >
                          Crear
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <p className="text-[10px] text-muted-foreground">
              Si no cambias nada, se guarda con el automático. Puedes mapear a otro existente si prefieres.
            </p>
            {coloresAmbarDobles.length > 0 && (
              <div className="rounded-md border border-sky-300 bg-sky-50/60 p-2 space-y-1.5 dark:bg-sky-950/30">
                <p className="text-[11px] font-bold text-sky-800 dark:text-sky-200">
                  Dobles por decidir (auto sólido, no bloquea): {coloresAmbarDobles.length}
                </p>
                {coloresAmbarDobles.map((c) => {
                  const catD = catalogoColores.find((cc) => cc.id === c.color_id)
                  const keyD = claveColor(c.raw)
                  const editandoD = ambarEditando.has(keyD)
                  const dD = colorDrafts[keyD] ?? {
                    ...buildColorDraft(c.raw, c.en ?? null, c.es ?? null),
                    mapear_a_id: null,
                  }
                  const setDD = (patch: Partial<ColorDraft>) =>
                    onSetColorDrafts((prev) => ({
                      ...prev,
                      [keyD]: { ...(prev[keyD] ?? dD), ...patch },
                    }))
                  return (
                    <div key={c.raw} className="flex flex-wrap items-center gap-2 text-[11px]">
                      <Badge variant="outline" className="font-mono">
                        {c.raw}
                      </Badge>
                      <span className="text-muted-foreground">→ {catD?.nombre ?? c.color_id} (sólido auto)</span>
                      {!editandoD && (
                        <span className="ml-auto flex items-center gap-1.5">
                          <MapearColorCombobox catalogo={catalogoColores} onSelect={(id) => onMapearColor(c.raw, id)} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px]"
                            title="Editar y crear este doble (tipo DOBLE, HEX del primer color)"
                            onClick={() => onAbrirEditorAmbar(c.raw)}
                          >
                            Crear como DOBLE
                          </Button>
                        </span>
                      )}
                      {editandoD && (
                        <div className="w-full rounded-md border p-2 space-y-2 bg-background/60">
                          <CamposDraftColor
                            d={dD}
                            setD={setDD}
                            sugiriendo={hexSugiriendo.has(keyD)}
                            onSugerirHex={() => onSugerirHex(c.raw)}
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px]"
                              title="Cerrar sin cambios (no pasa nada)"
                              onClick={() => onCerrarEditorAmbar(c.raw)}
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Cerrar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-[11px] font-bold"
                              onClick={async () => {
                                const ok = await onCrearColorFila(c.raw)
                                if (ok) onCerrarEditorAmbar(c.raw)
                              }}
                            >
                              Crear
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                <p className="text-[10px] text-muted-foreground">
                  Si no cambias nada, se guarda como sólido. Crear como DOBLE lo registra tipo DOBLE con el HEX del
                  primer color.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Resolver después
          </Button>
          <Button type="button" onClick={onCrearTodosColores} disabled={coloresNuevos.length === 0} className="font-bold">
            Crear {coloresNuevos.length} color{coloresNuevos.length !== 1 ? 'es' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
