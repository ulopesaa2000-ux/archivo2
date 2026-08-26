// app/(admin)/inventario/stock/StockMatrixFilters.tsx
'use client'

import { useTransition, useCallback, useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, Loader2, X, Layers, Boxes, TrendingUp, Filter } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { BodegaRow } from '@/lib/types/tables'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ClearFilters } from '@/components/admin/ClearFilters'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Props = {
  bodegas: BodegaRow[]
  defaultAgrupacion?: string
  totalNotasPendientes?: number
}

export function StockMatrixFilters({
  bodegas,
  defaultAgrupacion = 'ninguno',
  totalNotasPendientes = 0,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [localQ, setLocalQ] = useState(searchParams.get('q') ?? '')
  const modo = searchParams.get('modo') === 'pronostico' ? 'pronostico' : 'fisico'
  const isPronostico = modo === 'pronostico'
  const soloAfectados = searchParams.get('solo_afectados') === 'true'

  // Sync localQ when URL searchParams change (e.g. browser back/forward)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate: sync local input state from URL params (external system)
    setLocalQ(searchParams.get('q') ?? '')
  }, [searchParams])

  const setParam = useCallback(
    (key: string, value: string | string[] | null, showForecastToast = false) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page') // Reset page on filter change

      if (value === null) {
        params.delete(key)
      } else if (Array.isArray(value)) {
        params.delete(key)
        value.forEach((v) => params.append(key, v))
      } else {
        params.set(key, value)
      }

      if (showForecastToast || isPronostico || key === 'modo') {
        toast.info('Calculando proyección consolidada de bodegas... Por favor espere.', {
          duration: 2500,
          position: 'top-right',
        })
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [searchParams, pathname, router, isPronostico]
  )

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setParam('q', value || null)
  }, 300)

  const handleQChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQ(e.target.value)
    debouncedSearch(e.target.value)
  }

  const ciudadesUnicas = Array.from(new Set(bodegas.map((b) => b.ciudad || 'sin_asignar'))).sort()
  const currentCiudades = searchParams.getAll('ciudades').filter((c) => c !== 'none')
  const isNoneCiudades = searchParams.get('ciudades') === 'none'
  const isTodasCiudades = !isNoneCiudades && currentCiudades.length === 0

  const currentBodegas = searchParams
    .getAll('bodegas')
    .filter((id) => id !== 'none')
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id))

  const isNone = searchParams.get('bodegas') === 'none'
  const isTodas = !isNone && currentBodegas.length === 0

  const currentAgrupacion = searchParams.get('agrupar_por') || defaultAgrupacion

  const toggleCiudad = (ciudad: string) => {
    const list = new Set(currentCiudades)
    if (list.has(ciudad)) list.delete(ciudad)
    else list.add(ciudad)
    setParam('ciudades', Array.from(list).length > 0 ? Array.from(list) : null, true)
  }

  const toggleBodega = (id: number) => {
    const list = new Set(currentBodegas)
    if (list.has(id)) list.delete(id)
    else list.add(id)
    setParam('bodegas', Array.from(list).length > 0 ? Array.from(list).map(String) : null, true)
  }

  const handleModoChange = (nuevoModo: 'fisico' | 'pronostico') => {
    if (nuevoModo === 'pronostico') {
      toast.info('Activando Modo Stock Pronosticado para todas las bodegas...', {
        duration: 3000,
        position: 'top-right',
      })
    }
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (nuevoModo === 'pronostico') {
      params.set('modo', 'pronostico')
    } else {
      params.delete('modo')
      params.delete('solo_afectados')
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Barra Principal de Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Selector de Modo Rápido (Real vs Pronosticado) */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-1 shadow-2xs shrink-0">
          <Button
            type="button"
            variant={!isPronostico ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleModoChange('fisico')}
            className={`h-8 gap-1.5 text-xs font-semibold ${
              !isPronostico ? 'shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            Stock Real
          </Button>
          <Button
            type="button"
            variant={isPronostico ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleModoChange('pronostico')}
            className={`h-8 gap-1.5 text-xs font-semibold ${
              isPronostico
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Stock Pronosticado
            {totalNotasPendientes > 0 && (
              <Badge
                variant="secondary"
                className={`ml-1 px-1.5 py-0 text-[10px] font-bold ${
                  isPronostico ? 'bg-amber-800/80 text-white' : 'bg-amber-500/20 text-amber-700'
                }`}
              >
                {totalNotasPendientes}
              </Badge>
            )}
          </Button>
        </div>

        {/* Buscar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU, Familia o Nombre..."
            value={localQ}
            onChange={handleQChange}
            className="pl-9 bg-background"
          />
          {isPending && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Agrupar Por */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[140px] justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {currentAgrupacion === 'familia' ? 'Por Familia' : 'Sin agrupar'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[160px]">
            <DropdownMenuRadioGroup
              value={currentAgrupacion}
              onValueChange={(val) => setParam('agrupar_por', val === defaultAgrupacion ? null : val)}
            >
              <DropdownMenuRadioItem value="ninguno">Sin agrupar</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="familia">Por Familia</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bodegas */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] justify-between">
              {isNone ? 'Ninguna Bodega' : isTodas ? 'Bodegas (Todas)' : `Bodegas (${currentBodegas.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between">
                Filtrar por Bodega
                <button
                  title="Desmarcar todas"
                  disabled={isNone}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setParam('bodegas', 'none', true)
                  }}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors ml-4"
                >
                  <X className="h-4 w-4" />
                </button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={isTodas}
                onCheckedChange={() => setParam('bodegas', null, true)}
                className="text-primary font-medium"
              >
                Todas las bodegas
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {bodegas.map((b) => (
                <DropdownMenuCheckboxItem
                  key={b.id}
                  checked={currentBodegas.includes(b.id)}
                  onCheckedChange={() => toggleBodega(b.id)}
                >
                  {b.nombre}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ciudades */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] justify-between">
              {isNoneCiudades
                ? 'Ninguna Ciudad'
                : isTodasCiudades
                ? 'Ciudades (Todas)'
                : `Ciudades (${currentCiudades.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between">
                Filtrar por Ciudad
                <button
                  title="Desmarcar todas"
                  disabled={isNoneCiudades}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setParam('ciudades', 'none', true)
                  }}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors ml-4"
                >
                  <X className="h-4 w-4" />
                </button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={isTodasCiudades}
                onCheckedChange={() => setParam('ciudades', null, true)}
                className="text-primary font-medium"
              >
                Todas las ciudades
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {ciudadesUnicas.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c}
                  checked={currentCiudades.includes(c)}
                  onCheckedChange={() => toggleCiudad(c)}
                  className="capitalize"
                >
                  {c === 'sin_asignar' ? 'Sin Asignar' : c}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Stock Cero */}
        <div className="flex items-center space-x-2 bg-background border px-3 h-10 rounded-md">
          <Checkbox
            id="stockCeroMatriz"
            checked={searchParams.get('con_stock_cero') === 'true'}
            onCheckedChange={(checked) =>
              setParam('con_stock_cero', checked ? 'true' : null)
            }
          />
          <Label
            htmlFor="stockCeroMatriz"
            className="text-sm font-medium text-muted-foreground whitespace-nowrap cursor-pointer"
          >
            Incluir stock en cero
          </Label>
        </div>

        {/* Solo Afectados (Modo Pronóstico) */}
        {isPronostico && (
          <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3 h-10 rounded-md animate-fade-in">
            <Checkbox
              id="soloAfectadosMatriz"
              checked={soloAfectados}
              onCheckedChange={(checked) =>
                setParam('solo_afectados', checked ? 'true' : null, true)
              }
            />
            <Label
              htmlFor="soloAfectadosMatriz"
              className="text-sm font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Solo afectados
            </Label>
          </div>
        )}

        <ClearFilters />
      </div>

      {/* Banner Informativo si está en Modo Pronóstico */}
      {isPronostico && (
        <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Modo Pronóstico Activo:</strong> Visualizando el impacto de las notas en trámite (
              {totalNotasPendientes} {totalNotasPendientes === 1 ? 'nota pendiente' : 'notas pendientes'}). Los saldos en rojo indican faltantes proyectados por bodega o plaza.
            </span>
          </div>
          {isPending && (
            <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300 animate-pulse shrink-0">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculando...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

