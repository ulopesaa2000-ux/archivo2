// tests/e2e/stock-historico.spec.ts
import { expect, test, type Page } from '@playwright/test'
import { hasAuthCredentials } from './fixtures/env'
import { loginToAdmin } from './helpers/auth'

/**
 * Stock Histórico — verificación en la app real.
 *
 * Los asserts son INVARIANTES (relaciones que siempre se cumplen), no números
 * fijos: la base de datos es viva y confirma notas a diario, así que un total
 * absoluto se volvería obsoleto al día siguiente.
 */

/**
 * Espera a que React hidratee el componente de filtros.
 * Sin esto, un `fill()` puede ejecutarse antes del hydrate y el `onChange`
 * se pierde (el input controlado vuelve al valor del servidor).
 */
async function esperarHidratacion(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#hist-fecha') as (HTMLElement & Record<string, unknown>) | null
      if (!el) return false
      return Object.keys(el).some((k) => k.startsWith('__react'))
    },
    { timeout: 30_000 }
  )
}

/** Lee un número del texto de una celda ("23,849.5" → 23849.5). */
function parsearNumero(txt: string): number {
  return Number((txt || '').replace(/[^\d.,-]/g, '').replace(/,/g, ''))
}

async function leerTotales(page: Page) {
  const tabla = page.locator('table[data-testid^="tabla-historico"]')
  const hoy = await tabla.locator('[data-testid="total-hoy"]').innerText()
  const ajuste = await tabla.locator('[data-testid="total-ajuste"]').innerText()
  const corte = await tabla.locator('[data-testid="total-corte"]').innerText()
  return {
    hoy: parsearNumero(hoy),
    ajuste: parsearNumero(ajuste),
    corte: parsearNumero(corte),
  }
}

test.describe('Stock Histórico', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD.')

  test('muestra el stock al corte con totales consistentes', async ({ page }) => {
    // Login primero: el redirect de /login solo conserva el path, no el query string.
    await loginToAdmin(page, '/dashboard')
    await page.goto('/inventario/stock/historico?fecha=2026-09-30')

    await expect(page.getByRole('heading', { level: 1, name: /Stock Histórico/i })).toBeVisible()

    const t = await leerTotales(page)
    expect(t.hoy).toBeGreaterThan(0)
    // Invariante: hoy + ajuste = al corte
    expect(t.corte).toBeCloseTo(t.hoy + t.ajuste, 1)

    // Encabezado de la columna de corte (en la tabla principal)
    await expect(
      page.getByRole('columnheader', { name: /Al 2026-09-30/i }).last()
    ).toBeVisible()

    // Aviso de descuadre histórico (bodegas donde el stock no cuadra con las notas)
    await expect(page.getByText(/no cuadra con la suma de sus notas activas/i).first()).toBeVisible({
      timeout: 30_000,
    })
  })

  test('la vista de movimientos muestra el kardex con saldo del periodo', async ({ page }) => {
    await loginToAdmin(page, '/dashboard')
    await page.goto('/inventario/stock/historico?vista=kardex&desde=2026-09-01&hasta=2026-09-30')

    await expect(page.getByRole('heading', { level: 1, name: /Stock Histórico/i })).toBeVisible()
    await expect(page.getByText('Saldo inicial')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Saldo al 2026-09-30')).toBeVisible({ timeout: 30_000 })
  })

  test('el botón Impresión / Reporte está disponible', async ({ page }) => {
    await loginToAdmin(page, '/dashboard')
    await page.goto('/inventario/stock/historico?fecha=2026-09-30')
    await expect(page.getByRole('button', { name: /Impres/i }).first()).toBeVisible({
      timeout: 30_000,
    })
  })
})

/**
 * Interacción real de los filtros (clic en los controles, no URL directa).
 * Regresión del bug: los cambios de URL encadenados se pisaban entre sí y la
 * fecha/alcance se perdían (la página volvía al 30-sep).
 */
