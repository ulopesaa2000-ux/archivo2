// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\catalogo-search.spec.ts
import { expect, test } from '@playwright/test'
import { hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'

test.describe('Catálogo - búsqueda parcial', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD.')

  test('busca por prefijo en vivo y confirma con botón o Enter', async ({ page }) => {
    await loginToAdmin(page, '/catalogo')
    await expect(page.getByRole('heading', { level: 1, name: /Catálogo/i })).toBeVisible()

    const firstProductLink = page.locator('a[href^="/catalogo/"]').first()
    await expect(firstProductLink).toBeVisible()
    const sku = (await firstProductLink.textContent())?.trim() ?? ''
    expect(sku.length).toBeGreaterThanOrEqual(2)

    const partial = sku.slice(0, Math.min(3, sku.length))
    const search = page.locator('#catalogo-search')

    await search.fill(partial)
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(partial)
    await expect(page.locator('a[href^="/catalogo/"]').filter({ hasText: new RegExp(partial, 'i') }).first()).toBeVisible()

    await search.fill(sku)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(sku)

    await search.fill(partial)
    await search.press('Enter')
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(partial)
  })
})
