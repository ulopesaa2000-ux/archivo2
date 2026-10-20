// tests/e2e/stock-historico.spec.ts
import { expect, test } from '@playwright/test'
import { hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'

/**
 * Stock Histórico — verificación en la app real contra los números de referencia
 * (verificados contra la BD el 2026-10-20):
 *   corte 2026-09-30 → 23,849.5 hoy / 21,783.5 al corte
 *   SAN MARTIN al corte → 9,531 cajas
 */
test.describe('Stock Histórico', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD.')

  test('muestra el stock al corte del 30-sep con los totales esperados', async ({ page }) => {
    // Login primero: el redirect de /login solo conserva el path, no el query string.
    await loginToAdmin(page, '/dashboard')
    await page.goto('/inventario/stock/historico?fecha=2026-09-30')

    await expect(page.getByRole('heading', { level: 1, name: /Stock Histórico/i })).toBeVisible()

    // Totales: HOY | AJUSTE | AL CORTE
    const pie = page.locator('tfoot tr').first()
    await expect(pie).toContainText('23,849.5', { timeout: 30_000 })
    await expect(pie).toContainText('21,783.5', { timeout: 30_000 })

    // Encabezado de la columna de corte (en la tabla principal)
    await expect(
      page.getByRole('columnheader', { name: /Al 2026-09-30/i }).last()
    ).toBeVisible()

    // Aviso de descuadre histórico (3 bodegas: DURAZNO, COCINA, RI&KA)
    await expect(page.getByText(/no cuadra con la suma de sus notas activas/i).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(/DURAZNO/).first()).toBeVisible()

    // No hay ajustes directos POSTERIORES al corte → no debe aparecer ese banner
    await expect(page.getByText(/ajuste directo fuera de notas después/i)).toHaveCount(0)
  })

  test('filtra por ciudad (SAN MARTIN → 9,531 cajas)', async ({ page }) => {
    await loginToAdmin(page, '/dashboard')
    await page.goto(
      '/inventario/stock/historico?fecha=2026-09-30&alcance=ciudad&ciudad=SAN%20MARTIN'
    )

    await expect(page.getByRole('heading', { level: 1, name: /Stock Histórico/i })).toBeVisible()

    const pie = page.locator('tfoot tr').first()
    await expect(pie).toContainText('9,531', { timeout: 30_000 })
  })

  test('la vista de movimientos muestra el kardex con saldo del periodo', async ({ page }) => {
    await loginToAdmin(page, '/dashboard')
    await page.goto('/inventario/stock/historico?vista=kardex&desde=2026-09-01&hasta=2026-09-30')

    await expect(page.getByRole('heading', { level: 1, name: /Stock Histórico/i })).toBeVisible()
    await expect(page.getByText('Saldo inicial')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Saldo al 2026-09-30')).toBeVisible({ timeout: 30_000 })

    // El saldo final del kardex debe igualar el stock al corte (21,783.5)
    await expect(page.getByText('21,783.5').first()).toBeVisible({ timeout: 30_000 })
  })

  test('el botón de Excel está disponible', async ({ page }) => {
    await loginToAdmin(page, '/dashboard')
    await page.goto('/inventario/stock/historico?fecha=2026-09-30')
    await expect(page.getByRole('button', { name: /Descargar Excel/i })).toBeVisible({
      timeout: 30_000,
    })
  })
})
