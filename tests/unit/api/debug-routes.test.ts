// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\api\debug-routes.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

describe('debug routes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('blocks test-users outside development', async () => {
    const previousEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const { GET } = await import('@/app/api/test-users/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ error: 'Not Found' })

    process.env.NODE_ENV = previousEnv
  })

  it('returns users in development for test-users', async () => {
    const previousEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: 1, nombre_completo: 'Test User' }],
        error: null,
      }),
    })

    createClientMock.mockResolvedValue({
      from: fromMock,
    })

    const { GET } = await import('@/app/api/test-users/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fromMock).toHaveBeenCalledWith('usuarios')
    expect(body.users).toHaveLength(1)

    process.env.NODE_ENV = previousEnv
  })

  it('returns unauthenticated payload in development for debug-user', async () => {
    const previousEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const { GET } = await import('@/app/api/debug-user/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ error: 'Not authenticated' })

    process.env.NODE_ENV = previousEnv
  })

  it('returns 401 in development for debug-permissions when auth fails', async () => {
    const previousEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'invalid token', code: '401' },
        }),
      },
    })

    const { GET } = await import('@/app/api/debug-permissions/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.authenticated).toBe(false)
    expect(body.authError).toEqual({
      message: 'invalid token',
      code: '401',
    })

    process.env.NODE_ENV = previousEnv
  })
})
