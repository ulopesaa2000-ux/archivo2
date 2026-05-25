// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\permissions.test.ts
import { describe, expect, it } from 'vitest'
import { buildPermissionMatrix, can } from '@/lib/auth/permissions'
import type { UsuarioConRol } from '@/lib/types/tables'

function user(overrides: Partial<UsuarioConRol>): UsuarioConRol {
  return {
    id: 1,
    auth_user_id: 'auth-user-id',
    username: 'test',
    nombre_completo: 'Test User',
    email: 'test@example.com',
    telefono: null,
    rol_id: 2,
    tenant: 'inv-tienda',
    appsheet_pin: null,
    appsheet_activo: false,
    activo: true,
    ultimo_acceso: null,
    created_at: null,
    rol: {
      id: 2,
      nombre: 'Rol',
      descripcion: null,
      nivel_acceso: 2,
      created_at: null,
    },
    permisos: null,
    ...overrides,
  } as UsuarioConRol
}

describe('permissions', () => {
  it('permite acceso total a superadmin aunque falten permisos por modulo', () => {
    const currentUser = user({
      rol: {
        id: 6,
        nombre: 'Super Admin',
        descripcion: null,
        nivel_acceso: 1,
        created_at: null,
      },
      effective_permissions: buildPermissionMatrix([]),
    })

    expect(can(currentUser, 'b2b_ordenes', 'puede_eliminar')).toBe(true)
    expect(can(currentUser, 'ecommerce_config', 'puede_editar')).toBe(true)
  })

  it('bloquea nivel 2 sin permiso real de rol_permisos', () => {
    const currentUser = user({
      effective_permissions: buildPermissionMatrix([]),
    })

    expect(can(currentUser, 'b2b_ordenes', 'puede_leer')).toBe(false)
    expect(can(currentUser, 'inventario_stock', 'puede_leer')).toBe(false)
  })

  it('permite nivel 3 leer notas sin crear cuando solo tiene lectura', () => {
    const currentUser = user({
      rol: {
        id: 10,
        nombre: 'Encargado',
        descripcion: null,
        nivel_acceso: 3,
        created_at: null,
      },
      effective_permissions: buildPermissionMatrix([
        {
          modulo: 'inventario_notas',
          puede_leer: true,
          puede_crear: false,
          puede_editar: false,
          puede_eliminar: false,
        },
      ]),
    })

    expect(can(currentUser, 'inventario_notas', 'puede_leer')).toBe(true)
    expect(can(currentUser, 'inventario_notas', 'puede_crear')).toBe(false)
  })

  it('deja catalogos soporte en lectura para empleados autenticados', () => {
    const currentUser = user({
      effective_permissions: buildPermissionMatrix([]),
    })

    expect(can(currentUser, 'catalogo_catalogos', 'puede_leer')).toBe(true)
    expect(can(currentUser, 'catalogo_catalogos', 'puede_editar')).toBe(false)
  })
})
