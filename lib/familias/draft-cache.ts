// C:\Users\uriel\Downloads\enero 26\archivo2\lib\familias\draft-cache.ts
// Caché temporal efímera (AGENTS.md 3.7.5) para Familias: bandeja de reasignación
// (pendiente de mover) y borrador de cambios (pendiente de guardar en BD).
// Solo vive en el navegador; se limpia al guardar en BD o al olvidar.

export interface BandejaSnapshotItem {
  id: number
  sku_base: string
  descripcion: string | null
  familia: string | null
}

export interface BandejaCache {
  ids: number[]
  snapshot: BandejaSnapshotItem[]
  updatedAt: string
}

export interface BorradorCache {
  stagedMoves: Record<number, string>
  stagedRenames: Record<string, string>
  draftFamilies: string[]
  updatedAt: string
}

const BANDEJA_KEY = 'inv-tienda:familias-bandeja:v1'
const BORRADOR_KEY = 'inv-tienda:familias-borrador:v1'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Cuota llena o storage bloqueado: se ignora, el estado en memoria sigue mandando.
  }
}

function removeKey(key: string): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // noop
  }
}

function cleanMoves(input: unknown): Record<number, string> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<number, string> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const id = parseInt(k, 10)
    if (Number.isFinite(id) && typeof v === 'string' && v.trim() !== '') out[id] = v
  }
  return out
}

function cleanRenames(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (k && typeof v === 'string' && v.trim() !== '' && v !== k) out[k] = v
  }
  return out
}

function cleanIds(input: unknown): number[] {
  if (!Array.isArray(input)) return []
  const nums = input.map((n) => (typeof n === 'number' ? n : parseInt(String(n), 10)))
  return Array.from(new Set(nums.filter((n) => Number.isFinite(n))))
}

function cleanDraftFamilies(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input.filter((d): d is string => typeof d === 'string' && d.trim() !== '')
}

function cleanSnapshot(input: unknown): BandejaSnapshotItem[] {
  if (!Array.isArray(input)) return []
  return (input as unknown[]).filter(
    (s): s is BandejaSnapshotItem =>
      !!s &&
      typeof (s as BandejaSnapshotItem).id === 'number' &&
      Number.isFinite((s as BandejaSnapshotItem).id) &&
      typeof (s as BandejaSnapshotItem).sku_base === 'string',
  ) as BandejaSnapshotItem[]
}

export function loadBandejaCache(): BandejaCache | null {
  const raw = readJson<Partial<BandejaCache>>(BANDEJA_KEY)
  if (!raw) return null
  const ids = cleanIds(raw.ids)
  if (ids.length === 0) return null
  return {
    ids,
    snapshot: cleanSnapshot(raw.snapshot),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
  }
}

export function saveBandejaCache(data: { ids: number[]; snapshot: BandejaSnapshotItem[] }): void {
  const ids = cleanIds(data.ids)
  writeJson(BANDEJA_KEY, {
    ids,
    snapshot: cleanSnapshot(data.snapshot).filter((s) => ids.includes(s.id)),
    updatedAt: new Date().toISOString(),
  })
}

export function clearBandejaCache(): void {
  removeKey(BANDEJA_KEY)
}

export function loadBorradorCache(): BorradorCache | null {
  const raw = readJson<Partial<BorradorCache>>(BORRADOR_KEY)
  if (!raw) return null
  const stagedMoves = cleanMoves(raw.stagedMoves)
  const stagedRenames = cleanRenames(raw.stagedRenames)
  const draftFamilies = cleanDraftFamilies(raw.draftFamilies)
  if (Object.keys(stagedMoves).length === 0 && Object.keys(stagedRenames).length === 0 && draftFamilies.length === 0) {
    return null
  }
  return {
    stagedMoves,
    stagedRenames,
    draftFamilies,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
  }
}

export function saveBorradorCache(data: {
  stagedMoves: Record<number, string>
  stagedRenames: Record<string, string>
  draftFamilies: string[]
}): void {
  writeJson(BORRADOR_KEY, {
    stagedMoves: cleanMoves(data.stagedMoves),
    stagedRenames: cleanRenames(data.stagedRenames),
    draftFamilies: cleanDraftFamilies(data.draftFamilies),
    updatedAt: new Date().toISOString(),
  })
}

export function clearBorradorCache(): void {
  removeKey(BORRADOR_KEY)
}