test.describe('Stock Histórico — filtros (interacción)', () => {
  test.skip(!hasAuthCredentials(), 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD.')

  const abrir = async (page: Page) => {
    await loginToAdmin(page, '/dashboard')
    await page.goto('/inventario/stock/historico')
    await expect(page.getByRole('heading', { level: 1, name: /Stock Histórico/i })).toBeVisible({
      timeout: 60_000,
    })
    await esperarHidratacion(page)
  }

  test('cambiar la fecha de corte actualiza la URL y los totales', async ({ page }) => {
    await abrir(page)

    // Leer ANTES de cambiar (si no, el poll compara contra el valor nuevo)
    const antes = await leerTotales(page)

    const input = page.locator('#hist-fecha')
    await input.fill('2026-08-31')

    // La URL debe llevar la fecha (no solo `hasta`)
    await expect
      .poll(() => new URL(page.url()).searchParams.get('fecha'), { timeout: 20_000 })
      .toBe('2026-08-31')

    // El input NO debe revertirse al 30-sep mientras carga
    await expect(input).toHaveValue('2026-08-31', { timeout: 20_000 })

    // Y la tabla debe recalcular: el total al corte cambia
    await expect
      .poll(async () => (await leerTotales(page)).corte, { timeout: 60_000 })
      .not.toBe(antes.corte)
  })

  test('elegir una ciudad en el combobox filtra la vista agrupada', async ({ page }) => {
    await abrir(page)

    await page.getByRole('button', { name: /Todas las bodegas/ }).click()
    await page.getByRole('option', { name: /^SAN MARTIN/ }).click()

    await expect
      .poll(() => new URL(page.url()).searchParams.get('alcance'), { timeout: 20_000 })
      .toBe('ciudad')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('ciudad'), { timeout: 20_000 })
      .toBe('SAN MARTIN')

    // La matriz agrupada aparece con los dos bloques de columnas
    await expect(page.getByTestId('tabla-historico-matriz')).toBeVisible({ timeout: 60_000 })

    // El total cambia respecto al alcance "todas"
    const t = await leerTotales(page)
    expect(t.hoy).toBeGreaterThan(0)
    expect(t.corte).toBeCloseTo(t.hoy + t.ajuste, 1)
  })

  test('elegir una bodega da la vista individual', async ({ page }) => {
    await abrir(page)

    await page.getByRole('button', { name: /Todas las bodegas/ }).click()
    await page.getByRole('option', { name: /^SAN DIEGO 1/ }).click()

    await expect
      .poll(() => new URL(page.url()).searchParams.get('alcance'), { timeout: 20_000 })
      .toBe('bodega')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('bodega'), { timeout: 20_000 })
      .toBe('6')

    await expect(page.getByTestId('tabla-historico-individual')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId('tabla-historico-matriz')).toHaveCount(0)
  })

  test('la vista agrupada muestra la matriz con doble bloque de columnas', async ({ page }) => {
    await abrir(page)

    await page.getByRole('button', { name: /Todas las bodegas/ }).click()
    await page.getByRole('option', { name: /^SAN MARTIN/ }).click()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('ciudad'), { timeout: 20_000 })
      .toBe('SAN MARTIN')

    const matriz = page.getByTestId('tabla-historico-matriz')
    await expect(matriz).toBeVisible({ timeout: 60_000 })
    // Esperar a que la matriz se recargue con las columnas de SAN MARTIN
    await expect(
      matriz.getByRole('columnheader', { name: 'SAN DIEGO 1' }).first()
    ).toBeVisible({ timeout: 60_000 })

    // Cada columna agrupa su par: AL CORTE + MOVIMIENTOS (intercalados)
    const nivel1 = await matriz.locator('thead tr').nth(0).locator('th').allInnerTexts()
    const nivel2 = await matriz.locator('thead tr').nth(1).locator('th').allInnerTexts()
    const nombres1 = nivel1.map((h) => h.trim()).filter(Boolean)
    const nombres2 = nivel2.map((h) => h.trim()).filter(Boolean)

    // Nivel 1: el nombre de cada bodega (una vez) + TOTAL
    const bodegasEsperadas = ['SAN DIEGO 1', 'TORTILLA', 'ANDRADE', 'COCINA', 'SAN DIEGO 2', 'DURAZNO']
    for (const b of bodegasEsperadas) {
      expect(nombres1.filter((n) => n === b)).toHaveLength(1)
    }
    expect(nombres1.filter((n) => n === 'TOTAL')).toHaveLength(1)

    // Nivel 2: un par AL CORTE / MOVIMIENTOS por columna, en el mismo orden
    expect(nombres2.filter((n) => /al corte/i.test(n))).toHaveLength(6)
    expect(nombres2.filter((n) => /movimientos/i.test(n))).toHaveLength(6)
    for (let i = 0; i < 6; i++) {
      expect(nombres2[i * 2]).toMatch(/al corte/i)
      expect(nombres2[i * 2 + 1]).toMatch(/movimientos/i)
    }
  })

  test('la vista individual NO muestra los bloques de columnas por bodega', async ({ page }) => {
    await abrir(page)

    await page.getByRole('button', { name: /Todas las bodegas/ }).click()
    await page.getByRole('option', { name: /^COCINA/ }).click()

    const individual = page.getByTestId('tabla-historico-individual')
    await expect(individual).toBeVisible({ timeout: 60_000 })
    await expect(individual.getByRole('columnheader', { name: /STOCK AL 2026-09-30/i })).toHaveCount(0)
    await expect(individual.getByRole('columnheader', { name: /Al 2026-09-30/i })).toBeVisible()
  })

  test('el panel de columnas oculta y recuerda la preferencia', async ({ page }) => {
    await abrir(page)

    await expect(page.getByRole('columnheader', { name: 'Descripción' })).toBeVisible({
      timeout: 60_000,
    })

    await page.getByRole('button', { name: /Columnas/ }).click()
    // El input del checkbox es aria-hidden (base-ui): se hace clic en su label
    await page.locator('label[for="col-descripcion"]').click()
    await expect(page.getByRole('columnheader', { name: 'Descripción' })).toHaveCount(0)

    // Persiste tras recargar (localStorage)
    await page.reload()
    await expect(page.getByRole('columnheader', { name: 'Descripción' })).toHaveCount(0, {
      timeout: 60_000,
    })

    // Restaurar
    await page.getByRole('button', { name: /Columnas/ }).click()
    await page.locator('label[for="col-descripcion"]').click()
    await expect(page.getByRole('columnheader', { name: 'Descripción' })).toBeVisible({
      timeout: 30_000,
    })
  })

  test('cambiar a Movimientos del periodo conserva fecha y alcance', async ({ page }) => {
    await abrir(page)

    await page.locator('#hist-fecha').fill('2026-08-31')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('fecha'), { timeout: 20_000 })
      .toBe('2026-08-31')

    await page.getByRole('button', { name: /Movimientos del periodo/i }).click()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('vista'), { timeout: 20_000 })
      .toBe('kardex')

    // La fecha se conserva al cambiar de vista
    expect(new URL(page.url()).searchParams.get('fecha')).toBe('2026-08-31')

    await expect(page.getByText('Saldo inicial')).toBeVisible({ timeout: 60_000 })
  })

  test('el preset Fin de mes actual aplica el cierre del mes en curso', async ({ page }) => {
    await abrir(page)

    await page.getByRole('button', { name: /Fin de mes actual/i }).click()
    const esperado = await page.evaluate(() => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return `${ultimo.getFullYear()}-${p(ultimo.getMonth() + 1)}-${p(ultimo.getDate())}`
    })
    await expect
      .poll(() => new URL(page.url()).searchParams.get('fecha'), { timeout: 20_000 })
      .toBe(esperado)
  })

  test('el preset Hoy aplica la fecha de hoy', async ({ page }) => {
    await abrir(page)

    await page.getByRole('button', { name: /^Hoy$/ }).click()
    const esperado = await page.evaluate(() => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    })
    await expect
      .poll(() => new URL(page.url()).searchParams.get('fecha'), { timeout: 20_000 })
      .toBe(esperado)
  })
})
