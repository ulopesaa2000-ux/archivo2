'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable, ColumnDef, DataTableProvider, useDataTableContext } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime, formatTimeAgo } from '@/lib/utils'
import { History, Search, FileText, User, ArrowRight, Package } from 'lucide-react'
import type { AuditoriaGeneralRow } from '@/modules/catalogo/queries'

interface Props {
  initialData: AuditoriaGeneralRow[]
}

function AuditoriaProductosClientInner({ initialData }: Props) {
  const router = useRouter()
  const ctx = useDataTableContext()
  const [searchTerm, setSearchTerm] = useState('')
  const [accionFilter, setAccionFilter] = useState<string>('ALL')

  const handleAccionChange = (value: string | null) => {
    setAccionFilter(value || 'ALL')
  }

  const filteredData = useMemo(() => {
    return initialData.filter((item) => {
      const matchesSearch =
        searchTerm === '' ||
        item.sku_base?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productonombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.usuarionombre?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesAccion = accionFilter === 'ALL' || item.accion === accionFilter

      return matchesSearch && matchesAccion
    })
  }, [initialData, searchTerm, accionFilter])

  const getAccionBadge = (accion: string) => {
    switch (accion) {
      case 'INSERT':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            Creación
          </Badge>
        )
      case 'UPDATE':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            Modificación
          </Badge>
        )
      case 'DELETE':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            Eliminación
          </Badge>
        )
      default:
        return <Badge>{accion}</Badge>
    }
  }

  const columns: ColumnDef<AuditoriaGeneralRow>[] = [
    {
      key: 'accion',
      header: 'Acción',
      cell: (row) => getAccionBadge(row.accion),
      className: 'w-[120px]',
    },
    {
      key: 'producto',
      header: 'Producto',
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-sm">{row.sku_base}</div>
          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
            {row.productonombre}
          </div>
        </div>
      ),
    },
    {
      key: 'campos',
      header: 'Campos Modificados',
      cell: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[250px]">
          {row.campos_modificados?.slice(0, 3).map((campo, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted"
            >
              {campo}
            </span>
          ))}
          {row.campos_modificados && row.campos_modificados.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{row.campos_modificados.length - 3} más
            </span>
          )}
          {!row.campos_modificados?.length && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'usuario',
      header: 'Usuario',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{row.usuarionombre || 'Sistema'}</span>
        </div>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      sortKey: 'fechaauditoria',
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="text-sm">{formatDateTime(row.fechaauditoria)}</div>
          <div className="text-xs text-muted-foreground">
            {formatTimeAgo(row.fechaauditoria)}
          </div>
        </div>
      ),
    },
    {
      key: 'acciones',
      header: '',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => router.push(`/catalogo/${row.productoid}`)}
          title="Ver producto"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      ),
      className: 'w-[50px] text-right',
    },
  ]

  const renderExpanded = (row: AuditoriaGeneralRow) => {
    return (
      <div className="space-y-4 py-2">
        {row.accion === 'INSERT' && row.datos_nuevos && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Datos del producto creado
            </h4>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
              {JSON.stringify(row.datos_nuevos, null, 2)}
            </pre>
          </div>
        )}

        {row.accion === 'DELETE' && row.datos_anteriores && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-red-600">
              <History className="h-4 w-4" />
              Datos del producto eliminado
            </h4>
            <pre className="text-xs bg-red-50 p-3 rounded-md overflow-auto max-h-[300px]">
              {JSON.stringify(row.datos_anteriores, null, 2)}
            </pre>
          </div>
        )}

        {row.accion === 'UPDATE' && (
          <div className="grid grid-cols-2 gap-4">
            {row.datos_anteriores && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Antes
                </h4>
                <div className="space-y-1">
                  {row.campos_modificados?.map((campo) => (
                    <div
                      key={campo}
                      className="text-xs bg-red-50 border border-red-100 p-2 rounded"
                    >
                      <span className="font-medium">{campo}:</span>{' '}
                      <span className="text-red-700">
                        {JSON.stringify(row.datos_anteriores?.[campo])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {row.datos_nuevos && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Después
                </h4>
                <div className="space-y-1">
                  {row.campos_modificados?.map((campo) => (
                    <div
                      key={campo}
                      className="text-xs bg-green-50 border border-green-100 p-2 rounded"
                    >
                      <span className="font-medium">{campo}:</span>{' '}
                      <span className="text-green-700">
                        {JSON.stringify(row.datos_nuevos?.[campo])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU, nombre o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={accionFilter} onValueChange={handleAccionChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las acciones</SelectItem>
            <SelectItem value="INSERT">Creaciones</SelectItem>
            <SelectItem value="UPDATE">Modificaciones</SelectItem>
            <SelectItem value="DELETE">Eliminaciones</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total registros</span>
          </div>
          <div className="text-2xl font-semibold mt-1">{initialData.length}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Creaciones</span>
          </div>
          <div className="text-2xl font-semibold mt-1 text-green-600">
            {initialData.filter((d) => d.accion === 'INSERT').length}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Modificaciones</span>
          </div>
          <div className="text-2xl font-semibold mt-1 text-blue-600">
            {initialData.filter((d) => d.accion === 'UPDATE').length}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-red-600" />
            <span className="text-sm text-muted-foreground">Eliminaciones</span>
          </div>
          <div className="text-2xl font-semibold mt-1 text-red-600">
            {initialData.filter((d) => d.accion === 'DELETE').length}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <DataTable
        columns={columns}
        data={filteredData}
        rowKey={(row) => row.id}
        renderExpanded={renderExpanded}
        emptyMessage="No se encontraron registros de auditoría."
        emptyIcon={<History className="h-12 w-12" />}
      />

      <div className="text-sm text-muted-foreground">
        Mostrando {filteredData.length} de {initialData.length} registros
      </div>
    </div>
  )
}

export function AuditoriaProductosClient(props: Props) {
  return (
    <DataTableProvider route="/configuracion/auditoria_producto" features={{ expandable: true }}>
      <AuditoriaProductosClientInner {...props} />
    </DataTableProvider>
  )
}
