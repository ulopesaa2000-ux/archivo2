// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\net-counts.test.ts
import { describe, expect, it } from 'vitest'
import { getNetProductCounts } from '@/lib/familias/net-counts'

// Origen simulado: productId -> familia cargada en local.
const resolver = (map: Record<number, string>) => (id: number) => map[id] ?? null

describe('net-counts: draft nueva no duplica', () => {
  it('draft con 1 producto da neto 1 (se queda en B)', () => {
    const counts = getNetProductCounts(
      [
        { familia: 'F000-000C', total: 5, esDraft: false },
        { familia: 'F001-490B', total: 1, esDraft: true },
      ],
      { 101: 'F001-490B' },
      resolver({ 101: 'F000-000C' }),
    )
    expect(counts['F001-490B']).toBe(1)
    expect(counts['F000-000C']).toBe(4)
  })

  it('draft con 2 productos da neto 2 (sugiere A)', () => {
    const counts = getNetProductCounts(
      [
        { familia: 'F000-000C', total: 5, esDraft: false },
        { familia: 'F001-240A', total: 2, esDraft: true },
      ],
      { 101: 'F001-240A', 102: 'F001-240A' },
      resolver({ 101: 'F000-000C', 102: 'F000-000C' }),
    )
    expect(counts['F001-240A']).toBe(2)
    expect(counts['F000-000C']).toBe(3)
  })
})

describe('net-counts: familias BD sin cambio de comportamiento', () => {
  it('mover entre existentes resta origen y suma destino', () => {
    const counts = getNetProductCounts(
      [
        { familia: 'F343-490A', total: 2, esDraft: false },
        { familia: 'F001-490B', total: 3, esDraft: false },
      ],
      { 201: 'F001-490B' },
      resolver({ 201: 'F343-490A' }),
    )
    expect(counts['F343-490A']).toBe(1)
    expect(counts['F001-490B']).toBe(4)
  })

  it('mover a la misma familia no cuenta', () => {
    const counts = getNetProductCounts(
      [{ familia: 'F343-490A', total: 2, esDraft: false }],
      { 201: 'F343-490A' },
      resolver({ 201: 'F343-490A' }),
    )
    expect(counts['F343-490A']).toBe(2)
  })

  it('origen desconocido solo suma destino y no baja de 0', () => {
    const counts = getNetProductCounts(
      [{ familia: 'F000-000C', total: 0, esDraft: false }],
      { 999: 'F000-000C' },
      resolver({}),
    )
    expect(counts['F000-000C']).toBe(0)
  })
})
