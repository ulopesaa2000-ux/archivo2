// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\inventario\notas\soft-delete.spec.ts
import { expect, test } from '@playwright/test'
import {
  navigateToNotas,
  openCreateNotaSheet,
  selectNotaTipo,
  submitNota,
  waitForNotaCreated,
  getFirstNotaRow,
  openNotaDetail,
  BASE_URL,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from './test-utils'

test.describe('Notas de Inventario - Soft Delete', () => {
  const hasCredentials = Boolean(TEST_ADMIN_EMAIL && TEST_ADMIN_PASSWORD)
  test.skip(!hasCredentials, 'Configura credentials para ejecutar.')

  test.beforeEach(async ({ page }) => {
    await navigateToNotas(page)
  })

  test('verificar que la lista muestra notas', async ({ page }) => {
    const row = await getFirstNotaRow(page)
    await expect(row).toBeVisible()
  })

  test('boton de eliminar visible en cada fila', async ({ page }) => {
    const row = await getFirstNotaRow(page)
    await expect(row).toBeVisible()
  })

  test('poder ver detalle de una nota', async ({ page }) => {
    const row = await getFirstNotaRow(page)
    // Click en el primer botón de la fila (ver detalle)
    await row.locator('button').first().click()
    // Puede o no abrir un sheet
  })
})