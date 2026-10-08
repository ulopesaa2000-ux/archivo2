// components/store/editor/ContactosListEditor.tsx
'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { normalizePhoneRaw, type StoreContacto } from '@/lib/utils/storeConfig'

interface ContactosListEditorProps {
  value: StoreContacto[]
  onChange: (next: StoreContacto[]) => void
}

function newContacto(orden: number): StoreContacto {
  return {
    id: `c-${Date.now()}-${orden}`,
    nombre: '',
    zona: '',
    telefono_display: '',
    phone_raw: '',
    activo: true,
    orden,
  }
}

export function ContactosListEditor({ value, onChange }: ContactosListEditorProps) {
  const updateAt = (index: number, patch: Partial<StoreContacto>) => {
    const next = value.map((c, i) => {
      if (i !== index) return c
      const merged = { ...c, ...patch }
      if (patch.phone_raw !== undefined) {
        merged.phone_raw = normalizePhoneRaw(patch.phone_raw).slice(0, 20)
      }
      return merged
    })
    onChange(next)
  }

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= value.length) return
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next.map((c, i) => ({ ...c, orden: i })))
  }

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index).map((c, i) => ({ ...c, orden: i })))
  }

  const addContacto = () => {
    if (value.length >= 20) return
    onChange([...value, newContacto(value.length)])
  }

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
          Contactos guardados ({value.length}/20)
        </Label>
        <Button type="button" size="sm" variant="outline" onClick={addContacto} className="text-xs h-8">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Agregar
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Se publican sin rebuild en /inicio, pie de página y /contactos al guardar. Desactívalos sin borrarlos con el interruptor.
      </p>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground border border-dashed border-border rounded-xl p-3 text-center">
          Sin contactos. Agrega el primero con el botón superior.
        </p>
      )}

      <div className="space-y-3">
        {value.map((contacto, index) => (
          <div key={contacto.id} className="rounded-xl border border-border bg-card dark:bg-zinc-900 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                #{index + 1}
              </span>
              <div className="flex items-center gap-1.5">
                <Label htmlFor={`activo-${contacto.id}`} className="text-[11px] text-muted-foreground">
                  {contacto.activo ? 'Visible' : 'Oculto'}
                </Label>
                <Switch
                  id={`activo-${contacto.id}`}
                  checked={contacto.activo}
                  onCheckedChange={(checked) => updateAt(index, { activo: checked })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  title="Subir orden"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                  title="Bajar orden"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-600 hover:text-red-700"
                  onClick={() => removeAt(index)}
                  title="Eliminar contacto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium">Nombre *</Label>
                <Input
                  value={contacto.nombre}
                  onChange={(e) => updateAt(index, { nombre: e.target.value.slice(0, 80) })}
                  placeholder="Daniel"
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium">Teléfono visible</Label>
                <Input
                  value={contacto.telefono_display}
                  onChange={(e) => updateAt(index, { telefono_display: e.target.value.slice(0, 30) })}
                  placeholder="248 125 0472"
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium">Zona *</Label>
              <Input
                value={contacto.zona}
                onChange={(e) => updateAt(index, { zona: e.target.value.slice(0, 120) })}
                placeholder="Zona Centro CDMX"
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-[11px] font-medium">WhatsApp (solo dígitos) *</Label>
              <Input
                value={contacto.phone_raw}
                onChange={(e) => updateAt(index, { phone_raw: e.target.value })}
                placeholder="522481250472"
                inputMode="numeric"
                className="mt-1 h-8 text-xs font-mono"
              />
              {contacto.phone_raw && (
                <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                  wa.me/{normalizePhoneRaw(contacto.phone_raw)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
