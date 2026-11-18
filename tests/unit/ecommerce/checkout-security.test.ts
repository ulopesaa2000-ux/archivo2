// tests/unit/ecommerce/checkout-security.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizePostgrestFilterTerm } from '@/lib/utils/postgrest-sanitize'

describe('sanitizePostgrestFilterTerm', () => {
  it('elimina operadores reservados de PostgREST y escapa comodines SQL', () => {
    expect(sanitizePostgrestFilterTerm('camisa,id.eq.1(admin)*%test_1')).toBe(
      'camisa id.eq.1 admin \\%test\\_1'
    )
  })

  it('recorta espacios y limita longitud', () => {
    const long = 'a'.repeat(200)
    expect(sanitizePostgrestFilterTerm(`  ${long}  `).length).toBe(120)
  })
})
