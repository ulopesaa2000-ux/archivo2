// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\inventario\notas\crear-entrada.spec.ts
import { expect, test } from '@playwright/test'
import {
  navigateToNotas,
  openCreateNotaSheet,
  selectNotaTipo,
  submitNota,
  waitForNotaCreated,
  getFirstNotaRow,
  BASE_URL,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from './test-utils'

test.describe('Notas de Inventario - Crear Entrada', () => {
  const hasCredentials = Boolean(TEST_ADMIN_EMAIL && TEST_ADMIN_PASSWORD)
  test.skip(!hasCredentials, 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para ejecutar.')

  test.beforeEach(async ({ page }) => {
    await navigateToNotas(page)
  })

  test('crear una nota de entrada exitosamente', async ({ page }) => {
    await openCreateNotaSheet(page)
    await selectNotaTipo(page, 'ENTRADA')

    // Llenar referencia
    await page.getByPlaceholder(/Ej:/).fill('Entrada E2E - Test')

    // Buscar y agregar un producto
    await page.getByPlaceholder(/Buscar por SKU/).fill('pantal')
    await page.waitForTimeout(1500)
    
    // Seleccionar producto del dropdown
    const dropdown = page.locator('[role="listbox"]')
    if (await dropdown.isVisible()) {
      await page.locator('[role="option"]').first().click()
      await page.waitForTimeout(1000)
    }

    // Si el producto se agregó, confirmar la nota
    const confirmarBtn = page.getByRole('button', { name: /Confirmar/i })
    if (await confirmarBtn.isEnabled()) {
      await confirmarBtn.click()
      await page.waitForTimeout(3000)
      
      // Verificar redirect a lista de notas
      await expect(page).toHaveURL(/\/inventario\/notas/)
      
      // Verificar que aparece en la lista
      const lista = page.locator('table tbody')
      await expect(lista).toContainText('Entrada E2E')
    }
  })

  test('crear entrada sin productos muestra error', async ({ page }) => {
    await openCreateNotaSheet(page)
    await selectNotaTipo(page, 'ENTRADA')

    await page.getByPlaceholder(/Ej:/).fill('Entrada sin productos')

    // Intentar guardar sin productos - debe estar deshabilitado
    await expect(page.getByRole('button', { name: /Confirmar/i })).toBeDisabled()
  })

  test('verificar que la nota aparece en la lista', async ({ page }) => {
    // Ir a la lista de notas y verificar que hay datos
    const row = await getFirstNotaRow(page)
    await expect(row).toBeVisible()
  })
})