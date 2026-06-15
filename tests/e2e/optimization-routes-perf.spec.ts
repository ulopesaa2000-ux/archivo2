// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\optimization-routes-perf.spec.ts
import { expect, test, type Page } from '@playwright/test'
import { hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'

type Ready =
  | { type: 'h1'; name: RegExp }
  | { type: 'tab'; name: RegExp }
  | { type: 'h1OrText'; h1: RegExp; text: RegExp }

type PerfRoute = {
  path: string
  label: string
  ready: Ready
  timeoutMs?: number
}

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

const OPTIMIZED_ADMIN_ROUTES: PerfRoute[] = [
  {
    path: '/inventario/stock',
    label: 'inventario-stock',
    ready: {
      type: 'h1OrText',
      h1: /Stock (Consolidado|por Bodega)/,
      text: /Selecciona una bodega en el header|Sin bodegas asignadas/i,
    },
    timeoutMs: 120_000,
  },
  {
    path: '/inventario/bodegas',
    label: 'inventario-bodegas',
    ready: { type: 'h1', name: /^Bodegas$/ },
    timeoutMs: 120_000,
  },
  {
    path: '/inventario-virtual',
    label: 'inventario-virtual',
    ready: { type: 'h1', name: /Bodegas Virtuales/i },
    timeoutMs: 120_000,
  },
  {
    path: '/ecommerce/productos-web',
    label: 'productos-web',
    ready: { type: 'h1', name: /Catálogo Web/i },
    timeoutMs: 120_000,
  },
]

if (process.env.TEST_CATALOGO_ID) {
  OPTIMIZED_ADMIN_ROUTES.push({
    path: `/catalogo/${process.env.TEST_CATALOGO_ID}`,
    label: 'catalogo-detalle',
    ready: { type: 'tab', name: /^Catálogos$/ },
    timeoutMs: 120_000,
  })
}

test.describe('Optimization routes perf smoke', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD.')

  test('measures optimized admin routes until first ready content', async ({ page, baseURL }, testInfo) => {
    await loginToAdmin(page, '/dashboard')
    const origin = baseURL?.replace(/\/$/, '') ?? ''

    const results: { label: string; path: string; ms: number }[] = []

    for (const route of OPTIMIZED_ADMIN_ROUTES) {
      await test.step(route.label, async () => {
        const t0 = Date.now()
        await page.goto(`${origin}${route.path}`, { waitUntil: 'load' })
        await expect(readyLocator(page, route.ready).first()).toBeVisible({
          timeout: route.timeoutMs ?? 45_000,
        })
        const ms = Date.now() - t0
        results.push({ label: route.label, path: route.path, ms })
      })
    }

    const summary = results
      .map((result) => `${result.label}\t${result.path}\t${result.ms}ms`)
      .join('\n')

    await testInfo.attach('optimization-routes-perf-summary', {
      body: `label\tpath\tms\n${summary}`,
      contentType: 'text/plain',
    })
  })
})
