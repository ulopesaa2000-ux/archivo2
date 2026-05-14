// app/(admin)/despachos/DespachoListContent.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES, PAGE_SIZE } from '@/lib/constants'
import { Plus, Search, ArrowRight, Loader2 } from 'lucide-react'
import type { DespachoListaItem, FiltrosDespacho } from '@/modules/despachos/types'

const ESTADO_LABELS: Record<string, string> = {
  Programado: 'Programado',
  'En Tránsito': 'En Tránsito',
  Recibido: 'Recibido',
  Cancelado: 'Cancelado',
}

const ESTADO_COLORS: Record<string, string> = {
  Programado: 'bg-yellow-100 text-yellow-800',
  'En Tránsito': 'bg-blue-100 text-blue-800',
  Recibido: 'bg-green-100 text-green-800',
  Cancelado: 'bg-red-100 text-red-800',
}

export function DespachoListContent({
  items, total, filtros,
}: {
  items: DespachoListaItem[]
  total: number
  filtros: FiltrosDespacho
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const updateFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) { params.set(key, value) } else { params.delete(key) }
    if (key !== 'page') params.delete('page')
    startTransition(() => router.push(`?${params.toString()}`, { scroll: false }))
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar despacho..."
            defaultValue={filtros.q ?? ''}
            onChange={(e) => updateFilter('q', e.target.value || undefined)}
            className="pl-8 h-9"
          />
        </div>
        <Select
          value={filtros.estado ?? ''}
          onValueChange={(v) => updateFilter('estado', v || undefined)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="Programado">Programado</SelectItem>
            <SelectItem value="En Tránsito">En Tránsito</SelectItem>
            <SelectItem value="Recibido">Recibido</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Link href={ADMIN_ROUTES.despachos.nuevo}>
          <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Nuevo despacho</Button>
        </Link>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Cajas</TableHead>
              <TableHead>Chofer</TableHead>
              <TableHead>Programado</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay despachos registrados
                </TableCell>
              </TableRow>
            ) : (
              items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.id}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{d.bodega_origen?.nombre ?? '—'}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{d.bodega_destino?.nombre ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={ESTADO_COLORS[d.estado ?? ''] ?? ''}>
                      {ESTADO_LABELS[d.estado ?? ''] ?? d.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.total_cajas_solicitadas}
                    {d.total_cajas_recibidas != null && (
                      <span className="text-muted-foreground text-xs ml-1">
                        / {d.total_cajas_recibidas}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{d.chofer ?? '—'}</TableCell>
                  <TableCell><Fecha valor={d.fecha_programada} formato="fecha" /></TableCell>
                  <TableCell>
                    <Link href={ADMIN_ROUTES.despachos.detalle(d.id)}>
                      <Button variant="ghost" size="sm"><ArrowRight className="h-3.5 w-3.5" /></Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{total} resultados</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === (filtros.page ?? 1) ? 'default' : 'outline'}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => updateFilter('page', String(p))}
                disabled={isPending}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isPending && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}
