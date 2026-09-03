// app/(admin)/ordenes-b2b/cajas/CajasFilters.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Plus, Upload } from 'lucide-react'
import type { CatalogosB2B } from '@/modules/ordenes-b2b/types'
import { CrearCajaDialog } from '@/components/admin/cajas/CrearCajaDialog'
import { ImportCajasModal } from './components/ImportCajasModal'
import { SearchInput } from '@/components/admin/SearchInput'

export function CajasFilters({
  catalogos,
  catalogoCajas,
  puedeCrear = false,
}: {
  catalogos: CatalogosB2B
  catalogoCajas?: {
    tallas: { id: number; codigo: string; nombre: string; categoria: string; talla_us?: string | null }[]
    colores: { id: number; nombre: string; codigo?: string | null; hex_code: string | null }[]
  }
  puedeCrear?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [crearOpen, setCrearOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const tallasDisponibles = (catalogoCajas?.tallas ?? []).map(t => ({
    id: t.id, nombre: t.nombre, codigo: t.codigo,
  }))
  const coloresDisponibles = (catalogoCajas?.colores ?? []).map(c => ({
    id: c.id, nombre: c.nombre,
  }))
  
  const updateParam = useCallback((k: string, v: string | null) => {
    startTransition(() => {
      const p = new URLSearchParams(searchParams.toString())
      if (!v || v === '_all') {
        p.delete(k)
      } else {
        p.set(k, v)
      }
      p.delete('page')
      router.push(`${pathname}?${p.toString()}`, { scroll: false })
    })
  }, [searchParams, pathname, router])

  const updateSort = useCallback((val: string | null) => {
    if (!val) return
    const [by, ord] = val.split(':')
    startTransition(() => {
      const p = new URLSearchParams(searchParams.toString())
      p.set('sort_by', by)
      p.set('order', ord)
      p.delete('page')
      router.push(`${pathname}?${p.toString()}`, { scroll: false })
    })
  }, [searchParams, pathname, router])

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
  }, [pathname, router])

  const hasFilters = searchParams.has('q') || searchParams.has('proveedor_id') || searchParams.has('año') || searchParams.has('anio')
  const currentSort = `${searchParams.get('sort_by') ?? 'codigo_caja'}:${searchParams.get('order') ?? 'desc'}`

  return (
    <div className={`flex flex-wrap items-center gap-3 ${isPending ? 'opacity-70' : ''}`}>
      <SearchInput
        id="cajas-search"
        placeholder="Buscar código de caja..."
        currentValue={searchParams.get('q')}
        onSearch={(term) => updateParam('q', term)}
        delay={300}
        minLength={2}
        controlled
      />

      <Select
        value={searchParams.get('proveedor_id') ?? '_all'}
        onValueChange={(v) => updateParam('proveedor_id', v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <span className="truncate">
            {searchParams.get('proveedor_id') === '_all' || !searchParams.get('proveedor_id')
              ? 'Todos los proveedores'
              : (catalogos.proveedores.find(p => String(p.id) === searchParams.get('proveedor_id'))?.nombre_completo ?? 'Proveedor')}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los proveedores</SelectItem>
          {catalogos.proveedores.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.nombre_completo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSort} onValueChange={updateSort}>
        <SelectTrigger className="w-[170px] h-9 text-sm">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="codigo_caja:asc">Código (A-Z)</SelectItem>
          <SelectItem value="codigo_caja:desc">Código (Z-A)</SelectItem>
          <SelectItem value="producto_sku:asc">SKU (A-Z)</SelectItem>
          <SelectItem value="piezas_por_caja:desc">Más piezas</SelectItem>
          <SelectItem value="cbm:desc">Más volumen (CBM)</SelectItem>
          <SelectItem value="peso_bruto_kg:desc">Más peso (kg)</SelectItem>
          <SelectItem value="proveedor_nombre:asc">Proveedor (A-Z)</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
          className="text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" /> Limpiar
        </Button>
      )}

      {puedeCrear && (
        <>
          <Button
            variant="outline"
            className="ml-auto h-9"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" /> Importar Excel
          </Button>

          <Button
            className="h-9"
            onClick={() => setCrearOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Nueva Caja
          </Button>
        </>
      )}

      <CrearCajaDialog
        open={crearOpen}
        onOpenChange={setCrearOpen}
        tallasDisponibles={tallasDisponibles}
        coloresDisponibles={coloresDisponibles}
      />

      <ImportCajasModal
        open={importOpen}
        onOpenChange={setImportOpen}
        catalogoCajas={catalogoCajas}
      />
    </div>
  )
}
