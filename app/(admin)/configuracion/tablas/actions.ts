// app/(admin)/configuracion/tablas/actions.ts
'use server'

import { saveTableConfigAction, resetTableConfigAction } from '@/modules/admin-table/config/actions'
import type { TableFeatures } from '@/components/admin/DataTable/types'

export type SaveConfigPayload = {
  route: string
  features: TableFeatures
  columnas_visibles?: string[] | null
}

export async function guardarConfiguracionAction(
  payload: SaveConfigPayload
) {
  return saveTableConfigAction(payload)
}

export async function restablecerConfiguracionAction(route: string) {
  return resetTableConfigAction(route)
}