// c:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\generar-capturas-v2.spec.ts
import { test, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { loginToAdmin } from './helpers/auth'

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/capturas/v2')

async function safeCapture(
  page: Page,
  filename: string,
  action: () => Promise<void>,
  resultados: { ok: string[]; fail: string[] }
) {
  try {
    await action()
    await page.waitForTimeout(1200)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, filename),
      fullPage: false,
    })
    resultados.ok.push(filename)
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err)
    console.warn(`[WARN] No se pudo capturar ${filename}: ${msg}`)
    resultados.fail.push(`${filename} (${msg})`)
  }
}

test.describe('Generador de Capturas v2 - Plataforma inv-tienda Sandbox', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  })

  test('Capturar pantallas actuales de Productos, Inventario, Ecommerce y General', async ({ browser }) => {
    test.setTimeout(300_000)

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()
    const resultados: { ok: string[]; fail: string[] } = { ok: [], fail: [] }

    // 0. Login inicial
    await loginToAdmin(page, '/dashboard')

    // === DASHBOARD & ROLES ===
    await safeCapture(page, '34_dashboard_admin.png', async () => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '35_config_roles.png', async () => {
      await page.goto('/configuracion/roles', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    // === PRODUCTOS / CATÁLOGO ===
    await safeCapture(page, '01_catalogo_tabla.png', async () => {
      await page.goto('/catalogo?vista=tabla', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('table', { timeout: 15_000 })
    }, resultados)

    await safeCapture(page, '02_catalogo_grid.png', async () => {
      await page.goto('/catalogo?vista=grid', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '03_modal_nuevo_producto.png', async () => {
      await page.goto('/catalogo?vista=tabla&modal=create', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[role="dialog"]', { timeout: 10_000 })
    }, resultados)

    // Detalle del primer producto
    let productHref: string | null = null
    try {
      await page.goto('/catalogo?vista=tabla', { waitUntil: 'domcontentloaded' })
      const productLink = page.locator('table tbody tr a[href^="/catalogo/"]').first()
      await productLink.waitFor({ state: 'visible', timeout: 12_000 })
      productHref = await productLink.getAttribute('href')
    } catch {
      productHref = null
    }

    if (productHref) {
      await safeCapture(page, '04_detalle_producto_hero.png', async () => {
        await page.goto(productHref!, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1500)
      }, resultados)

      await safeCapture(page, '05_detalle_producto_variantes.png', async () => {
        const tabVariantes = page.getByRole('tab', { name: /Variantes/i }).first()
        await tabVariantes.click()
        await page.waitForTimeout(1000)
      }, resultados)

      await safeCapture(page, '06_detalle_producto_cajas.png', async () => {
        const tabCajas = page.getByRole('tab', { name: /Cajas/i }).first()
        await tabCajas.click()
        await page.waitForTimeout(1000)
      }, resultados)
    }

    // Imágenes Canva
    await safeCapture(page, '07_imagenes_canva_galeria.png', async () => {
      await page.goto('/catalogo/imagenes', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '08_imagenes_canva_modal.png', async () => {
      const btnImportar = page.getByRole('button', { name: /Importar/i }).first()
      await btnImportar.click()
      await page.waitForTimeout(500)
      const menuSubir = page.getByRole('menuitem', { name: /Subir archivos/i }).or(page.getByText(/Subir archivos/i)).first()
      if (await menuSubir.isVisible().catch(() => false)) {
        await menuSubir.click()
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 8_000 })
    }, resultados)

    // Familias
    await safeCapture(page, '09_familias_organizador.png', async () => {
      await page.goto('/catalogo/familias', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
    }, resultados)

    // Órdenes B2B y Cajas
    await safeCapture(page, '10_ordenes_b2b_lista.png', async () => {
      await page.goto('/ordenes-b2b', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '11_cajas_lista.png', async () => {
      await page.goto('/ordenes-b2b/cajas', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '12_orden_rapida_config.png', async () => {
      await page.goto('/ordenes-b2b/orden-rapida', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    // Contenedores
    await safeCapture(page, '13_contenedores_lista.png', async () => {
      await page.goto('/contenedores', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '14_contenedor_detalle.png', async () => {
      const contLink = page.locator('a[href^="/contenedores/"]').first()
      if (await contLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const href = await contLink.getAttribute('href')
        if (href) {
          await page.goto(href, { waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(1500)
          return
        }
      }
      throw new Error('No se encontró contenedor en listado')
    }, resultados)

    await safeCapture(page, '15_contenedores_reporte_anual.png', async () => {
      await page.goto('/contenedores?vista=reporte', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    // === INVENTARIO / OCR / DESPACHOS ===
    await safeCapture(page, '16_inventario_stock.png', async () => {
      await page.goto('/inventario/stock', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '17_inventario_conteo_fisico_ocr.png', async () => {
      await page.goto('/inventario/stock', { waitUntil: 'domcontentloaded' })
      const btnOcr = page.getByRole('button', { name: /Escanear inventario f[ií]sico/i }).first()
      await btnOcr.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 8_000 })
    }, resultados)

    await safeCapture(page, '18_inventario_importar_ajuste.png', async () => {
      await page.goto('/inventario/stock', { waitUntil: 'domcontentloaded' })
      const btnImport = page.getByRole('button', { name: /Importar ajuste/i }).first()
      await btnImport.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 8_000 })
    }, resultados)

    await safeCapture(page, '19_inventario_notas_lista.png', async () => {
      await page.goto('/inventario/notas', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '20_inventario_nota_nueva.png', async () => {
      await page.goto('/inventario/notas/nueva', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '21_inventario_nota_detalle.png', async () => {
      await page.goto('/inventario/notas', { waitUntil: 'domcontentloaded' })
      const links = page.locator('table tbody tr a[href^="/inventario/notas/"]')
      const count = await links.count()
      for (let i = 0; i < count; i++) {
        const href = await links.nth(i).getAttribute('href')
        if (href && !href.endsWith('/nueva') && !href.endsWith('/propuestas')) {
          await page.goto(href, { waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(1500)
          return
        }
      }
      throw new Error('No se encontró nota de inventario en tabla')
    }, resultados)

    await safeCapture(page, '22_inventario_propuestas_ocr.png', async () => {
      await page.goto('/inventario/notas/propuestas', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '23_inventario_stock_historico.png', async () => {
      await page.goto('/inventario/stock/historico', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '24_inventario_trazabilidad.png', async () => {
      await page.goto('/inventario/trazabilidad', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '25_inventario_bodegas.png', async () => {
      await page.goto('/inventario/bodegas', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '26_despachos_lista.png', async () => {
      await page.goto('/despachos', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '27_despacho_nuevo.png', async () => {
      await page.goto('/despachos/nuevo', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    // === ECOMMERCE & TIENDA PÚBLICA ===
    await safeCapture(page, '28_ecommerce_productos_web.png', async () => {
      await page.goto('/ecommerce/productos-web', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '29_ecommerce_ordenes_venta.png', async () => {
      await page.goto('/ecommerce/ordenes-venta', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '30_ecommerce_config.png', async () => {
      await page.goto('/ecommerce/config', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '31_tienda_inicio.png', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '32_tienda_shop.png', async () => {
      await page.goto('/shop', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    }, resultados)

    await safeCapture(page, '33_tienda_pdp.png', async () => {
      await page.goto('/shop', { waitUntil: 'domcontentloaded' })
      const prodLink = page.locator('a[href^="/shop/"]').first()
      await prodLink.waitFor({ state: 'visible', timeout: 10_000 })
      const href = await prodLink.getAttribute('href')
      if (href) {
        await page.goto(href, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1500)
        return
      }
      throw new Error('No hay productos visibles en /shop')
    }, resultados)

    await page.close()
    await context.close()

    console.log(`\n=== RESUMEN CAPTURAS V2 ===`)
    console.log(`Exitosas (${resultados.ok.length}): ${resultados.ok.join(', ')}`)
    console.log(`Fallidas (${resultados.fail.length}): ${resultados.fail.join(' | ')}`)
  })
})
