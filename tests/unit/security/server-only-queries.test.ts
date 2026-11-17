// tests/unit/security/server-only-queries.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../../..')
const MODULES_DIR = path.join(ROOT, 'modules')

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(full))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(full)
    }
  }
  return files
}

describe('Guard anti-regresión: queries.ts server-only y superficie RPC pública', () => {
  const allModuleFiles = walkFiles(MODULES_DIR)

  it('ningún queries.ts ni trazabilidad.ts en modules/ puede tener "use server"', () => {
    const queryFiles = allModuleFiles.filter((f) => {
      const base = path.basename(f)
      return base === 'queries.ts' || base.endsWith('-queries.ts') || base === 'trazabilidad.ts'
    })

    expect(queryFiles.length).toBeGreaterThanOrEqual(13)

    for (const file of queryFiles) {
      const content = fs.readFileSync(file, 'utf8')
      const rel = path.relative(ROOT, file)
      expect(content, `${rel} no debe usar 'use server'`).not.toMatch(/^\s*['"]use server['"]/m)
      expect(content, `${rel} debe importar 'server-only'`).toMatch(/import\s+['"]server-only['"]/)
    }
  })

  it('ningún archivo "use server" puede usar export *', () => {
    for (const file of allModuleFiles) {
      const content = fs.readFileSync(file, 'utf8')
      if (/^\s*['"]use server['"]/m.test(content)) {
        const rel = path.relative(ROOT, file)
        expect(content, `${rel} no debe usar export *`).not.toMatch(/^\s*export\s+\*\s+from\s+/m)
      }
    }
  })

  it('modules/ecommerce/actions/public-reads.ts solo expone la lista blanca pública', () => {
    const publicReadsPath = path.join(MODULES_DIR, 'ecommerce/actions/public-reads.ts')
    const content = fs.readFileSync(publicReadsPath, 'utf8')
    const matches = [...content.matchAll(/export\s+async\s+function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1])
    expect(matches.sort()).toEqual([
      'publicBuscarOrdenInvitadoAction',
      'publicFetchProductosFavoritosAction',
      'publicFetchProductosWebByIdsAction',
    ])
  })
})
