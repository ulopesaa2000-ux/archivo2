// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\generar-capturas-despachos-ecommerce.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loginToAdmin } from './helpers/auth';

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/capturas/04_despachos_ecommerce');
const VIDEOS_DIR = path.resolve(process.cwd(), 'docs/videos');

test.describe('Generador de Evidencia y Capturas - Módulo Despachos y Ecommerce', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }
  });

  test('Captura y video completo de Despachos, Ecommerce y Tienda Pública', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: {
        dir: VIDEOS_DIR,
        size: { width: 1440, height: 900 },
      },
    });

    const page = await context.newPage();

    // 1. Login y navegar a Despachos
    await loginToAdmin(page, '/despachos');
    await page.waitForTimeout(2000);

    // Captura 1: Listado de Despachos
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01_lista_despachos.png'),
      fullPage: false,
    });

    // 2. Navegar a Nuevo Despacho
    await page.goto('/despachos/nuevo');
    await page.waitForTimeout(2000);

    // Captura 2: Formulario de nuevo despacho
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '02_nuevo_despacho.png'),
      fullPage: false,
    });

    // 3. Navegar a Admin Ecommerce: Productos Web
    await page.goto('/ecommerce/productos-web', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Captura 3: Productos Web en Admin
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '03_admin_productos_web.png'),
      fullPage: false,
    });

    // 4. Navegar a Admin Ecommerce: Órdenes de Venta
    await page.goto('/ecommerce/ordenes-venta', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Captura 4: Órdenes de Venta Ecommerce
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '04_admin_ordenes_venta.png'),
      fullPage: false,
    });

    // 5. Navegar a la Tienda Pública (/shop)
    await page.goto('/shop', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500);

    // Captura 5: Catálogo público de la tienda
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '05_tienda_publica_shop.png'),
      fullPage: false,
    });

    // 6. Navegar al detalle de un producto público
    const firstShopProduct = page.locator('a[href^="/shop/"]').first();
    if (await firstShopProduct.isVisible({ timeout: 5000 }).catch(() => false)) {
      const shopHref = await firstShopProduct.getAttribute('href');
      if (shopHref) {
        await page.goto(shopHref, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(2000);

        // Captura 6: Ficha de producto público en la tienda
        await page.screenshot({
          path: path.join(OUTPUT_DIR, '06_tienda_producto_detalle.png'),
          fullPage: false,
        });
      }
    }

    const videoObj = page.video();
    await page.close();
    await context.close();

    if (videoObj) {
      const videoPath = await videoObj.path();
      const finalVideoPath = path.join(VIDEOS_DIR, '04_demo_despachos_ecommerce.webm');
      if (fs.existsSync(finalVideoPath)) {
        fs.unlinkSync(finalVideoPath);
      }
      fs.copyFileSync(videoPath, finalVideoPath);
      console.log(`Video de despachos y ecommerce grabado en: ${finalVideoPath}`);
    }
  });
});
