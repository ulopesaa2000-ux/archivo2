// tests/e2e/inventario/notas/stock-insuficiente.spec.ts
/**
 * E2E del aviso previo de stock insuficiente (notas de salida / traslado).
 *
 * Reproduce el caso reportado: el MISMO SKU en dos renglones (6 + 1) con 6 cajas
 * disponibles. El trigger `fn_procesar_nota_inventario` procesa renglón por
 * renglón, así que sin la revisión previa la confirmación revienta con un
 * mensaje que no dice qué código falló ("Disponible: 0 cajas").
 *
 * El producto y la bodega se eligen leyendo la BD real (solo lectura) para que
 * el test no dependa de un SKU fijo ni de una cantidad fija.
 */
import { expect, test, type Page } from '@playwright/test'
import { BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from './test-utils'

const HAY_CREDENCIALES = Boolean(
  process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD
)
const HAY_DB = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
)

type ProductoConStock = { sku: string; bodega: string; cajas: number }

/** Busca un producto con stock en una bodega (solo lectura). */
async function buscarProductoConStock(): Promise<ProductoConStock | null> {
  if (!HAY_DB) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Accept-Profile': 'inv-tienda',
    'Content-Profile': 'inv-tienda',
  }

  const res = await fetch(
    `${url}/rest/v1/inventario_stock?select=producto_id,bodega_id,cajas,caja_id&caja_id=is.null&cajas=gt.0&limit=50`,
    { headers }
  )
  if (!res.ok) return null

  const filas = (await res.json()) as Array<{
    producto_id: number
    bodega_id: number
    cajas: number
  }>
  if (!filas.length) return null

  const prodRes = await fetch(
    `${url}/rest/v1/productos?select=id,sku_base&id=in.(${filas.map((f) => f.producto_id).join(',')})`,
    { headers }
  )
  const prods = (await prodRes.json()) as Array<{ id: number; sku_base: string }>
  const skuPorId = new Map(prods.map((p) => [p.id, p.sku_base]))

  const bodRes = await fetch(`${url}/rest/v1/bodegas?select=id,nombre`, { headers })
  const bods = (await bodRes.json()) as Array<{ id: number; nombre: string }>
  const nombrePorId = new Map(bods.map((b) => [b.id, b.nombre]))

  for (const f of filas) {
    const sku = skuPorId.get(f.producto_id)
    const bodega = nombrePorId.get(f.bodega_id)
    if (sku && bodega && Number(f.cajas) > 0) {
      return { sku, bodega, cajas: Number(f.cajas) }
    }
  }
  return null
}

async function iniciarSesion(page: Page) {
  await page.goto(BASE_URL + '/inventario/notas/nueva')
  await page.waitForTimeout(3000)

  if (page.url().includes('/login')) {
    await page.locator('#email').fill(TEST_ADMIN_EMAIL)
    await page.locator('#password').fill(TEST_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /Ingresar al Sistema/i }).click()
    await page.waitForTimeout(4000)
    await page.goto(BASE_URL + '/inventario/notas/nueva')
    await page.waitForTimeout(3000)
  }
}

async function agregarProducto(page: Page, sku: string, cantidad: number) {
  await page.getByPlaceholder('Buscar por SKU o nombre del producto...').fill(sku)
  await page.waitForTimeout(1500)
  await page.locator('button', { hasText: sku }).first().click()
  await page.waitForTimeout(1200)

  const cajasInput = page
    .locator('div.space-y-1')
    .filter({ hasText: 'Cajas *' })
    .locator('input[type="number"]')
    .first()
  await cajasInput.fill(String(cantidad))
  await page.getByRole('button', { name: /^Agregar$/ }).click()
  await page.waitForTimeout(1000)
}

test.describe('Notas de Inventario - Aviso de stock insuficiente', () => {
  test.skip(!HAY_CREDENCIALES, 'Configura TEST_ADMIN_* para ejecutar.')
  test.skip(!HAY_DB, 'Configura credenciales de Supabase para leer el stock real.')

  test('detecta el total agregado (2 renglones) antes de guardar', async ({ page }) => {
    const target = await buscarProductoConStock()
    test.skip(!target, 'No hay productos con stock en la base.')

    await iniciarSesion(page)

    // Tipo de movimiento: Salida
    await page.getByRole('button', { name: 'Salida', exact: true }).first().click()
    await page.waitForTimeout(800)
    const dialogTipo = page.getByRole('alertdialog')
    if (await dialogTipo.isVisible().catch(() => false)) {
      await dialogTipo.getByRole('button', { name: /Confirmar/i }).first().click()
      await page.waitForTimeout(1200)
    }

    // Bodega origen (la que tiene stock del producto)
    const bodegaSelect = page
      .getByText('Bodega Origen *', { exact: false })
      .locator('xpath=following::*[@role="combobox"][1]')
    await bodegaSelect.click()
    await page.waitForTimeout(800)
    await page.getByRole('option', { name: new RegExp(target.bodega, 'i') }).first().click()
    await page.waitForTimeout(1500)
    const dialogBodega = page.getByRole('alertdialog')
    if (await dialogBodega.isVisible().catch(() => false)) {
      await dialogBodega.getByRole('button', { name: /Confirmar|Cambiar/i }).first().click()
      await page.waitForTimeout(1500)
    }

    // Mismo SKU en dos renglones: todo el stock disponible + 1 caja
    await agregarProducto(page, target.sku, target.cajas)
    await agregarProducto(page, target.sku, 1)

    // El badge del renglón muestra el total agregado
    const total = target.cajas + 1
    await expect(
      page.getByText(new RegExp(`2 renglones · ${total} cajas en total`, 'i')).first()
    ).toBeVisible({ timeout: 15000 })

    // Guardar borrador → aviso con el detalle por SKU (no un error genérico)
    await page.getByRole('button', { name: /Guardar Borrador/i }).click()

    await expect(page.getByText(/Stock insuficiente en/i).first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(target.sku).first()).toBeVisible()
    await expect(page.getByText('−1').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Ajustar a disponible/i })).toBeVisible()
  })
})
