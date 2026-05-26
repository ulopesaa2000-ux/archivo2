// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\commercial-scope.test.ts
import { describe, expect, it } from 'vitest'
import { buildCommercialScope, canAccessCommercialOrder } from '@/lib/auth/commercial-scope'
import type { PersonaAsignadaComercial, UsuarioConRol } from '@/lib/types/tables'

function buildUser(overrides: Partial<UsuarioConRol>): UsuarioConRol {
  return {
    id: 12,
    auth_user_id: 'auth-user',
    username: 'operativo',
    nombre_completo: 'Operativo Diana',
    email: 'operativo@example.com',
    telefono: null,
    rol_id: 3,
    tenant: 'inv-tienda',
    appsheet_pin: null,
    appsheet_activo: false,
    activo: true,
    ultimo_acceso: null,
    created_at: null,
    rol: {
      id: 3,
      nombre: 'Operativo',
      descripcion: null,
      nivel_acceso: 3,
      created_at: null,
    },
    permisos: null,
    persona: {
      id: 99,
      tipo_entidad: 'Empleado',
    },
    ...overrides,
  } as UsuarioConRol
}

function assignment(id: number, tipo: 'Cliente B2B' | 'Proveedor'): PersonaAsignadaComercial {
  return {
    id,
    nombre_completo: `Persona ${id}`,
    tipo_entidad: tipo,
    rol_asignacion: 'Intermediario Comercial',
    created_at: null,
  }
}

describe('commercial scope', () => {
  it('mantiene aislamiento de cliente/proveedor por persona principal', () => {
    const cliente = buildUser({
      persona: { id: 27, tipo_entidad: 'Cliente B2B' },
    })

    const scope = buildCommercialScope(cliente, [])

    expect(scope.allowed_cliente_ids).toEqual([27])
    expect(canAccessCommercialOrder(scope, { cliente_b2b_id: 27, proveedor_id: 18 })).toBe(true)
    expect(canAccessCommercialOrder(scope, { cliente_b2b_id: 28, proveedor_id: 18 })).toBe(false)
  })

  it('permite a intermediario interno ver solo personas asignadas', () => {
    const interno = buildUser({
      persona: { id: 50, tipo_entidad: 'Empleado' },
    })

    const scope = buildCommercialScope(interno, [
      assignment(27, 'Cliente B2B'),
      assignment(18, 'Proveedor'),
    ])

    expect(scope.allowed_cliente_ids).toEqual([27])
    expect(scope.allowed_proveedor_ids).toEqual([18])
    expect(canAccessCommercialOrder(scope, { cliente_b2b_id: 27, proveedor_id: 999 })).toBe(true)
    expect(canAccessCommercialOrder(scope, { cliente_b2b_id: 999, proveedor_id: 18 })).toBe(true)
    expect(canAccessCommercialOrder(scope, { cliente_b2b_id: 999, proveedor_id: 777 })).toBe(false)
  })

  it('bloquea empleado sin persona comercial y sin asignaciones', () => {
    const interno = buildUser({
      persona: { id: 50, tipo_entidad: 'Empleado' },
    })

    const scope = buildCommercialScope(interno, [])

    expect(scope.allowed_cliente_ids).toEqual([])
    expect(scope.allowed_proveedor_ids).toEqual([])
    expect(canAccessCommercialOrder(scope, { cliente_b2b_id: 27, proveedor_id: 18 })).toBe(false)
  })
})
