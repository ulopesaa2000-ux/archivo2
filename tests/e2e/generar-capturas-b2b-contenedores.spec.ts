// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\generar-capturas-b2b-contenedores.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loginToAdmin } from './helpers/auth';

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/capturas/03_ordenes_contenedores');
const VIDEOS_DIR = path.resolve(process.cwd(), 'docs/videos');

test.describe('Generador de Evidencia y Capturas - Módulo B2B y Contenedores', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }
  });

  test('Captura y video completo de Órdenes B2B, Cajas y Contenedores', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: {
        dir: VIDEOS_DIR,
        size: { width: 1440, height: 900 },
      },
    });

    const page = await context.newPage();

    // 1. Login y navegar a Órdenes B2B
    await loginToAdmin(page, '/ordenes-b2b');
    await expect(page.getByRole('heading', { level: 1, name: /[oó]rdenes b2b/i })).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(2000);

    // Captura 1: Listado de órdenes B2B
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01_lista_ordenes_b2b.png'),
      fullPage: false,
    });

    // 2. Abrir Modal de Nueva Orden
    const btnNuevaOrden = page.getByRole('button', { name: /Nueva Orden/i }).first();
    if (await btnNuevaOrden.isVisible().catch(() => false)) {
      await btnNuevaOrden.click();
      await page.waitForTimeout(1500);

      // Captura 2: Modal de creación de orden B2B
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '02_modal_nueva_orden.png'),
        fullPage: false,
      });

      // Cerrar modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // 3. Detalle de una Orden B2B existente
    const firstOrderLink = page.locator('table tbody tr a[href^="/ordenes-b2b/"]').first()
      .or(page.locator('table tbody tr button[title="Ver detalle"]').first());
    
    if (await firstOrderLink.isVisible().catch(() => false)) {
      await firstOrderLink.click();
      await page.waitForTimeout(2000);

      // Captura 3: Detalle de la orden B2B
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '03_detalle_orden_b2b.png'),
        fullPage: false,
      });
    }

    // 4. Navegar a Cajas (Talla x Color)
    await page.goto('/ordenes-b2b/cajas');
    await page.waitForTimeout(2500);

    // Captura 4: Matriz de cajas
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '04_matriz_cajas_talla_color.png'),
      fullPage: false,
    });

    // 5. Navegar a Contenedores
    await page.goto('/contenedores');
    await expect(page.getByRole('heading', { level: 1, name: /Contenedores/i })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2000);

    // Captura 5: Listado de contenedores de importación
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '05_lista_contenedores.png'),
      fullPage: false,
    });

    // 6. Vista / Reporte de Contenedores
    const toggleReporte = page.locator('button, a').filter({ hasText: /reporte|anual|grilla/i }).first();
    if (await toggleReporte.isVisible().catch(() => false)) {
      await toggleReporte.click();
      await page.waitForTimeout(1500);
    }

    // Captura 6: Reporte o vista detallada de contenedores
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '06_reporte_anual_contenedores.png'),
      fullPage: false,
    });

    const videoObj = page.video();
    await page.close();
    await context.close();

    if (videoObj) {
      const videoPath = await videoObj.path();
      const finalVideoPath = path.join(VIDEOS_DIR, '03_demo_ordenes_contenedores.webm');
      if (fs.existsSync(finalVideoPath)) {
        fs.unlinkSync(finalVideoPath);
      }
      fs.copyFileSync(videoPath, finalVideoPath);
      console.log(`Video de B2B y contenedores grabado exitosamente en: ${finalVideoPath}`);
    }
  });
});
