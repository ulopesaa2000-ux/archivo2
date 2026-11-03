// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\generar-capturas-inventario.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loginToAdmin } from './helpers/auth';

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/capturas/02_inventario');
const VIDEOS_DIR = path.resolve(process.cwd(), 'docs/videos');

test.describe('Generador de Evidencia y Capturas - Módulo Inventario', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }
  });

  test('Captura y video completo de flujos de Inventario', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: {
        dir: VIDEOS_DIR,
        size: { width: 1440, height: 900 },
      },
    });

    const page = await context.newPage();

    // 1. Login y navegar a Consulta de Stock
    await loginToAdmin(page, '/inventario/stock');
    await expect(page.getByRole('heading', { level: 1, name: /Stock/i })).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(2000);

    // Captura 1: Consulta de existencias por bodega
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01_stock_por_bodega.png'),
      fullPage: false,
    });

    // 2. Navegar a Listado de Notas de Movimiento
    await page.goto('/inventario/notas');
    await expect(page.getByRole('heading', { level: 1, name: /Notas de Inventario/i })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2000);

    // Captura 2: Listado de notas y filtros de estado
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '02_lista_notas_movimiento.png'),
      fullPage: false,
    });

    // 3. Navegar a Nueva Nota (NoteDraftBuilder)
    await page.goto('/inventario/notas/nueva');
    await page.waitForTimeout(2500);

    // Captura 3: Constructor de nueva nota
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '03_crear_nota_draft.png'),
      fullPage: false,
    });

    // 4. Detalle de una nota existente
    await page.goto('/inventario/notas');
    await page.waitForTimeout(1500);
    const firstNoteLink = page.locator('table tbody tr a[href^="/inventario/notas/"]').first();
    if (await firstNoteLink.isVisible().catch(() => false)) {
      const noteHref = await firstNoteLink.getAttribute('href');
      if (noteHref && !noteHref.includes('nueva') && !noteHref.includes('propuestas')) {
        await page.goto(noteHref);
        await page.waitForTimeout(2000);

        // Captura 4: Detalle de nota y cambio de estado
        await page.screenshot({
          path: path.join(OUTPUT_DIR, '04_detalle_nota_edicion.png'),
          fullPage: false,
        });
      }
    }

    // 5. Navegar a Trazabilidad / Kardex
    await page.goto('/inventario/trazabilidad');
    await page.waitForTimeout(2000);

    // Captura 5: Trazabilidad y rotación de inventario
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '05_trazabilidad_kardex.png'),
      fullPage: false,
    });

    const videoObj = page.video();
    await page.close();
    await context.close();

    if (videoObj) {
      const videoPath = await videoObj.path();
      const finalVideoPath = path.join(VIDEOS_DIR, '02_demo_inventario.webm');
      if (fs.existsSync(finalVideoPath)) {
        fs.unlinkSync(finalVideoPath);
      }
      fs.copyFileSync(videoPath, finalVideoPath);
      console.log(`Video de inventario grabado exitosamente en: ${finalVideoPath}`);
    }
  });
});
