// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\catalogo-search.test.ts
import {
  buildCatalogoSearchFilter,
  getCatalogoSearchTerm,
  normalizeCatalogoSearchTerm,
} from '@/modules/catalogo/search'

describe('búsqueda parcial del catálogo', () => {
  it('conserva códigos con slash y normaliza espacios', () => {
    expect(normalizeCatalogoSearchTerm('  jo24/1daw  ')).toBe('jo24/1daw')
    expect(getCatalogoSearchTerm(' and230023 ')).toBe('and230023')
  })

  it('permite buscar coincidencias parciales en los campos descriptivos', () => {
    expect(buildCatalogoSearchFilter('and230023')).toBe(
      'sku_base.ilike.%and230023%,descripcion.ilike.%and230023%,nombre.ilike.%and230023%,familia.ilike.%and230023%',
    )
  })

  it('evita consultas demasiado amplias para una sola letra', () => {
    expect(getCatalogoSearchTerm('j')).toBeNull()
    expect(buildCatalogoSearchFilter('j')).toBeNull()
    expect(buildCatalogoSearchFilter('')).toBeNull()
  })

  it('escapa comodines que el usuario podría escribir literalmente', () => {
    expect(buildCatalogoSearchFilter('jo_24%')).toContain('jo\\_24\\%')
  })
})
