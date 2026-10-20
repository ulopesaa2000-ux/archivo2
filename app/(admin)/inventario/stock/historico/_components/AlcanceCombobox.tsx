// app/(admin)/inventario/stock/historico/_components/AlcanceCombobox.tsx
'use client'

import { useMemo, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown, MapPin, Warehouse } from 'lucide-react'
import type { BodegaRow } from '@/lib/types/tables'

type Props = {
  bodegas: BodegaRow[]
  alcance: 'todas' | 'ciudad' | 'bodega'
  ciudad?: string | null
  bodegaId?: number | null
  onCambiar: (params: { alcance: 'todas' | 'ciudad' | 'bodega'; ciudad?: string | null; bodegaId?: number | null }) => void
}

function ciudadDe(b: BodegaRow): string {
  return (b.ciudad || 'VIRTUAL').trim().toUpperCase()
}

export function AlcanceCombobox({ bodegas, alcance, ciudad, bodegaId, onCambiar }: Props) {
  const [open, setOpen] = useState(false)

  const ciudades = useMemo(() => {
    const mapa = new Map<string, BodegaRow[]>()
    for (const b of bodegas) {
      const cd = ciudadDe(b)
      const arr = mapa.get(cd) ?? []
      arr.push(b)
      mapa.set(cd, arr)
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [bodegas])

  const bodegaSeleccionada = bodegas.find((b) => b.id === bodegaId)

  const etiqueta =
    alcance === 'todas'
      ? 'Todas las bodegas'
      : alcance === 'ciudad'
        ? `${ciudad ?? 'Todas las ciudades'}`
        : `${bodegaSeleccionada?.nombre ?? 'Bodega'}`

  const subEtiqueta =
    alcance === 'todas'
      ? `${bodegas.length} bodegas`
      : alcance === 'ciudad'
        ? `${ciudades.find(([c]) => c === ciudad)?.[1].length ?? 0} bodegas`
        : (ciudadDe(bodegaSeleccionada ?? ({ ciudad: null } as BodegaRow)))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-9 min-w-[220px] items-center justify-between gap-2 rounded-lg border bg-background px-3 text-xs font-semibold shadow-sm transition-colors hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              {alcance === 'bodega' ? (
                <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="truncate">{etiqueta}</span>
              <span className="font-normal text-muted-foreground">· {subEtiqueta}</span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar bodega o ciudad..." />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm">Sin resultados</CommandEmpty>

            <CommandGroup heading="General">
              <CommandItem
                value="__todas__"
                onSelect={() => {
                  onCambiar({ alcance: 'todas', ciudad: null, bodegaId: null })
                  setOpen(false)
                }}
                className="text-xs"
              >
                <Check
                  className={`mr-2 h-3.5 w-3.5 ${alcance === 'todas' ? 'opacity-100' : 'opacity-0'}`}
                />
                Todas las bodegas
                <span className="ml-auto text-[10px] text-muted-foreground">{bodegas.length}</span>
              </CommandItem>
            </CommandGroup>

            {ciudades.map(([cd, bs]) => (
              <CommandGroup key={cd} heading={cd}>
                <CommandItem
                  value={`ciudad:${cd}`}
                  onSelect={() => {
                    onCambiar({ alcance: 'ciudad', ciudad: cd, bodegaId: null })
                    setOpen(false)
                  }}
                  className="text-xs font-semibold"
                >
                  <Check
                    className={`mr-2 h-3.5 w-3.5 ${alcance === 'ciudad' && ciudad === cd ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {cd}
                  <span className="ml-auto text-[10px] text-muted-foreground">{bs.length}</span>
                </CommandItem>
                {bs.map((b) => (
                  <CommandItem
                    key={b.id}
                    value={`bodega:${b.id}:${b.nombre}`}
                    onSelect={() => {
                      onCambiar({ alcance: 'bodega', ciudad: null, bodegaId: b.id })
                      setOpen(false)
                    }}
                    className="text-xs pl-6"
                  >
                    <Check
                      className={`mr-2 h-3.5 w-3.5 ${alcance === 'bodega' && bodegaId === b.id ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <span className="truncate">{b.nombre}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
