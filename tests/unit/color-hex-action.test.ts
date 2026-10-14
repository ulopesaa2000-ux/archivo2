// tests/unit/color-hex-action.test.ts
// Fase 2: resolverHexColorAction (biblioteca -> API exacta -> negro sin trabar).
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

const { mockGetCurrentUser } = vi.hoisted(() => ({ mockGetCurrentUser: vi.fn() }))
vi.mock('@/modules/auth/queries', () => ({ getCurrentUser: mockGetCurrentUser }))

import { resolverHexColorAction } from '@/modules/catalogo/actions/hex'

function mockFetchOnce(payload: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => payload })) as unknown as typeof fetch)
}

describe('resolverHexColorAction', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    mockGetCurrentUser.mockResolvedValue({ id: 1 })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('biblioteca primero (sin llamar a la API)', async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => ({ colors: [] }) }))
    vi.stubGlobal('fetch', spy as unknown as typeof fetch)
    const r = await resolverHexColorAction('FRESA', 'STRAWBERRY')
    expect(r).toMatchObject({ hex: '#FB2943', fuente: 'biblioteca' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('API con match exacto similarity 1', async () => {
    mockFetchOnce({ colors: [{ name: 'Turquoise', hex: '#40e0d0', similarity: 1 }] })
    const r = await resolverHexColorAction('TURQUESA', 'TURQUOISE')
    expect(r).toMatchObject({ hex: '#40E0D0', fuente: 'api', nombreApi: 'Turquoise' })
  })

  it('API sin exacto -> negro (no traba)', async () => {
    mockFetchOnce({ colors: [{ name: 'Cherry', hex: '#cf0234', similarity: 0.6 }] })
    const r = await resolverHexColorAction('CEREZA ROJA', 'RED CHERRY')
    expect(r).toMatchObject({ hex: '#000000', fuente: 'negro' })
  })

  it('API caida -> negro (no traba)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('red caida')
    }) as unknown as typeof fetch)
    const r = await resolverHexColorAction('RAREZA', 'RARITY COLOR')
    expect(r).toMatchObject({ hex: '#000000', fuente: 'negro' })
  })

  it('sin EN util -> negro sin llamar API', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy as unknown as typeof fetch)
    const r = await resolverHexColorAction('COSA RARA', null)
    expect(r).toMatchObject({ hex: '#000000', fuente: 'negro' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('doble: API se consulta con el PRIMER lado', async () => {
    mockFetchOnce({ colors: [{ name: 'Mint', hex: '#3eb489', similarity: 1 }] })
    const r = await resolverHexColorAction('MIENTA/XXX', 'MINT/XXX')
    expect(r).toMatchObject({ hex: '#3EB489', fuente: 'api', nombreApi: 'Mint' })
  })

  it('sin sesion -> negro', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const r = await resolverHexColorAction('FRESA', 'STRAWBERRY')
    expect(r).toMatchObject({ hex: '#000000', fuente: 'negro' })
  })
})
