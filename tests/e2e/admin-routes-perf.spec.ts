// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\admin-routes-perf.spec.ts
/**
 * Mide tiempos de carga del panel admin: navegación + contenido listo (h1 o tab).
 * Requiere TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD en `.env` o `.env.local`
 * (Playwright carga esos archivos vía playwright.config).
 *
 * Opcional (rutas con [id]):
 *   TEST_CATALOGO_ID, TEST_ORDEN_B2B_ID, TEST_CONTENEDOR_ID, TEST_NOTA_ID
 *
 * Ejecutar: npx playwright test tests/e2e/admin-routes-perf.spec.ts
 */
import { expect, test, type Page } from '@playwright/test'
import { allAdminRoutesForPerf, type Ready } from './fixtures/admin-routes'
import { hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'

function readyLocator(page: Page, ready: Ready) {
  if (ready.type === 'h1') {
    return page.getByRole('heading', { level: 1, name: ready.name })
  }
  if (ready.type === 'tab') {
    return page.getByRole('tab', { name: ready.name })
  }
  return page
    .getByRole('heading', { level: 1, name: ready.h1 })
    .or(page.getByText(ready.text))
}

test.describe('Admin - tiempos de carga por ruta', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD.')

  test('medir ms hasta contenido (estático + dinámico si hay IDs)', async ({ page, baseURL }, testInfo) => {
    await loginToAdmin(page, '/dashboard')
    const origin = baseURL?.replace(/\/$/, '') ?? ''

    const results: { path: string; ms: number }[] = []
    for (const def of allAdminRoutesForPerf()) {
      const label = def.path
      const timeout = def.timeoutMs ?? 45_000
      await test.step(label, async () => {
        const t0 = Date.now()
        await page.goto(`${origin}${def.path}`, { waitUntil: 'load' })
        await expect(readyLocator(page, def.ready).first()).toBeVisible({ timeout })
        const ms = Date.now() - t0
        results.push({ path: def.path, ms })
        await testInfo.attach(`perf-${def.path.replace(/\//g, '_')}`, {
          body: `${ms} ms — ${def.path}`,
          contentType: 'text/plain',
        })
      })
    }

    const summary = results.map((r) => `${r.path}\t${r.ms}ms`).join('\n')
    const maxMs = results.length ? Math.max(...results.map((r) => r.ms)) : 0
    const avgMs = results.length
      ? Math.round(results.reduce((a, b) => a + b.ms, 0) / results.length)
      : 0
    await testInfo.attach('admin-routes-perf-summary', {
      body: `path\tms\n${summary}\n\nmax\t${maxMs}ms\navg\t${avgMs}ms`,
      contentType: 'text/plain',
    })
    console.log('[admin-routes-perf]\n' + summary)
    console.log(`[admin-routes-perf] max=${maxMs}ms avg=${avgMs}ms`)
  })
})
