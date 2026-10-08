// tests/unit/ordenes-region.test.ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_STORE_CONFIG, getZonasAtencion, parseStoreConfig, ZONA_OTRA_REGION } from '@/lib/utils/storeConfig'
import { getRegionOrden, cajasDePz, pzDeCajas, precioPorCaja } from '@/modules/ecommerce/utils'

describe('getZonasAtencion', () => {
  it('usa las zonas del JSON de encargados + otra región', () => {
    const zonas = getZonasAtencion(DEFAULT_STORE_CONFIG)
    expect(zonas).toContain('Zona Centro CDMX')
    expect(zonas).toContain('Tulancingo Hgo.')
    expect(zonas[zonas.length - 1]).toBe(ZONA_OTRA_REGION)
  })

  it('respeta lista ampliada guardada en el JSON', () => {
    const raw = JSON.stringify({
      contactos_lista: [
        { id: 'c-1', nombre: 'Ana', zona: 'Puebla', telefono_display: '1', phone_raw: '5211', activo: true, orden: 0 },
      ],
    })
    expect(getZonasAtencion(parseStoreConfig(raw))).toEqual(['Puebla', ZONA_OTRA_REGION])
  })
})

describe('getRegionOrden', () => {
  it('prefiere direccion_envio.ciudad', () => {
    expect(getRegionOrden({ direccion_envio: { ciudad: 'Moroleón Gto.' }, notas_cliente: '[Región de Atención: Otra]' })).toBe('Moroleón Gto.')
  })

  it('lee el prefijo histórico de notas', () => {
    expect(getRegionOrden({ direccion_envio: null, notas_cliente: '[Región de Atención: Toluca, Edo. Méx.] - urgente' })).toBe('Toluca, Edo. Méx.')
  })

  it('retorna em-dash sin datos', () => {
    expect(getRegionOrden({ direccion_envio: null, notas_cliente: null })).toBe('—')
  })
})

describe('cálculo por cajas (ejemplo AND260025: 5 cajas x 25 pz x $150)', () => {
  it('pz = cajas x factor', () => {
    expect(pzDeCajas(5, 25)).toBe(125)
  })

  it('precio por caja = unitario x factor', () => {
    expect(precioPorCaja(150, 25)).toBe(3750)
  })

  it('total = cajas x precio caja = 18,750', () => {
    const subtotal = pzDeCajas(5, 25) * 150
    expect(subtotal).toBe(18750)
    expect(cajasDePz(125, 25)).toBe(5)
  })

  it('sin factor retorna null', () => {
    expect(cajasDePz(125, null)).toBeNull()
    expect(precioPorCaja(150, null)).toBeNull()
  })
})
