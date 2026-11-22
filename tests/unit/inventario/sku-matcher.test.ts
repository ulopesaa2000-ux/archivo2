// tests/unit/inventario/sku-matcher.test.ts
import { describe, it, expect } from 'vitest'
import { compactarSkuOcr, separarCodigos } from '@/lib/inventario/sku-ocr'
import {
  indexarCatalogoSku,
  buscarCandidatosEnCatalogo,
  buscarEnCatalogoLocal,
  calcularDiffIndices,
  type CatalogoSkuItem,
} from '@/lib/inventario/sku-matcher'

const FIXTURE_RAW: CatalogoSkuItem[] = [
  { id: 806, sku_base: 'AND250009', descripcion: 'CHAMARRA BASICA PARA CABALLERO GREENFIELD', pz_en_caja: 60, familia: 'F076-000A', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 811, sku_base: 'AND250006', descripcion: 'CHAMARRA BASICA PARA CABALLERO BULLSTAFF', pz_en_caja: 90, familia: 'F076-000A', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 812, sku_base: 'AND250007', descripcion: 'CHAMARRA BASICA PARA CABALLERO BULLSTAFF', pz_en_caja: 60, familia: 'F076-000A', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 804, sku_base: 'NR2509-FUR', descripcion: 'SET DAMA NR FELPA COLORES COMBINADOS  CON FUR INTERIOR PARA DAMA', pz_en_caja: 36, familia: 'F383-000A', persona_id: 19, proveedor_nombre: 'S/P', proveedor_prefijo: null },
  { id: 7488, sku_base: 'NR2509', descripcion: 'SET DAMA NR FELPA COLORES COMBINADOS PARA DAMA', pz_en_caja: 36, familia: 'F381-000A', persona_id: 25, proveedor_nombre: 'HONTON', proveedor_prefijo: 'HT' },
  { id: 803, sku_base: 'NR2507-FUR', descripcion: 'SET DAMA NR FELPA COLORES COMBINADOS  CON FUR INTERIOR PARA DAMA', pz_en_caja: 36, familia: 'F383-000A', persona_id: 19, proveedor_nombre: 'S/P', proveedor_prefijo: null },
  { id: 735, sku_base: 'AND250024', descripcion: 'CHAMARRA DAMA GREENFIELD SIRENA 20D RIB BASICA', pz_en_caja: 36, familia: 'F209-000A', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 736, sku_base: 'AND250023', descripcion: 'CHM SIRENA CON FUR INTERIOR Y GORRO DESMONTABLE PARA DAMA GREENFIELD', pz_en_caja: 36, familia: 'F217-000A', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 789, sku_base: '3JA7928 /AND250029', descripcion: 'CHAMARRA DAMA  EBOLI CON CINTURON Y GORRO DESMONTABLE, GREENFIELD', pz_en_caja: 30, familia: 'F204-000B', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 177, sku_base: 'J219/3CAC', descripcion: 'CHAMARRA CABALLERO IDOL-NAVY CON GORRO  VENADO ACOLCHADA', pz_en_caja: 25, familia: 'F123-000A', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 185, sku_base: 'J219/3CACD', descripcion: 'CHAMARRA CABALLERO IDOL-NAVY DESMONTABLE CON GORRO VENADO ACOLCHADA', pz_en_caja: 25, familia: 'F126-000A', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 197, sku_base: 'J219/3CACL', descripcion: 'CHAMARRA CABALLERO IDOL-NAVY CON GORRO VENADO LARGA', pz_en_caja: 25, familia: 'F128-000A', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 17, sku_base: 'J219/3CAV', descripcion: 'CHALECO CABALLERO IDOL-NAVY VENADO', pz_en_caja: 25, familia: 'F014-000A', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 175, sku_base: 'J219/1CAC', descripcion: 'CHAMARRA CABALLERO IDOL-NAVY VENADO', pz_en_caja: 28, familia: 'F123-000A', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 7679, sku_base: 'MK26/13SW', descripcion: 'SUETER DE PUNTO APLICACIÓN EN MEZCLILLA PARA MUJER, DULCE CAROLINE', pz_en_caja: 1, familia: 'F426-980B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7689, sku_base: 'MK26/03SW', descripcion: 'SUETER DE PUNTO PRINT OSO PARA MUJER, DULCE CAROLINE', pz_en_caja: 1, familia: 'F426-300B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7680, sku_base: 'MK26/12SW', descripcion: 'SUETER DE PUNTO PARA MUJER, DULCE CAROLINE', pz_en_caja: 1, familia: 'F426-970B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 698, sku_base: 'JA25/05ISD', descripcion: 'SUDADERA POLAR CON GORRO INFANTIL, AMERICAN NICE', pz_en_caja: 35, familia: 'F410-000B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 739, sku_base: 'JA25/06USD', descripcion: 'SUDADERA UNISEX FUR INTERIOR AMERICAN NICE, CON GORRO', pz_en_caja: 35, familia: 'F425-000B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 699, sku_base: 'JA25/02HSD', descripcion: 'SUDADERA CABALLERO IDOL-NAVY', pz_en_caja: 35, familia: 'F418-000B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7718, sku_base: 'OE26/01MA', descripcion: 'abrigo largo de peluche REVERSIBLE PARA MUJER, MARCA IDOL NAVY', pz_en_caja: 30, familia: 'F013-050B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7719, sku_base: 'OE26/02MA', descripcion: 'abrigo borreguita REVERSIBLE PARA MUJER, MARCA IDOL NAVY', pz_en_caja: 30, familia: 'F013-070B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7720, sku_base: 'OE26/03MA', descripcion: 'ABRIGO REVERSIBLE ANIMAL PRINT PARA MUJER, MARCA IDOL NAVY', pz_en_caja: 30, familia: 'F013-080B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7721, sku_base: 'OE26/04MV', descripcion: 'chaleco peluche reversible PARA MUJER, MARCA IDOL NAVY', pz_en_caja: 30, familia: 'F040-490B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7490, sku_base: 'JE26/01MW', descripcion: 'ROMPEVIENTOS DAMA PIEL DURAZNO CON AJUSTADOR EN CINTURA LOVE FREE', pz_en_caja: 60, familia: 'F160-000A', persona_id: 11, proveedor_nombre: 'JENNY', proveedor_prefijo: 'JE' },
  { id: 7655, sku_base: 'JE26/01HC', descripcion: 'SOBRECAMISA CON GRECAS, IDOL NAVY, CABALLERO', pz_en_caja: 1, familia: 'F435-100B', persona_id: 11, proveedor_nombre: 'JENNY', proveedor_prefijo: 'JE' },
  { id: 767, sku_base: 'JO25/02MC', descripcion: 'GABARDINA CON FUR INTERIOR PARA DAMA IDOL NAVY', pz_en_caja: 32, familia: 'F314-000B', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 771, sku_base: 'JO25/07HC', descripcion: 'CHAMARRA CABALLERO IDOL NAVY ACOLCHADA TIPO MONTAÑA', pz_en_caja: 24, familia: 'F129-000B', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 367, sku_base: 'J908/3DCHL', descripcion: 'CHAMARRA DAMA IDOL-NAVY CON GORRO ACOLCHADA EXTRALARGA', pz_en_caja: 25, familia: 'F251-000A', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 366, sku_base: 'J908/5DCHL', descripcion: 'CHAMARRA DAMA IDOL-NAVY CON GORRO ACOLCHADA EXTRALARGA', pz_en_caja: 25, familia: 'F251-000A', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 363, sku_base: 'J908/1DCHL1', descripcion: 'CHAMARRA DAMA IDOL-NAVY LARGA', pz_en_caja: 29, familia: 'F250-000A', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 7732, sku_base: 'JE26/11UC', descripcion: 'SUDADERA POLAR UNISEX TORONTOUTILITY', pz_en_caja: 40, familia: 'F422-590B', persona_id: 11, proveedor_nombre: 'JENNY', proveedor_prefijo: 'JE' },
  { id: 7661, sku_base: 'JE26/10HC', descripcion: 'CHAMARRA GRECAS REVERSIBLE CABALLERO IDOL NAVY', pz_en_caja: 1, familia: 'F039-100B', persona_id: 11, proveedor_nombre: 'JENNY', proveedor_prefijo: 'JE' },
  { id: 7733, sku_base: 'HT26/02HCP', descripcion: 'CHAMARRA PANA CON FUR INTERIOR PARA CABALLERO, IDOL NAVY', pz_en_caja: 24, familia: 'F069-490B', persona_id: 25, proveedor_nombre: 'HONTON', proveedor_prefijo: 'HT' },
  { id: 7734, sku_base: 'HT26/03HC', descripcion: 'CHAMARRA MEZCLILLA CON FUR INTERIOR PARA CABALLERO, IDOL NAVY', pz_en_caja: 24, familia: 'F069-740B', persona_id: 25, proveedor_nombre: 'HONTON', proveedor_prefijo: 'HT' },
  { id: 7599, sku_base: 'HO26/02HC', descripcion: 'CHAMARRA CABALLERO VINIPIEL TEXTURA ATERCIOPELADA TORONTO UTILITY', pz_en_caja: 1, familia: 'F157-400B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7713, sku_base: 'AND260018 3VT8703', descripcion: 'CHAMARRA SUEDE CON CORREGA EN CUELLO Y FUR INTERIOR PARA NIÑO IDOL NAVY', pz_en_caja: 24, familia: 'F343-490B', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 7465, sku_base: '3VT8703 AND260013', descripcion: 'CHAMARRA CABALLERO SUEDE CON FUR EN CUELLO E INTERIOR, GREENFIELD', pz_en_caja: 24, familia: 'F095-050B', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 291, sku_base: '3VT8130', descripcion: 'CHAMARRA DAMA LARGA  BULLSTAFF GAMUZA CON GORRO CEVA', pz_en_caja: 30, familia: 'F197-000B', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 7638, sku_base: 'QQ27/19HW', descripcion: 'ROMPEVIENTOS PARA CABALLERO IDOL NAVY', pz_en_caja: 1, familia: 'F177-400A', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7637, sku_base: 'QQ27/29HW', descripcion: 'ROMPEVIENTOS PARA CABALLERO IDOL NAVY', pz_en_caja: 1, familia: 'F177-400A', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7640, sku_base: 'QQ27/17HW', descripcion: 'ROMPEVIENTOS BICOLOR  PARA CABALLERO  IDOL NAVY', pz_en_caja: 1, familia: 'F177-400A', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 769, sku_base: 'JO25/06MVL', descripcion: 'CHALECO LARGO CON FUR INTERIOR PARA DAMA IDOL NAVY', pz_en_caja: 35, familia: 'F065-000B', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 766, sku_base: 'JO25/05MVL', descripcion: 'CHALECO EXTRA LARGO PARA DAMA IDOL NAVY', pz_en_caja: 32, familia: 'F064-000B', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 768, sku_base: 'JO25/01MCL', descripcion: 'CHAMARRA LARGA CON FUR EN GORRO Y PUÑOS, PARA DAMA IDOL NAVY', pz_en_caja: 35, familia: 'F252-000B', persona_id: 12, proveedor_nombre: 'JOE', proveedor_prefijo: 'JO|J' },
  { id: 7631, sku_base: 'KU26/05HC', descripcion: 'CHAMARRA CANVA PARA CABALLERO IDOL NAVY', pz_en_caja: 1, familia: 'F177-800A', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7628, sku_base: 'KU26/02HC', descripcion: 'CHAMARRA CANVA PARA CABALLERO IDOL NAVY', pz_en_caja: 1, familia: 'F177-800A', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7627, sku_base: 'KU26/01HC', descripcion: 'CHAMARRA CANVA PARA CABALLERO IDOL NAVY', pz_en_caja: 1, familia: 'F177-800A', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 786, sku_base: 'AND250026', descripcion: 'CHALECO DAMA CON RESORTE A LOS COSTADOS, Y GORRO CON FUR DESMONTABLE, TALLAS EXTRA,GREENFIELD 20D', pz_en_caja: 30, familia: 'F048-000A', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 747, sku_base: 'AND250016 3VT7138', descripcion: 'CHL BASICO REVERSIBLE PARA CAB GREENFIELD', pz_en_caja: 30, familia: 'F020-000A', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 784, sku_base: 'AND250022', descripcion: 'CHALECO DAMA CON RESORTE A LOS COSTADOS,  GREENFIELD 20D', pz_en_caja: 36, familia: 'F046-000A', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
  { id: 7695, sku_base: 'KU26/06HC', descripcion: 'CHAMARRA CABALLERO PAPA IDOL NAVY', pz_en_caja: 1, familia: 'F126-300B', persona_id: 8, proveedor_nombre: 'JACKIE', proveedor_prefijo: 'JA' },
  { id: 7633, sku_base: 'HO26/06HC', descripcion: 'CHAMARRA CABALLERO ESTILO PAPA TORONTO-UTILITY', pz_en_caja: 24, familia: 'F157-740B', persona_id: null, proveedor_nombre: null, proveedor_prefijo: null },
  { id: 7580, sku_base: 'BO26/08MSTFE', descripcion: 'SET DE FELPA PARA DAMA TRAINING SPORT BY NR', pz_en_caja: 1, familia: 'F379-100A', persona_id: null, proveedor_nombre: null, proveedor_prefijo: null },
  { id: 7648, sku_base: 'BO26/03MSTFE', descripcion: 'SET DE FELPA PARA DAMA TRAINING SPORT BY NR', pz_en_caja: 1, familia: 'F379-100A', persona_id: 2, proveedor_nombre: 'BONNIE', proveedor_prefijo: 'BO' },
  { id: 7649, sku_base: 'BO26/05MSTFE', descripcion: 'SET DE FELPA PARA DAMA TRAINING SPORT BY NR', pz_en_caja: 1, familia: 'F379-100A', persona_id: 2, proveedor_nombre: 'BONNIE', proveedor_prefijo: 'BO' },
  { id: 7593, sku_base: 'AND260016 3VT8489', descripcion: 'CHAMARRA DAMA LARGA REVERSIBLE  TIPO MALBORO, IDOL NAVY', pz_en_caja: 1, familia: 'F199-100B', persona_id: null, proveedor_nombre: null, proveedor_prefijo: null },
  { id: 7591, sku_base: 'AND260011 1AK7843', descripcion: 'CHAMARRA DAMA  POLIURETANO CON GORRO TALLAS PLUS, IDOL NAVY', pz_en_caja: 1, familia: 'F220-100B', persona_id: null, proveedor_nombre: null, proveedor_prefijo: null },
  { id: 672, sku_base: '3JA8065 AND260012', descripcion: 'CHAMARRA DAMA SUEDE CON GORRO DESMONTABLE  Y FORRO INTERIOR DE FUR', pz_en_caja: 30, familia: 'F201-000B', persona_id: 18, proveedor_nombre: 'MOTI', proveedor_prefijo: 'AND|3VT|3JA|1AK|1VT' },
]

const CATALOGO = indexarCatalogoSku(FIXTURE_RAW)

describe('compactarSkuOcr y separarCodigos', () => {
  it('compacta espacios alrededor de / y - y elimina puntuación final', () => {
    expect(compactarSkuOcr('J219 / 3CNC')).toBe('J219/3CNC')
    expect(compactarSkuOcr('NR2509 - FUR')).toBe('NR2509-FUR')
    expect(compactarSkuOcr('HK26/13SW.')).toBe('HK26/13SW')
    expect(compactarSkuOcr('3UT8703- BOY')).toBe('3UT8703-BOY')
    expect(compactarSkuOcr('AND260018  3VT8703')).toBe('AND260018 3VT8703')
  })

  it('no fragmenta códigos con guión o barra de modelo y sí separa códigos duales completos', () => {
    expect(separarCodigos('NR2509 - FUR')).toEqual(['NR2509-FUR'])
    expect(separarCodigos('J219 / 3CNC')).toEqual(['J219/3CNC'])
    expect(separarCodigos('3UT8703- BOY')).toEqual(['3UT8703-BOY'])
    expect(separarCodigos('3VT8489 /AND250032')).toEqual(['3VT8489', 'AND250032'])
    expect(separarCodigos('AND260018  3VT8703')).toEqual(['AND260018', '3VT8703'])
  })
})

describe('buscarCandidatosEnCatalogo sobre los 21 casos reales de producción', () => {
  const casos: Array<[string, string, string]> = [
    ['AN0250009', 'Cham. cab Bull 90pcs', 'AND250009'],
    ['NR2509 - FUR', 'pants dama lobo 36', 'NR2509-FUR'],
    ['AN0250024', 'Cham dama Sirena 36', 'AND250024'],
    ['J219 / 3CNC', 'Cham cab Venado 25', 'J219/3CAC'],
    ['HK26/13SW.', 'Sueter dama Dulce', 'MK26/13SW'],
    ['JA25/05SSD', 'Sudadera niño America 35 pcs', 'JA25/05ISD'],
    ['OE26/01', 'Abrigo dama Toz2lo', 'OE26/01MA'],
    ['J25/02MC', 'Gabardina dama Anelos', 'JO25/02MC'],
    ['J908/30CHL', 'Cham dama Ixel L.', 'J908/3DCHL'],
    ['JE26/11VL', 'Cham. Unisex Toronto', 'JE26/11UC'],
    ['HT26/02HC', 'Cham cab pana', 'HT26/02HCP'],
    ['3UT8703- BOY', 'Cham. niño Malboro', 'AND260018 3VT8703'],
    ['3VT8703-BOJ', 'Cham niño Mallorca 24 pcs', 'AND260018 3VT8703'],
    ['0027/19HW', 'Rompe cab 1x1 35', 'QQ27/19HW'],
    ['J025/06MUL', 'Chaleco dama Jalisco', 'JO25/06MVL'],
    ['KU26/05HU', 'Cham cab canvas 30', 'KU26/05HC'],
    ['OE26/04HA', 'Chaleco dama Ital', 'OE26/04MV'],
    ['AND250076', 'Chaleco dama Cof. Exx 34', 'AND250026'],
    ['KU26/06HC', 'Cham cab Tipo Puma 25 pcs', 'KU26/06HC'],
    ['BO26/08MSTFE', 'Pants dama Felpa 36 pcs', 'BO26/08MSTFE'],
    ['AND260016', 'Cham dama Mallorca 24 pcs', 'AND260016 3VT8489'],
  ]

  it('acierta 21/21 en Top-1 sobre el catálogo real', () => {
    for (const [raw, desc, esperado] of casos) {
      const res = buscarCandidatosEnCatalogo({ estilo_raw: raw, descripcion_raw: desc }, CATALOGO, 5)
      expect(res.top?.sku_base, `Falló Top-1 para ${raw}`).toBe(esperado)
    }
  })

  it('marca NR2509 - FUR, KU26/06HC y HT26/03HC como EXACTO en O(1) sin candidatos redundantes', () => {
    for (const [raw, esperado] of [
      ['NR2509 - FUR', 'NR2509-FUR'],
      ['KU26/06HC', 'KU26/06HC'],
      ['HT26/03HC', 'HT26/03HC'],
    ] as const) {
      const res = buscarCandidatosEnCatalogo({ estilo_raw: raw }, CATALOGO)
      expect(res.estado).toBe('EXACTO')
      expect(res.necesita_decider).toBe(false)
      expect(res.top?.sku_base).toBe(esperado)
      expect(res.top?.score).toBe(1)
      expect(res.top?.metodo).toBe('EXACTO')
      expect(res.candidatos).toHaveLength(1)
      expect(res.por_prefijo).toEqual([])
    }
  })

  it('marca J219 / 3CNC como AMBIGUO con necesita_decider=true y top=J219/3CAC + serie J219/', () => {
    const res = buscarCandidatosEnCatalogo({ estilo_raw: 'J219 / 3CNC', descripcion_raw: 'Cham cab Venado 25' }, CATALOGO)
    expect(res.estilo_compacto).toBe('J219/3CNC')
    expect(res.estado).toBe('AMBIGUO')
    expect(res.necesita_decider).toBe(true)
    expect(res.top?.sku_base).toBe('J219/3CAC')
    expect(res.por_prefijo[0]?.prefijo).toBe('J219/')
    expect(res.por_prefijo[0]?.total).toBeGreaterThanOrEqual(4)
  })

  it('resalta correctamente los índices de diferencia en calcularDiffIndices', () => {
    expect(calcularDiffIndices('AN0250009', 'AND250009')).toEqual([2])
    expect(calcularDiffIndices('J219/3CNC', 'J219/3CAC')).toEqual([7])
    expect(calcularDiffIndices('OE26/01', 'OE26/01MA')).toEqual([7, 8])
    expect(calcularDiffIndices('AND260018 3VT8703', 'AND260018 3VT8703')).toEqual([])
  })

  it('buscarEnCatalogoLocal rescata errores OCR cuando no hay substring exacto', () => {
    const hits = buscarEnCatalogoLocal('J219/3CNC', CATALOGO, 5)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].sku_base).toBe('J219/3CAC')
  })
})
