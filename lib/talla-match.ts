// C:\Users\uriel\Downloads\enero 26\archivo2\lib\talla-match.ts
// Unica fuente de verdad para normalizar codigos de talla US/ES -> codigo MX
// (ECH, CH, M, G, EG, 2EG...UNITALLA y tallas dobles CH-M, M-G, G-EG, EG-2EG).
// Reemplaza los mapas divergentes en CajaCard, modules/cajas/actions y
// modules/ordenes-b2b/actions (estos ultimos convergen despues).

const TALLA_MAP: Record<string, string> = {
  XS: 'ECH', 'EXTRA SMALL': 'ECH', ECH: 'ECH', EXCH: 'ECH',
  S: 'CH', SMALL: 'CH', CH: 'CH', 'CH/S': 'CH', 'S/CH': 'CH',
  M: 'M', MEDIUM: 'M', 'M/M': 'M',
  L: 'G', LARGE: 'G', G: 'G', 'G/L': 'G', 'L/G': 'G',
  XL: 'EG', 'EXTRA LARGE': 'EG', EG: 'EG', XG: 'EG', 'EG/XL': 'EG', 'XL/EG': 'EG',
  '1X': 'EG', '1XL': 'EG', '1XG': 'EG', '1EG': 'EG',
  '2XL': '2EG', XXL: '2EG', '2X EXTRA GRANDE': '2EG', '2X': '2EG', '2XG': '2EG', '2EG': '2EG', EEG: '2EG', 'XXL/2EG': '2EG',
  '3XL': '3EG', XXXL: '3EG', '3X EXTRA GRANDE': '3EG', '3X': '3EG', '3EG': '3EG',
  '4XL': '4EG', XXXXL: '4EG', '4X EXTRA GRANDE': '4EG', '4X': '4EG', '4EG': '4EG',
  '5XL': '5EG', '5X EXTRA GRANDE': '5EG', '5EG': '5EG',
  OS: 'UNITALLA', 'ONE SIZE': 'UNITALLA', ONESIZE: 'UNITALLA', UNITALLA: 'UNITALLA',
  'CH-M': 'CH-M', 'CH/M': 'CH-M', 'S-M': 'CH-M', 'S/M': 'CH-M', SM: 'CH-M', CHM: 'CH-M',
  'M-G': 'M-G', 'M/G': 'M-G', 'M-L': 'M-G', 'M/L': 'M-G', ML: 'M-G', MG: 'M-G',
  'G-EG': 'G-EG', 'G/EG': 'G-EG', 'L-XL': 'G-EG', 'L/XL': 'G-EG', LXL: 'G-EG', GEG: 'G-EG', 'G-XG': 'G-EG', 'G/XG': 'G-EG',
  'EG-2EG': 'EG-2EG', 'EG/2EG': 'EG-2EG', 'XL-2XL': 'EG-2EG', 'XL/2XL': 'EG-2EG', 'XL-XXL': 'EG-2EG', 'XL/XXL': 'EG-2EG',
}

/** Normaliza un codigo de talla a su equivalente MX. Sin match, devuelve el TRIM upper. */
export function standardizeTallaCode(rawTalla: string): string {
  if (!rawTalla) return ''
  const trimmed = String(rawTalla).trim().toUpperCase().replace(/\s+/g, ' ')
  return TALLA_MAP[trimmed] || TALLA_MAP[trimmed.replace(/\s+/g, '')] || trimmed
}
