// C:\Users\uriel\Downloads\enero 26\archivo2\tests\integration\config\actions.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRevalidatePath = vi.fn()
const mockCreateClient = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

type QueryResult<T> = Promise<{ data: T; error: { message: string } | null }>

function createMockSupabase({
  roleCreateError = null,
  permissionInsertError = null,
  rollbackError = null,
  existingPermiso = null,
  updatePermisoError = null,
  insertPermisoError = null,
}: {
  roleCreateError?: { message: string } | null
  permissionInsertError?: { message: string } | null
  rollbackError?: { message: string } | null
  existingPermiso?: { rol_id: number } | null
  updatePermisoError?: { message: string } | null
  insertPermisoError?: { message: string } | null
} = {}) {
  const rolesInsertSingle = vi.fn<() => QueryResult<{ id: number }>>(() =>
    Promise.resolve({
      data: { id: 999 },
      error: roleCreateError,
    })
  )

  const rolesDeleteEq = vi.fn<() => QueryResult<null>>(() =>
    Promise.resolve({
      data: null,
      error: rollbackError,
    })
  )

  const permisosInsert = vi.fn(() =>
    Promise.resolve({
      data: null,
      error: permissionInsertError ?? insertPermisoError,
    })
  )

  const permisosMaybeSingle = vi.fn<() => QueryResult<{ rol_id: number } | null>>(() =>
    Promise.resolve({
      data: existingPermiso,
      error: null,
    })
  )

  const permisosUpdateEqModulo = vi.fn<() => QueryResult<null>>(() =>
    Promise.resolve({
      data: null,
      error: updatePermisoError,
    })
  )

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'roles') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: rolesInsertSingle,
            })),
          })),
          delete: vi.fn(() => ({
            eq: rolesDeleteEq,
          })),
        }
      }

      if (table === 'rol_permisos') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: permisosMaybeSingle,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: permisosUpdateEqModulo,
            })),
          })),
          insert: permisosInsert,
          delete: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: null,
              })
            ),
          })),
        }
      }

      if (table === 'usuarios') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: null,
              })
            ),
          })),
        }
      }

      throw new Error(`Tabla no mockeada: ${table}`)
    }),
  }

  return {
    supabase,
    spies: {
      rolesInsertSingle,
      rolesDeleteEq,
      permisosInsert,
      permisosMaybeSingle,
      permisosUpdateEqModulo,
    },
  }
}

describe('modules/config/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crearRolAction crea rol y permisos cuando todo sale bien', async () => {
    const { supabase, spies } = createMockSupabase()
    mockCreateClient.mockResolvedValue(supabase)

    const { crearRolAction } = await import('@/modules/config/actions')
    const result = await crearRolAction('QA Role', 'Role for tests', 3, [
      {
        modulo: 'config_usuarios',
        puede_leer: true,
        puede_crear: false,
        puede_editar: false,
        puede_eliminar: false,
      },
    ])

    expect(result.success).toBe(true)
    expect(spies.permisosInsert).toHaveBeenCalledTimes(1)
    expect(spies.rolesDeleteEq).not.toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion/usuarios')
  })

  it('crearRolAction hace rollback si falla insertar permisos', async () => {
    const { supabase, spies } = createMockSupabase({
      permissionInsertError: { message: 'insert failed' },
    })
    mockCreateClient.mockResolvedValue(supabase)

    const { crearRolAction } = await import('@/modules/config/actions')
    const result = await crearRolAction('Broken Role', 'perm error', 3, [
      {
        modulo: 'config_roles',
        puede_leer: true,
        puede_crear: false,
        puede_editar: false,
        puede_eliminar: false,
      },
    ])

    expect(result.success).toBe(false)
    expect(result.error).toContain('falló la asignación inicial de permisos')
    expect(spies.rolesDeleteEq).toHaveBeenCalledTimes(1)
  })

  it('crearRolAction reporta error crítico si falla rollback', async () => {
    const { supabase, spies } = createMockSupabase({
      permissionInsertError: { message: 'insert failed' },
      rollbackError: { message: 'rollback failed' },
    })
    mockCreateClient.mockResolvedValue(supabase)

    const { crearRolAction } = await import('@/modules/config/actions')
    const result = await crearRolAction('Broken Role', 'perm+rollback error', 3, [
      {
        modulo: 'config_roles',
        puede_leer: true,
        puede_crear: false,
        puede_editar: false,
        puede_eliminar: false,
      },
    ])

    expect(result.success).toBe(false)
    expect(result.error).toContain('no se pudo revertir')
    expect(spies.rolesDeleteEq).toHaveBeenCalledTimes(1)
  })

  it('toggleRolPermiso actualiza cuando el permiso ya existe', async () => {
    const { supabase, spies } = createMockSupabase({
      existingPermiso: { rol_id: 5 },
    })
    mockCreateClient.mockResolvedValue(supabase)

    const { toggleRolPermiso } = await import('@/modules/config/actions')
    const result = await toggleRolPermiso(5, 'config_usuarios', 'puede_editar', true)

    expect(result.success).toBe(true)
    expect(spies.permisosMaybeSingle).toHaveBeenCalledTimes(1)
    expect(spies.permisosUpdateEqModulo).toHaveBeenCalledTimes(1)
  })

  it('toggleRolPermiso inserta cuando el permiso no existe', async () => {
    const { supabase, spies } = createMockSupabase({
      existingPermiso: null,
    })
    mockCreateClient.mockResolvedValue(supabase)

    const { toggleRolPermiso } = await import('@/modules/config/actions')
    const result = await toggleRolPermiso(7, 'config_roles', 'puede_leer', true)

    expect(result.success).toBe(true)
    expect(spies.permisosMaybeSingle).toHaveBeenCalledTimes(1)
    expect(spies.permisosInsert).toHaveBeenCalledTimes(1)
  })
})
