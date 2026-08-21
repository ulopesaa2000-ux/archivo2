// modules/inventario/permissions.ts

import { createClient } from '@/lib/supabase/server'
import type { UsuarioConRol } from '@/lib/types/tables'

import { fetchConfigInventario } from './config-queries'

export type AccionInventario =
  | 'consultar_stock'
  | 'crear_nota'
  | 'editar_nota'
  | 'confirmar_nota'
  | 'transferir'
  | 'gestionar_permisos'

export type PermisoEfectivoBodega = {
  bodega_id: number
  ciudad: string
  puede_consultar: boolean
  puede_crear_notas: boolean
  puede_confirmar_notas: boolean
  puede_transferir: boolean
  origen: 'rol' | 'bodega' | 'matriz'
}

/**
 * Obtiene los permisos efectivos de un usuario para todas las bodegas activas.
 */
export async function getPermisosEfectivosUsuario(usuarioId: number): Promise<PermisoEfectivoBodega[]> {
  const supabase = await createClient()
  const { data, error } = await (supabase.rpc as any)('fn_permisos_usuario', { p_usuario_id: usuarioId })
  
  if (error || !data) {
    console.error('Error al obtener permisos efectivos:', error)
    return []
  }

  return data as PermisoEfectivoBodega[]
}

/**
 * Verifica si un usuario puede realizar una acción específica sobre un contexto de bodega o nota.
 */
export async function can(
  user: UsuarioConRol | null,
  accion: AccionInventario,
  ctx?: {
    bodegaId?: number
    bodegaOrigenId?: number
    bodegaDestinoId?: number
    notaId?: number
  }
): Promise<{ ok: boolean; motivo?: string }> {
  if (!user) {
    return { ok: false, motivo: 'Usuario no autenticado.' }
  }

  // Super Admin o Nivel de Acceso <= 2 (Administradores y Encargados Generales)
  if (user.rol && user.rol.nivel_acceso <= 2) {
    return { ok: true }
  }

  const permisos = await getPermisosEfectivosUsuario(user.id)

  switch (accion) {
    case 'consultar_stock': {
      if (!ctx?.bodegaId) {
        // Puede consultar si tiene al menos 1 bodega permitida
        const tieneAlguna = permisos.some(p => p.puede_consultar)
        return tieneAlguna
          ? { ok: true }
          : { ok: false, motivo: 'No tienes bodegas asignadas para consultar inventario.' }
      }
      const permBodega = permisos.find(p => p.bodega_id === ctx.bodegaId)
      return permBodega?.puede_consultar
        ? { ok: true }
        : { ok: false, motivo: 'No tienes permiso para consultar esta bodega.' }
    }

    case 'crear_nota': {
      const bId = ctx?.bodegaId ?? ctx?.bodegaOrigenId
      if (!bId) {
        return { ok: false, motivo: 'Bodega de origen requerida.' }
      }
      const permOrigen = permisos.find(p => p.bodega_id === bId)
      if (!permOrigen?.puede_crear_notas) {
        return { ok: false, motivo: 'No tienes permiso para crear notas en esta bodega.' }
      }
      return { ok: true }
    }

    case 'confirmar_nota': {
      let bOrigenId = ctx?.bodegaOrigenId ?? ctx?.bodegaId
      let bDestinoId = ctx?.bodegaDestinoId

      if (ctx?.notaId) {
        // Si viene notaId, consultar bodegas de la nota
        const supabase = await createClient()
        const { data: nota } = await supabase
          .from('notas_inventario')
          .select('bodega_origen_id, bodega_destino_id')
          .eq('id', ctx.notaId)
          .single()

        if (!nota) return { ok: false, motivo: 'Nota no encontrada.' }
        bOrigenId = nota.bodega_origen_id
        bDestinoId = nota.bodega_destino_id || undefined
      }

      const config = await fetchConfigInventario()
      const esTraspaso = bDestinoId !== undefined && bDestinoId !== null

      if (esTraspaso) {
        const permDestino = permisos.find((p) => p.bodega_id === bDestinoId)
        const permOrigen = permisos.find((p) => p.bodega_id === bOrigenId)

        if (config.requiere_aprobacion_traspaso) {
          // Si requiere aprobación de la bodega receptora:
          // La confirmación definitiva (que procesa y mueve stock) debe realizarla la bodega de destino
          if (!permDestino || (!permDestino.puede_confirmar_notas && !permDestino.puede_crear_notas)) {
            return {
              ok: false,
              motivo: 'Este traspaso requiere ser confirmado por el encargado de la bodega destino receptora.',
            }
          }
          return { ok: true }
        } else {
          // Si NO requiere aprobación de la bodega receptora:
          // Puede ser confirmado por quien tenga permiso en origen O en destino
          const tienePermiso =
            (permOrigen && (permOrigen.puede_confirmar_notas || permOrigen.puede_crear_notas)) ||
            (permDestino && (permDestino.puede_confirmar_notas || permDestino.puede_crear_notas))

          if (!tienePermiso) {
            return {
              ok: false,
              motivo: 'No tienes permisos en la bodega de origen ni en la bodega de destino para confirmar esta nota.',
            }
          }
          return { ok: true }
        }
      }

      // Notas normales (Entrada, Salida, Ajuste, Devolución)
      if (bOrigenId) {
        const permOrigen = permisos.find((p) => p.bodega_id === bOrigenId)
        if (!permOrigen || (!permOrigen.puede_confirmar_notas && !permOrigen.puede_crear_notas)) {
          return { ok: false, motivo: 'No tienes permiso para confirmar notas en esta bodega.' }
        }
      }

      return { ok: true }
    }

    case 'editar_nota': {
      const bId = ctx?.bodegaId ?? ctx?.bodegaOrigenId
      if (bId) {
        const perm = permisos.find(p => p.bodega_id === bId)
        if (!perm?.puede_crear_notas && !perm?.puede_confirmar_notas) {
          return { ok: false, motivo: 'No tienes permiso para modificar notas en esta bodega.' }
        }
      }
      return { ok: true }
    }

    case 'transferir': {
      const bId = ctx?.bodegaId ?? ctx?.bodegaOrigenId
      if (!bId) return { ok: false, motivo: 'Bodega requerida.' }
      const perm = permisos.find(p => p.bodega_id === bId)
      return perm?.puede_transferir
        ? { ok: true }
        : { ok: false, motivo: 'No tienes permiso para realizar transferencias desde esta bodega.' }
    }

    case 'gestionar_permisos': {
      // Solo Super Admin o Nivel 1/2 pueden gestionar permisos
      return user.rol && user.rol.nivel_acceso <= 2
        ? { ok: true }
        : { ok: false, motivo: 'Se requieren permisos de administración para gestionar permisos.' }
    }

    default:
      return { ok: false, motivo: 'Acción no permitida.' }
  }
}
