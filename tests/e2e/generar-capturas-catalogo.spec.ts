// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\generar-capturas-catalogo.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loginToAdmin } from './helpers/auth';

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/capturas/01_catalogo');

test.describe('Generador de Evidencia y Capturas - Módulo Catálogo', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    const videosDir = path.resolve(process.cwd(), 'docs/videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
  });

  test('Captura y video completo de flujos del Catálogo', async ({ browser }) => {
    const videosDir = path.resolve(process.cwd(), 'docs/videos');
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: {
        dir: videosDir,
        size: { width: 1440, height: 900 },
      },
    });

    const page = await context.newPage();

    // 1. Login y navegar al Catálogo Principal
    await loginToAdmin(page, '/catalogo?vista=grid');
    await expect(page.getByRole('heading', { level: 1, name: /Catálogo/i })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);

    // Captura 1: Vista principal en Grid
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01_catalogo_grid.png'),
      fullPage: false,
    });

    // Cambiar a vista tabla si está disponible
    const toggleTabla = page.locator('button, a').filter({ hasText: /tabla/i }).first();
    if (await toggleTabla.isVisible().catch(() => false)) {
      await toggleTabla.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '01_catalogo_tabla.png'),
        fullPage: false,
      });
    }

    // 2. Abrir Modal de Nuevo Producto
    const btnNuevo = page.getByRole('link', { name: /Nuevo Producto/i }).or(page.getByRole('button', { name: /Nuevo Producto/i })).first();
    await btnNuevo.click();
    await page.waitForTimeout(1000);

    // Captura 2: Formulario modal de creación
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '02_modal_nuevo_producto.png'),
      fullPage: false,
    });

    // Cerrar modal si está abierto navegando directo a la tabla de catálogo
    await page.goto('/catalogo?vista=tabla');
    await page.waitForTimeout(1500);

    // Buscar el primer link de producto dentro de la tabla
    const productLink = page.locator('table tbody tr a[href^="/catalogo/"]').first();
    await expect(productLink).toBeVisible({ timeout: 10000 });
    const productHref = await productLink.getAttribute('href');

    if (productHref) {
      await page.goto(productHref);
      await page.waitForTimeout(2000);

      // Captura 3: Detalle del producto (Hero y pestaña de Variantes)
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '03_detalle_producto_variantes.png'),
        fullPage: false,
      });

      // Pestaña de Imágenes
      const tabImagenes = page.locator('[role="tab"]').filter({ hasText: /imágenes|imagenes/i }).first();
      if (await tabImagenes.isVisible().catch(() => false)) {
        await tabImagenes.click();
        await page.waitForTimeout(1500);

        // Captura 4: Galería de imágenes del producto
        await page.screenshot({
          path: path.join(OUTPUT_DIR, '04_galeria_imagenes_producto.png'),
          fullPage: false,
        });
      }
    }

    // 3. Navegar al Organizador de Familias
    await page.goto('/catalogo/familias');
    await page.waitForTimeout(2000);

    // Captura 5: Organizador de Familias
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '05_familias_organizer.png'),
      fullPage: false,
    });

    const videoObj = page.video();
    await page.close();
    await context.close();

    if (videoObj) {
      const videoPath = await videoObj.path();
      const finalVideoPath = path.join(videosDir, '01_demo_catalogo.webm');
      if (fs.existsSync(finalVideoPath)) {
        fs.unlinkSync(finalVideoPath);
      }
      fs.copyFileSync(videoPath, finalVideoPath);
      console.log(`Video grabado exitosamente en: ${finalVideoPath}`);
    }
  });
});
