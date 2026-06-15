// C:\Users\uriel\Downloads\enero 26\archivo2\lib\auth\commercial-scope.ts
import { isSuperAdmin } from '@/lib/auth/permissions'
import type { CommercialScope, PersonaAsignadaComercial, UsuarioConRol } from '@/lib/types/tables'

const TABLE_NOT_FOUND_CODES = new Set(['42P01', 'PGRST205'])

function isTableMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { code?: string; message?: string }
  if (maybeError.code && TABLE_NOT_FOUND_CODES.has(maybeError.code)) return true
  return maybeError.message?.toLowerCase().includes('does not exist') ?? false
}

function dedupeIds(ids: Array<number | null | undefined>): number[] {
  return Array.from(new Set(ids.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)))
}

function splitAssignmentsByTipo(personas: PersonaAsignadaComercial[]) {
  const allowedClienteIds = personas
    .filter((persona) => persona.tipo_entidad === 'Cliente B2B')
    .map((persona) => persona.id)

  const allowedProveedorIds = personas
    .filter((persona) => persona.tipo_entidad === 'Proveedor')
    .map((persona) => persona.id)

  return {
    allowedClienteIds: dedupeIds(allowedClienteIds),
    allowedProveedorIds: dedupeIds(allowedProveedorIds),
  }
}

export function buildCommercialScope(
  user: UsuarioConRol | null,
  assignedPersonas: PersonaAsignadaComercial[]
): CommercialScope {
  const scope: CommercialScope = {
    is_super_admin: isSuperAdmin(user),
    primary_persona_id: user?.persona?.id ?? null,
    primary_persona_tipo: user?.persona?.tipo_entidad ?? null,
    assigned_persona_ids: dedupeIds(assignedPersonas.map((persona) => persona.id)),
    allowed_cliente_ids: [],
    allowed_proveedor_ids: [],
    assigned_personas: assignedPersonas,
    restricts_b2b: false,
  }

  if (scope.is_super_admin) {
    return {
      ...scope,
      restricts_b2b: false,
    }
  }

  const primaryTipo = scope.primary_persona_tipo
  const primaryPersonaId = scope.primary_persona_id

  if (primaryTipo === 'Cliente B2B' && primaryPersonaId) {
    scope.allowed_cliente_ids = [primaryPersonaId]
  } else if (primaryTipo === 'Proveedor' && primaryPersonaId) {
    scope.allowed_proveedor_ids = [primaryPersonaId]
  }

  const assignedSplit = splitAssignmentsByTipo(assignedPersonas)
  scope.allowed_cliente_ids = dedupeIds([
    ...scope.allowed_cliente_ids,
    ...assignedSplit.allowedClienteIds,
  ])
  scope.allowed_proveedor_ids = dedupeIds([
    ...scope.allowed_proveedor_ids,
    ...assignedSplit.allowedProveedorIds,
  ])

  scope.restricts_b2b = true
  return scope
}

export async function fetchAssignedCommercialPersonas(
  supabase: any,
  usuarioId: number
): Promise<PersonaAsignadaComercial[]> {
  try {
    const { data, error } = await (supabase.from('usuario_personas') as any)
      .select(`
        persona_id,
        created_at,
        persona:personas!usuario_personas_persona_id_fkey (
          id,
          nombre_completo,
          tipo_entidad,
          activo
        )
      `)
      .eq('usuario_id', usuarioId)
      .order('created_at')

    if (error) {
      if (isTableMissingError(error)) return []
      console.error('[fetchAssignedCommercialPersonas] error:', JSON.stringify({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      }, null, 2))
      return []
    }

    return (data ?? [])
      .map((row: any) => {
        const persona = Array.isArray(row.persona) ? row.persona[0] : row.persona
        if (!persona || persona.activo === false) return null

        return {
          id: persona.id,
          nombre_completo: persona.nombre_completo,
          tipo_entidad: persona.tipo_entidad,
          rol_asignacion: null,
          created_at: row.created_at ?? null,
        } satisfies PersonaAsignadaComercial
      })
      .filter((persona: PersonaAsignadaComercial | null): persona is PersonaAsignadaComercial => Boolean(persona))
  } catch (error: any) {
    if (isTableMissingError(error)) return []
    console.error('[fetchAssignedCommercialPersonas] exception:', error instanceof Error ? error.stack || error.message : JSON.stringify(error))
    return []
  }
}

export async function resolveCommercialScope(
  supabase: any,
  user: UsuarioConRol | null
): Promise<CommercialScope> {
  if (!user) {
    return {
      is_super_admin: false,
      primary_persona_id: null,
      primary_persona_tipo: null,
      assigned_persona_ids: [],
      allowed_cliente_ids: [],
      allowed_proveedor_ids: [],
      assigned_personas: [],
      restricts_b2b: true,
    }
  }

  const assignedPersonas = await fetchAssignedCommercialPersonas(supabase, user.id)
  return buildCommercialScope(user, assignedPersonas)
}

export function canAccessCommercialOrder(
  scope: CommercialScope,
  order: { cliente_b2b_id?: number | null; proveedor_id?: number | null }
): boolean {
  if (scope.is_super_admin) return true

  const clienteId = order.cliente_b2b_id ?? null
  const proveedorId = order.proveedor_id ?? null

  if (clienteId && scope.allowed_cliente_ids.includes(clienteId)) return true
  if (proveedorId && scope.allowed_proveedor_ids.includes(proveedorId)) return true

  return false
}

export function buildCommercialOrderFilter(scope: CommercialScope): string | null {
  if (scope.is_super_admin) return null

  const clauses: string[] = []

  if (scope.primary_persona_tipo === 'Proveedor') {
    // Si es un Proveedor primario, SÓLO puede ver órdenes asociadas a él
    if (scope.allowed_proveedor_ids.length > 0) {
      clauses.push(`proveedor_id.in.(${scope.allowed_proveedor_ids.join(',')})`)
    } else {
      return '__no_access__.eq.true'
    }
  } else if (scope.primary_persona_tipo === 'Cliente B2B') {
    // Si es un Cliente B2B primario, SÓLO puede ver órdenes de su propia empresa
    if (scope.allowed_cliente_ids.length > 0) {
      clauses.push(`cliente_b2b_id.in.(${scope.allowed_cliente_ids.join(',')})`)
    } else {
      return '__no_access__.eq.true'
    }
  } else {
    // Si es un intermediario / staff (como Diana), puede ver indistintamente órdenes de sus proveedores o clientes asignados
    if (scope.allowed_cliente_ids.length > 0) {
      clauses.push(`cliente_b2b_id.in.(${scope.allowed_cliente_ids.join(',')})`)
    }
    if (scope.allowed_proveedor_ids.length > 0) {
      clauses.push(`proveedor_id.in.(${scope.allowed_proveedor_ids.join(',')})`)
    }
  }

  return clauses.length > 0 ? clauses.join(',') : '__no_access__.eq.true'
}
