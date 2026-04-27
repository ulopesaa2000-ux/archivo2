// C:\Users\uriel\Downloads\enero 26\archivo2\tests\integration\config\queries.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

describe('modules/config/queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchUsuarios ordena activos primero y por nivel_acceso', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: 3,
                  nombre_completo: 'Operativo',
                  username: 'op',
                  email: 'op@test.com',
                  activo: true,
                  rol_id: 3,
                  ultimo_acceso: null,
                  created_at: null,
                  rol: { id: 3, nombre: 'Operativo', nivel_acceso: 3, descripcion: null },
                },
                {
                  id: 1,
                  nombre_completo: 'Inactivo',
                  username: 'inactive',
                  email: 'in@test.com',
                  activo: false,
                  rol_id: 2,
                  ultimo_acceso: null,
                  created_at: null,
                  rol: { id: 2, nombre: 'Admin', nivel_acceso: 2, descripcion: null },
                },
                {
                  id: 2,
                  nombre_completo: 'Admin',
                  username: 'admin',
                  email: 'admin@test.com',
                  activo: true,
                  rol_id: 2,
                  ultimo_acceso: null,
                  created_at: null,
                  rol: { id: 2, nombre: 'Admin', nivel_acceso: 2, descripcion: null },
                },
              ],
              error: null,
            })
          ),
        })),
      })),
    }

    mockCreateClient.mockResolvedValue(supabase)
    const { fetchUsuarios } = await import('@/modules/config/queries')
    const usuarios = await fetchUsuarios()

    expect(usuarios[0].nombre_completo).toBe('Admin')
    expect(usuarios[1].nombre_completo).toBe('Operativo')
    expect(usuarios[2].nombre_completo).toBe('Inactivo')
  })

  it('fetchRolesConPermisos construye el mapa de permisos por rol', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'roles') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { id: 1, nombre: 'Super', descripcion: null, nivel_acceso: 1 },
                    { id: 2, nombre: 'Admin', descripcion: null, nivel_acceso: 2 },
                  ],
                  error: null,
                })
              ),
            })),
          }
        }

        if (table === 'rol_permisos') {
          return {
            select: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    rol_id: 2,
                    modulo: 'config_usuarios',
                    puede_leer: true,
                    puede_crear: true,
                    puede_editar: false,
                    puede_eliminar: false,
                  },
                ],
                error: null,
              })
            ),
          }
        }

        throw new Error(`Tabla no mockeada: ${table}`)
      }),
    }

    mockCreateClient.mockResolvedValue(supabase)
    const { fetchRolesConPermisos } = await import('@/modules/config/queries')
    const roles = await fetchRolesConPermisos()

    expect(roles).toHaveLength(2)
    expect(roles[1].permisos).toHaveLength(1)
    expect(roles[1].permisos[0].modulo).toBe('config_usuarios')
    expect(roles[1].permisos[0].puede_crear).toBe(true)
  })
})
