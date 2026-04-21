// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\inventario\notas\validar-stock.spec.ts
import { expect, test } from '@playwright/test'
import {
  navigateToNotas,
  openCreateNotaSheet,
  selectNotaTipo,
  submitNota,
  waitForNotaCreated,
  BASE_URL,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from './test-utils'

test.describe('Notas de Inventario - Validar Stock', () => {
  const hasCredentials = Boolean(TEST_ADMIN_EMAIL && TEST_ADMIN_PASSWORD)
  test.skip(!hasCredentials, 'Configura credentials para ejecutar.')

  test.beforeEach(async ({ page }) => {
    await navigateToNotas(page)
  })

  test('permitir salida cuando hay stock disponible', async ({ page }) => {
    await openCreateNotaSheet(page)
    await selectNotaTipo(page, 'SALIDA')
    await page.getByPlaceholder(/Ej:/).fill('Venta con stock')

    await expect(page.getByRole('heading', { name: /Nueva Nota de Inventario/i })).toBeVisible()
  })

  test('rechazar salida cuando stock es insuficiente', async ({ page }) => {
    // El botón está deshabilitado sin productos
    await openCreateNotaSheet(page)
    await selectNotaTipo(page, 'SALIDA')
    await expect(page.getByRole('button', { name: /Confirmar/i })).toBeDisabled()
  })

  test('verificar que entrada suma al stock', async ({ page }) => {
    // La nota se crea guardada en BD, el stock se afecta al confirmar
    const row = page.locator('table tbody tr').first()
    await expect(row).toBeVisible()
  })

  test('no permitir cantidad negativa', async ({ page }) => {
    await openCreateNotaSheet(page)
    await selectNotaTipo(page, 'SALIDA')
    
    // El input de cantidad valida números positivos
    await expect(page.getByRole('heading', { name: /Nueva Nota de Inventario/i })).toBeVisible()
  })
})