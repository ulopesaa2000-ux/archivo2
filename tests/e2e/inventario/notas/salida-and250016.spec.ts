// Test específico para crear SALIDA de AND250016
import { test, expect } from '@playwright/test'
import {
  navigateToNotas,
  openCreateNotaSheet,
  selectNotaTipo,
  BASE_URL,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from './test-utils'

// Código del producto a dar salida
const CODIGO_PRODUCTO = 'AND250016'

test.describe('Crear SALIDA para AND250016', () => {
  const hasCredentials = Boolean(TEST_ADMIN_EMAIL && TEST_ADMIN_PASSWORD)
  test.skip(!hasCredentials, 'Configura credenciales para ejecutar.')

  test('crear salida de una caja AND250016', async ({ page }) => {
    // 1. Ir a notas de inventario
    await navigateToNotas(page)

    // 2. Abrir formulario nueva nota
    await openCreateNotaSheet(page)

    // 3. Seleccionar tipo SALIDA
    await selectNotaTipo(page, 'SALIDA')

    // 4. Llenar referencia
    await page.getByPlaceholder(/Ej:/).fill(`SALIDA ${CODIGO_PRODUCTO} - Test E2E`)

    // 5. Buscar el producto
    await page.getByPlaceholder(/Buscar por SKU/).fill(CODIGO_PRODUCTO)
    await page.waitForTimeout(1500)

    // 6. Seleccionar del dropdown
    const dropdown = page.locator('[role="listbox"]')
    if (await dropdown.isVisible()) {
      await page.locator('[role="option"]').first().click()
      await page.waitForTimeout(1000)
    }

    // 7. Confirmar la nota
    const confirmarBtn = page.getByRole('button', { name: /Confirmar/i })
    if (await confirmarBtn.isEnabled()) {
      await confirmarBtn.click()
      await page.waitForTimeout(3000)

      // 8. Verificar que se creó
      await expect(page).toHaveURL(/\/inventario\/notas/)
      const lista = page.locator('table tbody')
      await expect(lista).toContainText(CODIGO_PRODUCTO)
      
      console.log(`✅ SALIDA creada para ${CODIGO_PRODUCTO}`)
    }
  })
})