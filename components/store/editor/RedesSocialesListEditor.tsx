// components/store/editor/RedesSocialesListEditor.tsx
'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SocialBrandIcon } from '@/components/store/SocialBrandIcon'
import type { StoreRedSocial } from '@/lib/utils/storeConfig'

const PLATAFORMAS_PREDEFINIDAS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'otro', label: 'Otra (logo por nombre)' },
]

interface RedesSocialesListEditorProps {
  value: StoreRedSocial[]
  onChange: (next: StoreRedSocial[]) => void
}

export function RedesSocialesListEditor({ value, onChange }: RedesSocialesListEditorProps) {
  const sorted = [...value].sort((a, b) => a.orden - b.orden)

  const updateItem = (id: string, patch: Partial<StoreRedSocial>) => {
    onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    const filtered = sorted.filter((i) => i.id !== id).map((i, idx) => ({ ...i, orden: idx + 1 }))
    onChange(filtered)
  }

  const moveItem = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= sorted.length) return
    const copy = [...sorted]
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
    onChange(copy.map((i, idx) => ({ ...i, orden: idx + 1 })))
  }

  const addItem = () => {
    const nextOrden = sorted.length + 1
    onChange([
      ...sorted,
      {
        id: `red-${Date.now()}`,
        plataforma: 'facebook',
        texto: 'Facebook @idol_navy',
        url: 'https://www.facebook.com/',
        activo: true,
        orden: nextOrden,
      },
    ])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
          Redes y Canales ({sorted.filter((i) => i.activo).length} activos)
        </Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 text-xs gap-1">
          <Plus className="h-3.5 w-3.5" />
          Agregar Red
        </Button>
      </div>

      <div className="space-y-2.5">
        {sorted.map((item, idx) => {
          const isPredefined = PLATAFORMAS_PREDEFINIDAS.some(
            (p) => p.value !== 'otro' && p.value === item.plataforma.toLowerCase()
          )
          const selectVal = isPredefined ? item.plataforma.toLowerCase() : 'otro'

          return (
            <div
              key={item.id}
              className="p-3 rounded-lg border border-border bg-background dark:bg-zinc-950 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-md border border-border bg-muted/40 flex items-center justify-center shrink-0">
                    <SocialBrandIcon plataforma={item.plataforma} className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold truncate">
                    {item.texto || item.plataforma || 'Nueva red'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={item.activo}
                    onCheckedChange={(checked) => updateItem(item.id, { activo: checked })}
                    aria-label="Activar o desactivar red social"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, -1)}
                    title="Subir"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={idx === sorted.length - 1}
                    onClick={() => moveItem(idx, 1)}
                    title="Bajar"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Red social / Logo</Label>
                  <Select
                    value={selectVal}
                    onValueChange={(val) => {
                      if (!val) return
                      updateItem(item.id, { plataforma: val === 'otro' ? 'pinterest' : val })
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATAFORMAS_PREDEFINIDAS.map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectVal === 'otro' ? (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Nombre para logo (ej. pinterest, threads)</Label>
                    <Input
                      value={item.plataforma}
                      onChange={(e) => updateItem(item.id, { plataforma: e.target.value })}
                      placeholder="pinterest"
                      className="h-8 text-xs"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Texto visible</Label>
                    <Input
                      value={item.texto}
                      onChange={(e) => updateItem(item.id, { texto: e.target.value })}
                      placeholder="Facebook @idol_navy"
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </div>

              {selectVal === 'otro' && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Texto visible</Label>
                  <Input
                    value={item.texto}
                    onChange={(e) => updateItem(item.id, { texto: e.target.value })}
                    placeholder="Pinterest @idol_navy"
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Link / URL</Label>
                <Input
                  value={item.url}
                  onChange={(e) => updateItem(item.id, { url: e.target.value })}
                  placeholder="https://..."
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
