// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\cajas.spec.ts
import { expect, test } from '@playwright/test'
import { hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'
import { firstDataRow, selectNthOption, selectOption, waitForSearchParam, waitForSearchParamToClear } from './helpers/ui'

test.describe('Fase 5 - Cajas', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para ejecutar esta suite.')

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page, '/ordenes-b2b/cajas')
    await expect(page.getByRole('heading', { name: /Cajas de Producto/i })).toBeVisible()
  })

  test('lista: filtrar y abrir Sheet lazy sin cambiar URL', async ({ page }) => {
    const initialUrl = page.url()
    const row = await firstDataRow(page)
    await expect(row).toBeVisible()

    const code = (await row.locator('td').nth(0).textContent())?.trim()
    test.skip(!code, 'No hay cajas disponibles para filtrar.')

    await page.getByPlaceholder(/Buscar código de caja/i).fill(code!)
    await waitForSearchParam(page, 'q', code!)
    await expect(page.locator('table tbody')).toContainText(code!)

    await page.getByRole('button', { name: /Limpiar/i }).click()
    await waitForSearchParamToClear(page, 'q')

    const detailResponse = page.waitForResponse((response) =>
      response.url().includes('/api/ordenes-b2b/caja-detalle') && response.ok()
    )
    await page.getByTitle(/Ver caja/i).first().click()
    await detailResponse

    await expect(page.getByRole('heading', { name: 'Detalle de Caja' })).toBeVisible()
    await expect(page).toHaveURL(initialUrl)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Detalle de Caja' })).toHaveCount(0)
  })

  test('filtros de proveedor y año actualizan URL sin romper la tabla', async ({ page }) => {
    const providerName = await selectNthOption(page.getByRole('combobox').nth(0))
    test.skip(!providerName, 'No hay proveedores disponibles para filtrar cajas.')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('proveedor_id'))
      .not.toBeNull()

    await selectOption(page.getByRole('combobox').nth(1), '2026')
    await expect.poll(() => page.url()).toContain('2026')
    await expect(page.locator('table')).toBeVisible()
  })
})
