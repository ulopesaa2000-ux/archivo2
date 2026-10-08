// tests/unit/favoritos.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeFavoriteIds, mergeFavoriteIds, FAVORITES_STORAGE_KEY, FAVORITES_EVENT_KEY } from '@/lib/utils/favoritos'

describe('sanitizeFavoriteIds', () => {
  it('retorna [] para entradas no arreglo', () => {
    expect(sanitizeFavoriteIds(null)).toEqual([])
    expect(sanitizeFavoriteIds(undefined)).toEqual([])
    expect(sanitizeFavoriteIds('123')).toEqual([])
    expect(sanitizeFavoriteIds({})).toEqual([])
  })

  it('filtra ids inválidos y elimina duplicados sin reordenar', () => {
    expect(sanitizeFavoriteIds([3, 1, 3, 0, -5, 2.5, NaN, 2, '7', 'abc'])).toEqual([3, 1, 2, 7])
  })

  it('limita a 200 favoritos', () => {
    const input = Array.from({ length: 250 }, (_, i) => i + 1)
    const result = sanitizeFavoriteIds(input)
    expect(result).toHaveLength(200)
    expect(result[0]).toBe(1)
    expect(result[199]).toBe(200)
  })
})

describe('mergeFavoriteIds', () => {
  it('une local + servidor sin borrar ni duplicar', () => {
    expect(mergeFavoriteIds([1, 2], [2, 3])).toEqual([1, 2, 3])
  })

  it('conserva el orden local primero', () => {
    expect(mergeFavoriteIds([5, 1], [9, 5])).toEqual([5, 1, 9])
  })

  it('respeta el tope de 200', () => {
    const local = Array.from({ length: 200 }, (_, i) => i + 1)
    expect(mergeFavoriteIds(local, [201, 202])).toHaveLength(200)
  })
})

describe('favoritos storage keys', () => {
  it('expone llaves estables para localStorage y eventos', () => {
    expect(FAVORITES_STORAGE_KEY).toBe('inv_tienda_favorites')
    expect(FAVORITES_EVENT_KEY).toBe('inv_favorites_updated')
  })
})
