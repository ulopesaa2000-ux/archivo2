// app/(admin)/ordenes-b2b/orden-rapida/_components/Step1Config.tsx
'use client'

import { AlertTriangle, Check, ChevronsUpDown, HelpCircle, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { PersonaRow } from '@/lib/types/tables'
import { cn } from '@/lib/utils'
import { resolverParserSelector } from '../_hooks/orden-rapida-n8n'
import { PARSER_FORMATS, type ContainerMock } from '../_hooks/orden-rapida-types'

interface Step1ConfigProps {
  proveedores: PersonaRow[]
  clientes: PersonaRow[]
  selectedProveedor: string
  selectedProveedorObj: PersonaRow | undefined
  onProveedorChange: (id: string) => void
  selectedCliente: string
  selectedClienteObj: PersonaRow | undefined
  onClienteChange: (id: string) => void
  selectedContenedor: string
  selectedContenedorObj: ContainerMock | undefined
  selectedContenedorEsSurtido: boolean
  filteredContenedores: ContainerMock[]
  contenedorPopoverOpen: boolean
  onContenedorPopoverOpenChange: (open: boolean) => void
  contenedorSearch: string
  onContenedorSearchChange: (val: string) => void
  onContenedorSelect: (value: string) => void
  newContainerCode: string
  onNewContainerCodeChange: (val: string) => void
  newContainerNumber: string
  onNewContainerNumberChange: (val: string) => void
  selectedParserFormat: string
  onParserFormatChange: (val: string) => void
  onOpenParserGuide: () => void
}

function isSurtidoLike(estado: string | null | undefined) {
  return estado === 'surtido' || estado === 'completo' || estado === 'cerrado'
}

export function Step1Config({
  proveedores,
  clientes,
  selectedProveedor,
  selectedProveedorObj,
  onProveedorChange,
  selectedCliente,
  selectedClienteObj,
  onClienteChange,
  selectedContenedor,
  selectedContenedorObj,
  selectedContenedorEsSurtido,
  filteredContenedores,
  contenedorPopoverOpen,
  onContenedorPopoverOpenChange,
  contenedorSearch,
  onContenedorSearchChange,
  onContenedorSelect,
  newContainerCode,
  onNewContainerCodeChange,
  newContainerNumber,
  onNewContainerNumberChange,
  selectedParserFormat,
  onParserFormatChange,
  onOpenParserGuide,
}: Step1ConfigProps) {
  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">1. Configuracion de socios comerciales y destino</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="proveedor" className="text-sm font-semibold">
            Proveedor origen
          </Label>
          <Select value={selectedProveedor} onValueChange={(value) => onProveedorChange(value || '')}>
            <SelectTrigger id="proveedor" className="h-10">
              <SelectValue placeholder="Selecciona el proveedor extranjero...">
                {selectedProveedorObj?.nombre_completo}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {proveedores.map((proveedor) => (
                <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                  {proveedor.nombre_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Entidad emisora del Packing List.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cliente" className="text-sm font-semibold">
            Cliente B2B destino
          </Label>
          <Select value={selectedCliente} onValueChange={(value) => onClienteChange(value || '')}>
            <SelectTrigger id="cliente" className="h-10">
              <SelectValue placeholder="Selecciona el comprador...">
                {selectedClienteObj?.nombre_completo}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={String(cliente.id)}>
                  {cliente.nombre_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Cliente final para la orden B2B.</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="block text-sm font-semibold">Asignacion de contenedor de importacion</Label>

        <div className="grid grid-cols-1 items-end gap-6 rounded-lg border bg-muted/20 p-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="contenedor-sel" className="text-xs">
              Destino de carga
            </Label>
            <Popover open={contenedorPopoverOpen} onOpenChange={onContenedorPopoverOpenChange}>
              <PopoverTrigger
                render={
                  <Button
                    id="contenedor-sel"
                    variant="outline"
                    role="combobox"
                    aria-expanded={contenedorPopoverOpen}
                    className={cn(
                      'h-9 w-full justify-between truncate text-left font-normal',
                      selectedContenedorEsSurtido &&
                        'border-yellow-400 bg-yellow-100/70 text-yellow-950 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-100'
                    )}
                  />
                }
              >
                <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
                  <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  {selectedContenedor === 'new' ? (
                    <span className="truncate">+ Crear nuevo contenedor</span>
                  ) : selectedContenedorObj ? (
                    <span className="truncate font-mono text-xs">
                      {selectedContenedorObj.codigo_contenedor} ({selectedContenedorObj.numero_contenedor ?? 'S/N'}) -{' '}
                      {selectedContenedorObj.estado}
                      {selectedContenedorEsSurtido ? ' (ya surtido)' : ''}
                    </span>
                  ) : (
                    <span className="truncate text-muted-foreground">Buscar contenedor...</span>
                  )}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[380px] max-w-[90vw] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar por 2026-XX o código..."
                    value={contenedorSearch}
                    onValueChange={onContenedorSearchChange}
                  />
                  <CommandList>
                    <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                      Sin resultados para &quot;{contenedorSearch}&quot;.
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="new" onSelect={() => onContenedorSelect('new')} className="font-semibold">
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0 text-primary',
                            selectedContenedor === 'new' ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        + Crear nuevo contenedor
                      </CommandItem>
                      {filteredContenedores.map((contenedor) => {
                        const esSurtido = isSurtidoLike(contenedor.estado)
                        const isSelected = String(contenedor.id) === selectedContenedor
                        return (
                          <CommandItem
                            key={contenedor.id}
                            value={`${contenedor.codigo_contenedor} ${contenedor.numero_contenedor ?? ''}`}
                            onSelect={() => onContenedorSelect(String(contenedor.id))}
                            className={cn(
                              esSurtido &&
                                'border-l-4 border-yellow-400 bg-yellow-100/70 text-yellow-950 data-[selected=true]:bg-yellow-200/80 dark:bg-yellow-900/30 dark:text-yellow-100'
                            )}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 shrink-0',
                                isSelected ? 'opacity-100' : 'opacity-0',
                                esSurtido ? 'text-yellow-700 dark:text-yellow-300' : 'text-primary'
                              )}
                            />
                            {esSurtido && (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-300" />
                            )}
                            <span className="truncate font-mono text-xs">
                              {contenedor.codigo_contenedor} ({contenedor.numero_contenedor ?? 'S/N'}) -{' '}
                              {contenedor.estado}
                              {esSurtido ? ' · ya surtido' : ''}
                            </span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedContenedorEsSurtido && selectedContenedorObj && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-[11px] text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-300" />
                <span>
                  El contenedor <strong className="font-mono">{selectedContenedorObj.codigo_contenedor}</strong> ya está
                  surtido ({selectedContenedorObj.estado}). Se muestra en amarillo para ubicar los recientes; puedes
                  usarlo igual o elegir otro.
                </span>
              </div>
            )}
          </div>

          {selectedContenedor === 'new' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="nuevo-cont-cod" className="text-xs">
                  Codigo de identificacion del contenedor
                </Label>
                <Input
                  id="nuevo-cont-cod"
                  placeholder="Ej. CONT-K24-MX01"
                  value={newContainerCode}
                  onChange={(event) => onNewContainerCodeChange(event.target.value)}
                  className="h-9 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nuevo-cont-num" className="text-xs">
                  No. de contenedor (opcional)
                </Label>
                <Input
                  id="nuevo-cont-num"
                  placeholder="Ej. HAMU1553617 (opcional)"
                  value={newContainerNumber}
                  onChange={(event) => onNewContainerNumberChange(event.target.value.toUpperCase())}
                  className="h-9 font-mono uppercase"
                />
                <p className="text-[10px] text-muted-foreground">
                  Físico. Se guarda tal cual; si va vacío queda como S/N.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 rounded border bg-muted/40 p-3 text-xs text-muted-foreground md:col-span-2">
              <p className="font-mono font-bold text-foreground">
                {selectedContenedorObj?.codigo_contenedor ?? 'Sin asignar'} (
                {selectedContenedorObj?.numero_contenedor ?? 'S/N'}) - {selectedContenedorObj?.estado ?? ''}
              </p>
              <p>La revision quedara asociada a este contenedor al guardar.</p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Selección de Formato / Plantilla */}
      <div className="space-y-3 rounded-xl border border-primary/20 bg-muted/20 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <Label htmlFor="parser-format-sel" className="text-sm font-semibold flex items-center gap-2">
              <span>Plantilla / Formato de Packing List (Parser n8n)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Define la estructura del Excel para que n8n ejecute la rama especializada adecuada.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenParserGuide}
            className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 self-start sm:self-auto"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Guía visual de formatos
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <div className="md:col-span-2">
            <Select value={selectedParserFormat} onValueChange={(val) => onParserFormatChange(val || 'auto')}>
              <SelectTrigger id="parser-format-sel" className="h-10">
                <SelectValue placeholder="Selecciona el formato...">
                  {PARSER_FORMATS.find((f) => f.id === selectedParserFormat)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {PARSER_FORMATS.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="py-2">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="font-semibold text-xs">{f.label}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{f.shortDesc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-1">
            {selectedParserFormat === 'auto' ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                <span className="block font-semibold text-primary text-[11px]">Detección Automática</span>
                <span className="text-[10px] text-muted-foreground">
                  {selectedProveedorObj?.nombre_completo
                    ? `Para "${selectedProveedorObj.nombre_completo}": Formato ${resolverParserSelector(selectedProveedorObj.nombre_completo).toUpperCase()}`
                    : 'Basada en el socio seleccionado'}
                </span>
              </div>
            ) : (
              <div className="rounded-md border border-emerald-300 bg-emerald-50/60 p-2 text-xs dark:bg-emerald-950/30">
                <span className="block font-semibold text-emerald-800 dark:text-emerald-300 text-[11px]">
                  Formato Forzado
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Se procesará explícitamente con la rama seleccionada
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
