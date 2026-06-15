// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\api\usuarios-disponibles-route.test.ts
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCurrentUserMock = vi.fn()
const fetchUsuariosMock = vi.fn()
const canMock = vi.fn()

vi.mock('@/modules/auth/queries', () => ({
  getCurrentUser: () => getCurrentUserMock(),
}))

vi.mock('@/modules/config/queries', () => ({
  fetchUsuarios: () => fetchUsuariosMock(),
}))

vi.mock('@/lib/auth/permissions', () => ({
  can: (...args: unknown[]) => canMock(...args),
}))

describe('usuarios-disponibles route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when there is no authenticated user', async () => {
    getCurrentUserMock.mockResolvedValue(null)

    const { GET } = await import('@/app/api/inventario/bodegas/usuarios-disponibles/route')
    const response = await GET(new NextRequest('https://example.com/api/inventario/bodegas/usuarios-disponibles'))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'No autenticado.' })
  })

  it('returns 403 when user lacks permission to edit bodegas', async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 10,
      rol: { nombre: 'Encargado de Bodega' },
    })
    canMock.mockReturnValue(false)

    const { GET } = await import('@/app/api/inventario/bodegas/usuarios-disponibles/route')
    const response = await GET(new NextRequest('https://example.com/api/inventario/bodegas/usuarios-disponibles'))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: 'No autorizado.' })
  })

  it('filters available users to bodegueros for a bodeguero actor', async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 20,
      rol: { nombre: 'Bodeguero' },
    })
    canMock.mockReturnValue(true)
    fetchUsuariosMock.mockResolvedValue([
      { id: 1, rol: { nombre: 'Bodeguero' } },
      { id: 2, rol: { nombre: 'Super Admin' } },
+      { id: 3, rol: { nombre: 'Encargado de Bodega' } },
    ])

    const { GET } = await import('@/app/api/inventario/bodegas/usuarios-disponibles/route')
    const response = await GET(new NextRequest('https://example.com/api/inventario/bodegas/usuarios-disponibles'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([{ id: 1, rol: { nombre: 'Bodeguero' } }])
  })

  it('filters inventory roles for admin inventory managers', async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 30,
      rol: { nombre: 'Admin Operativo Inventario' },
    })
    canMock.mockReturnValue(true)
    fetchUsuariosMock.mockResolvedValue([
      { id: 1, rol: { nombre: 'Bodeguero' } },
      { id: 2, rol: { nombre: 'Super Admin' } },
      { id: 3, rol: { nombre: 'Encargado de Bodega' } },
      { id: 4, rol: { nombre: 'Ventas' } },
    ])

    const { GET } = await import('@/app/api/inventario/bodegas/usuarios-disponibles/route')
    const response = await GET(new NextRequest('https://example.com/api/inventario/bodegas/usuarios-disponibles'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([
      { id: 1, rol: { nombre: 'Bodeguero' } },
      { id: 2, rol: { nombre: 'Super Admin' } },
      { id: 3, rol: { nombre: 'Encargado de Bodega' } },
    ])
  })
})
