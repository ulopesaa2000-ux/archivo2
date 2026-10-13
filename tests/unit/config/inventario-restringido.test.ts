// tests/unit/config/inventario-restringido.test.ts
import { describe, expect, it } from 'vitest'
import {
  esActorAdminInventarioRestringido,
  esRolBodegaGestionable,
} from '@/modules/config/types'

describe('acceso especial Admin Inventario en Usuarios', () => {
  it('detecta al actor Admin Operativo Inventario (nivel > 1)', () => {
    expect(esActorAdminInventarioRestringido('Admin Operativo Inventario', 2)).toBe(true)
    expect(esActorAdminInventarioRestringido('Admin Operativo Inventario', 1)).toBe(false)
    expect(esActorAdminInventarioRestringido('Bodeguero', 3)).toBe(false)
    expect(esActorAdminInventarioRestringido('Super Admin', 1)).toBe(false)
    expect(esActorAdminInventarioRestringido(null, 2)).toBe(false)
  })

  it('solo Bodeguero y Encargado de Bodega son gestionables', () => {
    expect(esRolBodegaGestionable('Bodeguero', 3)).toBe(true)
    expect(esRolBodegaGestionable('Encargado de Bodega', 3)).toBe(true)
    expect(esRolBodegaGestionable('  encargadO de bodega  ', 4)).toBe(true)
    expect(esRolBodegaGestionable('Admin Operativo Inventario', 2)).toBe(false)
    expect(esRolBodegaGestionable('Bodeguero', 2)).toBe(false)
    expect(esRolBodegaGestionable('Super Admin', 1)).toBe(false)
    expect(esRolBodegaGestionable('Vendedor', 4)).toBe(false)
    expect(esRolBodegaGestionable(null, 3)).toBe(false)
  })
})
