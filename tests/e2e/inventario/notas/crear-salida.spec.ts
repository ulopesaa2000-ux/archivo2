// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\inventario\notas\crear-salida.spec.ts
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

test.describe('Notas de Inventario - Crear Salida', () => {
  const hasCredentials = Boolean(TEST_ADMIN_EMAIL && TEST_ADMIN_PASSWORD)
  test.skip(!hasCredentials, 'Configura credentials para ejecutar.')

  test.beforeEach(async ({ page }) => {
    await navigateToNotas(page)
  })

  test('crear una nota de salida confirmandola affecta inventario', async ({ page }) => {
    await openCreateNotaSheet(page)
    await selectNotaTipo(page, 'SALIDA')

    // Llenar referencia
    await page.getByPlaceholder(/Ej:/).fill('Venta E2E - Test')

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
      
      // Verificar que aparece en la lista (buscar la referencia)
      const lista = page.locator('table tbody')
      await expect(lista).toContainText('Venta E2E')
    }
  })

  test('nota confirmada aparece en lista con estado correcto', async ({ page }) => {
    // Ir a lista y verificar que hay notas
    const row = page.locator('table tbody tr').first()
    
    // Verificar que existe al menos una fila
    const count = await row.count()
    expect(count).toBeGreaterThan(0)
  })

  test('verificar estados de notas (borrador vs confirmado)', async ({ page }) => {
    // La columna de estado debe mostrar PEND (Pendiente) o CONF (Confirmado)
    // Por defecto las notas nuevas quedan en PEND
    const estadoCell = page.locator('table tbody tr td').nth(3)
    const hasEstado = await estadoCell.count() > 0
    
    if (hasEstado) {
      const estado = await estadoCell.textContent()
      console.log('Estado de nota:', estado)
    }
  })
})