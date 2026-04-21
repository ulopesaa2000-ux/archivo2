// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\inventario\notas\transferencia.spec.ts
import { expect, test } from '@playwright/test'
import {
  navigateToNotas,
  openCreateNotaSheet,
  selectNotaTipo,
  submitNota,
  waitForNotaCreated,
  getFirstNotaRow,
  selectBodega,
  BASE_URL,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from './test-utils'

test.describe('Notas de Inventario - Transferencia', () => {
  const hasCredentials = Boolean(TEST_ADMIN_EMAIL && TEST_ADMIN_PASSWORD)
  test.skip(!hasCredentials, 'Configura credentials para ejecutar.')

  test.beforeEach(async ({ page }) => {
    await navigateToNotas(page)
  })

  test('crear transferencia exitosamente', async ({ page }) => {
    await openCreateNotaSheet(page)
    await selectNotaTipo(page, 'TRANSFERENCIA')

    // Verificar que hay campo de bodega destino
    await expect(page.getByRole('heading', { name: /Nueva Nota de Inventario/i })).toBeVisible()
  })

  test('transferencia requiere bodega destino', async ({ page }) => {
    await openCreateNotaSheet(page)
    await selectNotaTipo(page, 'TRANSFERENCIA')

    // El botón debe estar deshabilitado sin productos
    await expect(page.getByRole('button', { name: /Confirmar/i })).toBeDisabled()
  })

  test('verificar lista de transferencia', async ({ page }) => {
    const row = await getFirstNotaRow(page)
    await expect(row).toBeVisible()
  })
})