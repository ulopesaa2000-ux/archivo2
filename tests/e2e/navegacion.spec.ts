// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\navegacion.spec.ts
import { expect, test } from '@playwright/test'
import { hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'

test.describe('Fase 5 - Navegación y shell', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para ejecutar esta suite.')

  test('navegar entre contenedores, órdenes y cajas mantiene shell y URL estable en sheet', async ({ page }) => {
    await loginToAdmin(page, '/contenedores')

    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(page.getByText('inv-tienda')).toBeVisible()

    const shellMarker = await header.evaluate((node) => node.outerHTML)

    await page.getByRole('link', { name: 'Órdenes B2B' }).click()
    await expect(page).toHaveURL(/\/ordenes-b2b$/)
    await expect(header).toBeVisible()

    await page.goto('/ordenes-b2b/cajas')
    await expect(page).toHaveURL(/\/ordenes-b2b\/cajas$/)
    await expect(header).toBeVisible()

    const currentUrl = page.url()
    const firstOpen = page.getByTitle(/Ver caja/i).first()
    test.skip(await firstOpen.count() === 0, 'No hay cajas para validar el Sheet lateral.')
    await firstOpen.click()
    await expect(page.getByRole('heading', { name: 'Detalle de Caja' })).toBeVisible()
    await expect(page).toHaveURL(currentUrl)

    const shellMarkerAfter = await header.evaluate((node) => node.outerHTML)
    expect(shellMarkerAfter).toContain('inv-tienda')
    expect(shellMarker).toContain('inv-tienda')
  })
})
