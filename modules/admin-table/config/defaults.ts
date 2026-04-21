// modules/admin-table/config/defaults.ts
import type { TableFeatures, UserTableConfigRow } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Helper para construir features por defecto según la ruta
// ─────────────────────────────────────────────────────────────────────────────
export function getDefaultFeatures(route: string): TableFeatures {
  switch (route) {
    case '/catalogo':
      return {
        selectable: true,
        sortable: true,
        quickEdit: [
          { key: 'descripcion', label: 'Descripción', type: 'text' },
          { key: 'familia', label: 'Familia', type: 'text' },
          { key: 'marca_id', label: 'Marca', type: 'select' },
          { key: 'precio_ec', label: 'Precio EC', type: 'currency' },
          { key: 'estado', label: 'Estado', type: 'select' },
        ],
        bulkActions: [],
        columnSelector: false,
      }
    case '/inventario/notas':
      return { selectable: false, expandable: false, sortable: true, columnSelector: false }
    case '/inventario/stock':
      return { selectable: false, expandable: false, sortable: true, columnSelector: false }
    case '/ordenes-b2b':
      return { selectable: true, expandable: true, sortable: true, columnSelector: false }
    case '/ordenes-b2b/cajas':
      return { selectable: true, expandable: false, sortable: true, columnSelector: false }
    case '/contenedores':
      return { selectable: true, expandable: true, sortable: true, columnSelector: false }
    default:
      return { sortable: true }
  }
}