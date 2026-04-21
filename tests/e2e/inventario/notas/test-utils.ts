// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\inventario\notas\test-utils.ts
import { expect, type Locator, type Page } from '@playwright/test'

export const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@test.com'
export const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'leiru051200'
export const TEST_BODEGA_ID = parseInt(process.env.TEST_BODEGA_ID ?? '9', 10)
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

export async function navigateToNotas(page: Page) {
  // Ir a dashboard primero para establecer sesión
  await page.goto(BASE_URL + '/dashboard')
  await page.waitForTimeout(2000)

  // Si estamos en login, hacer login
  if (page.url().includes('/login') || page.locator('input[name="email"]').isVisible()) {
    await page.locator('#email').fill(TEST_ADMIN_EMAIL)
    await page.locator('#password').fill(TEST_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
    // Esperar a que no estemos en login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  }

  // Ahora navegar a inventario/notas
  await page.goto(BASE_URL + '/inventario/notas')

  // Esperar a que cargue el heading
  await expect(page.getByRole('heading', { name: /Notas de Inventario/i })).toBeVisible({ timeout: 15000 })
}

export async function openCreateNotaSheet(page: Page) {
  await page.getByRole('button', { name: /Nueva Nota/i }).click()
  await expect(page.getByRole('heading', { name: /Nueva Nota de Inventario/i })).toBeVisible({ timeout: 10000 })
}

export async function selectNotaTipo(page: Page, tipo: 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA') {
  // Encontrar el combobox de Tipo de Movimiento (primer combobox en el main)
  const comboBox = page.locator('main').locator('[role="combobox"]').first()
  
  await comboBox.click()
  await page.waitForTimeout(500)
  await page.getByRole('option', { name: new RegExp(tipo, 'i') }).click()
}

export async function selectBodega(page: Page, bodegaId: number) {
  const selectTrigger = page.locator('label:has-text("Bodega Origen")').locator('xpath=../').locator('[role="combobox"]').first()
  await selectTrigger.click()
  await page.getByRole('option', { name: new RegExp(bodegaId.toString(), 'i') }).click()
}

export async function addProductoToNota(page: Page, searchTerm: string, cantidad: number) {
  const searchInput = page.getByPlaceholder(/Buscar por SKU/)
  await searchInput.fill(searchTerm)
  await page.waitForTimeout(500)
  await page.getByRole('option').first().click()
  
  // Llenar cantidad si hay campo
  const cantidadInput = page.getByLabel(/Cantidad/)
  if (await cantidadInput.isVisible()) {
    await cantidadInput.fill(cantidad.toString())
  }
}

export async function submitNota(page: Page) {
  await page.getByRole('button', { name: /Confirmar/i }).click()
}

export async function waitForNotaCreated(page: Page) {
  // Esperar mensaje de éxito o redirect
  await page.waitForTimeout(2000)
}

export async function getFirstNotaRow(page: Page) {
  return page.locator('table tbody tr').first()
}

export async function openNotaDetail(page: Page, row: Locator) {
  const viewButton = row.getByRole('button', { name: /Ver detalle/i })
  await viewButton.click()
  await expect(page.getByRole('heading', { name: /Detalle de Nota/i })).toBeVisible()
}

export async function deleteNota(page: Page, row: Locator) {
  const deleteButton = row.getByRole('button', { name: /Eliminar/i })
  await deleteButton.click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: /Confirmar/i }).click()
  await page.waitForTimeout(2000)
}

export async function confirmDeleteNota(page: Page) {
  await page.getByRole('button', { name: /Confirmar/i }).click()
}

export function getNotaTipoLabel(tipo: string) {
  const labels: Record<string, string> = {
    ENTRADA: 'Entrada',
    SALIDA: 'Salida',
    TRANSFERENCIA: 'Transferencia',
  }
  return labels[tipo] ?? tipo
}