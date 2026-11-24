// c:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\generar-videoguias.spec.ts
import { test, type Browser, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { loginToAdmin } from './helpers/auth'

const VIDEOS_DIR = path.resolve(process.cwd(), 'docs/manuales/videoguias/videos')
const TMP_DIR = path.resolve(process.cwd(), 'docs/manuales/videoguias/.tmp_videos')
const SAMPLES_PACKING = path.resolve(process.cwd(), 'docs/samples/packing-lists/15-2026 MOTI PACKING LIST TXGU4972610.xlsx')
const DEMO_DIR = path.resolve(process.cwd(), 'docs/samples/demo-videos')

async function mostrarBanner(page: Page, titulo: string, subtitulo = '') {
  await page
    .evaluate(
      ({ t, s }) => {
        let el = document.getElementById('__videoguia_banner__')
        if (!el) {
          el = document.createElement('div')
          el.id = '__videoguia_banner__'
          Object.assign(el.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            zIndex: '999999',
            background: 'rgba(15, 23, 42, 0.92)',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '10px',
            borderLeft: '5px solid #0D9488',
            boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            maxWidth: '560px',
            pointerEvents: 'none',
          })
          document.body.appendChild(el)
        }
        el.innerHTML = `<div style="font-size:14px;font-weight:700;letter-spacing:0.2px">${t}</div>${
          s ? `<div style="font-size:12px;color:#CBD5E1;margin-top:3px">${s}</div>` : ''
        }`
      },
      { t: titulo, s: subtitulo }
    )
    .catch(() => {})
}

async function grabarVideo(
  browser: Browser,
  filename: string,
  startPath: string,
  autenticar: boolean,
  runFlow: (page: Page) => Promise<void>
) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true })
  fs.mkdirSync(TMP_DIR, { recursive: true })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: TMP_DIR,
      size: { width: 1440, height: 900 },
    },
  })
  const page = await context.newPage()

  try {
    if (autenticar) {
      await loginToAdmin(page, startPath)
    } else {
      await page.goto(startPath, { waitUntil: 'domcontentloaded' })
    }
    await page.waitForTimeout(1500)
    await runFlow(page)
    await page.waitForTimeout(1200)
  } finally {
    const videoObj = page.video()
    await page.close().catch(() => {})
    await context.close().catch(() => {})
    if (videoObj) {
      const src = await videoObj.path()
      const dest = path.join(VIDEOS_DIR, filename)
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      fs.copyFileSync(src, dest)
      console.log(`[VIDEO OK] ${dest} (${fs.statSync(dest).size} bytes)`)
    }
  }
}

test.describe('Grabación de 13 Videoguías Individuales (Sandbox)', () => {
  test.afterAll(() => {
    try {
      fs.rmSync(TMP_DIR, { recursive: true, force: true })
    } catch {}
  })

  test('Video 01 - Orden rápida mediante Excel', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '01_productos_orden_rapida_excel.webm', '/ordenes-b2b/orden-rapida', true, async (page) => {
      await mostrarBanner(page, 'Video 1 · Orden Rápida mediante Excel', 'Objetivo: Importar un Packing List Excel y generar Orden B2B + Cajas')
      await page.waitForTimeout(1500)

      // Abrir Guía visual de formatos
      const btnGuia = page.getByRole('button', { name: /Gu[ií]a visual de formatos/i }).first()
      if (await btnGuia.isVisible().catch(() => false)) {
        await btnGuia.click()
        await mostrarBanner(page, 'Paso 1 · Revisar formatos de plantilla', '7 parsers soportados: auto, bonnie, moti, jackie, jenny, tianyi, general')
        await page.waitForTimeout(2000)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(800)
      }

      // Seleccionar selects disponibles en Paso 1
      await mostrarBanner(page, 'Paso 1 · Configurar Proveedor, Cliente, Contenedor y Parser', 'Los contenedores ya surtidos muestran advertencia amarilla')
      const selects = page.locator('select')
      const sCount = await selects.count()
      for (let i = 0; i < sCount; i++) {
        const opts = await selects.nth(i).locator('option').allTextContents()
        if (opts.length > 1) {
          await selects.nth(i).selectOption({ index: 1 }).catch(() => {})
          await page.waitForTimeout(400)
        }
      }
      await page.waitForTimeout(1200)

      // Avanzar a Paso 2 si botón siguiente está habilitado
      const btnNext = page.getByRole('button', { name: /Siguiente|Continuar|Paso 2/i }).first()
      if (await btnNext.isEnabled().catch(() => false)) {
        await btnNext.click()
        await page.waitForTimeout(1200)
        await mostrarBanner(page, 'Paso 2 · Cargar Excel (.xls / .xlsx)', 'Sube el Packing List (PDF en fase posterior)')
        const fileInput = page.locator('input[type="file"]').first()
        if ((await fileInput.count()) > 0 && fs.existsSync(SAMPLES_PACKING)) {
          await fileInput.setInputFiles(SAMPLES_PACKING).catch(() => {})
          await page.waitForTimeout(1500)
        }
      }

      await page.goto('/contenedores', { waitUntil: 'domcontentloaded' })
      await mostrarBanner(page, 'Verificación · Contenedores y Órdenes B2B', 'Aquí se valida que la orden haya quedado vinculada al contenedor')
      await page.waitForTimeout(1800)
    })
  })

  test('Video 02 - Subir imágenes masivas desde Canva', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '02_productos_imagenes_masivas_canva.webm', '/catalogo?vista=tabla', true, async (page) => {
      await mostrarBanner(page, 'Video 2 · Imágenes masivas desde Canva', 'Primero consultamos el SKU real del producto (ej. del contenedor)')
      let firstSku = '1AK4830-1'
      try {
        const tablaBtn = page.getByRole('button', { name: /^Tabla$/i }).first()
        if (await tablaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tablaBtn.click().catch(() => {})
          await page.waitForTimeout(1000)
        }
        const skuCell = page.locator('table tbody tr a[href^="/catalogo/"]').first()
        if (await skuCell.isVisible({ timeout: 5000 }).catch(() => false)) {
          const skuText = await skuCell.innerText({ timeout: 3000 })
          if (skuText && skuText.trim().length >= 3) firstSku = skuText.trim().split(/\s+/)[0]
        }
      } catch {}
      await page.waitForTimeout(1200)

      // Copiar muestras Canva con SKU real del sandbox para demostrar sku-matcher
      const tmpCanva1 = path.join(DEMO_DIR, `${firstSku}_1.png`)
      const tmpCanva2 = path.join(DEMO_DIR, `${firstSku}_2.png`)
      fs.copyFileSync(path.join(DEMO_DIR, 'DEMO-CANVA_1.png'), tmpCanva1)
      fs.copyFileSync(path.join(DEMO_DIR, 'DEMO-CANVA_2.png'), tmpCanva2)

      await page.goto('/catalogo/imagenes', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      await mostrarBanner(page, 'Módulo Imágenes · Importar → Subir archivos', `Regla estándar: ${firstSku}_1.png (Principal), ${firstSku}_2.png (Secundaria)`)

      const btnImportar = page.getByRole('button', { name: /Importar/i }).first()
      await btnImportar.click().catch(() => {})
      await page.waitForTimeout(600)
      const optSubir = page.getByRole('menuitem', { name: /Subir archivos/i }).or(page.getByText(/Subir archivos/i)).first()
      if (await optSubir.isVisible().catch(() => false)) {
        await optSubir.click()
        await page.waitForTimeout(1200)
      }

      const fileInput = page.locator('[role="dialog"] input[type="file"]').first()
      if ((await fileInput.count()) > 0) {
        await fileInput.setInputFiles([tmpCanva1, tmpCanva2]).catch(() => {})
        await page.waitForTimeout(2500)
        await mostrarBanner(page, 'Paso 2 · Emparejamiento automático (sku-matcher.ts)', 'Verifica detected vs not_found y define 1 Principal por SKU (sin subir en demo o confirmar)')
        await page.waitForTimeout(2200)
      }

      await page.keyboard.press('Escape').catch(() => {})
      const firstLink = page.locator('a[href^="/catalogo/"]').first()
      if (await firstLink.isVisible().catch(() => false)) {
        await page.goto('/catalogo?vista=tabla', { waitUntil: 'domcontentloaded' })
        const pLink = page.locator('table tbody tr a[href^="/catalogo/"]').first()
        const href = await pLink.getAttribute('href').catch(() => null)
        if (href) {
          await page.goto(href, { waitUntil: 'domcontentloaded' })
          await mostrarBanner(page, 'Resultado en /catalogo/[id] · Pestaña Imágenes', 'Aquí se valida la foto principal WebP sin recortes')
          await page.waitForTimeout(1800)
        }
      }

      fs.rmSync(tmpCanva1, { force: true })
      fs.rmSync(tmpCanva2, { force: true })
    })
  })

  test('Video 03 - Crear familias y definir orden en inventario', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '03_productos_familias_y_orden_reporte.webm', '/catalogo/familias', true, async (page) => {
      await mostrarBanner(page, 'Video 3 · Familias y Orden en Inventario', 'Orden alfabético es-MX con F000-000C (Sin Asignar) siempre al final')
      await page.waitForTimeout(2000)

      const vistaSku = page.getByRole('button', { name: /Puro SKU/i }).first()
      if (await vistaSku.isVisible().catch(() => false)) {
        await vistaSku.click()
        await mostrarBanner(page, 'Vista Puro SKU y Bandeja lateral', 'Mueve productos en borrador local antes de pulsar Guardar Cambios')
        await page.waitForTimeout(1800)
      }

      const semaforo = page.getByLabel(/Modo stock/i).or(page.getByText(/Modo stock/i)).first()
      if (await semaforo.isVisible().catch(() => false)) {
        await semaforo.click().catch(() => {})
        await page.waitForTimeout(1400)
      }

      await page.goto('/print/inventario/familias', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await mostrarBanner(page, 'Vista Previa de Reporte (/print/inventario/familias)', 'Confirma el orden exacto de familias para inventario físico y Excel')
      await page.waitForTimeout(2000)
    })
  })

  test('Video 04 - Crear y validar una nota mediante OCR', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '04_inventario_nota_ocr.webm', '/inventario/notas', true, async (page) => {
      await mostrarBanner(page, 'Video 4 · Crear y Validar Nota mediante OCR', 'Advertencia: el OCR asiste, pero una persona debe validar todas las líneas')
      await page.waitForTimeout(1500)

      const btnOcr = page.getByRole('button', { name: /Escanear OCR/i }).first()
      if (await btnOcr.isVisible().catch(() => false)) {
        await btnOcr.click()
        await page.waitForTimeout(1200)
        await mostrarBanner(page, 'Paso 1 · Subir fotografía nítida y elegir Tipo Estimado', 'Buena luz, hoja completa, cámara perpendicular, sin sombras')
        const fInput = page.locator('[role="dialog"] input[type="file"]').first()
        const notaDemo = path.join(DEMO_DIR, 'nota_fisica_demo.png')
        if ((await fInput.count()) > 0 && fs.existsSync(notaDemo)) {
          await fInput.setInputFiles(notaDemo).catch(() => {})
          await page.waitForTimeout(1500)
        }
        await page.keyboard.press('Escape').catch(() => {})
      }

      // Ir a Propuestas OCR existentes en sandbox
      await page.goto('/inventario/notas/propuestas', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1800)
      await mostrarBanner(page, 'Paso 2 · Bandeja de Propuestas OCR (Nivel 1)', 'Revisar Origen, Destino, Líneas Extraídas y % de Confianza')

      const btnEditarSkus = page.getByRole('button', { name: /Editar SKUs/i }).or(page.getByRole('link', { name: /Editar SKUs/i })).first()
      if (await btnEditarSkus.isVisible().catch(() => false)) {
        await btnEditarSkus.click()
        await page.waitForTimeout(2200)
        await mostrarBanner(page, 'Paso 3 · Visor Comparador + NotaOcrMismatchBanner', 'Compara foto original vs encabezado y abre Sincronizador OCR')
        const btnSync = page.getByRole('button', { name: /Sincronizar OCR|Editar \/ Sincronizar/i }).first()
        if (await btnSync.isVisible().catch(() => false)) {
          await btnSync.click()
          await page.waitForTimeout(2000)
          await mostrarBanner(page, 'Paso 4 · OcrLineasSyncModal', 'Usa Enter o "Aceptar propuestas >=90%" y omite tachaduras antes de aplicar')
          await page.keyboard.press('Escape').catch(() => {})
        }
      }
    })
  })

  test('Video 05 - Surtir un contenedor hacia una bodega virtual', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '05_inventario_surtir_contenedor_virtual.webm', '/contenedores', true, async (page) => {
      await mostrarBanner(page, 'Video 5 · Surtir Contenedor a Bodega Virtual', 'Flujo en 2 pasos cuando el contenedor está en estado en_bodega')
      await page.waitForTimeout(1500)

      const contLink = page.locator('a[href^="/contenedores/"]').first()
      if (await contLink.isVisible().catch(() => false)) {
        const href = await contLink.getAttribute('href')
        if (href) {
          await page.goto(href, { waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(1800)
          await mostrarBanner(page, 'Cabecera y Packing List (Vista Unificada)', 'Valida 0 diferencias entre cajas pedidas y cajas físicas')

          const tabPacking = page.getByRole('tab', { name: /Packing List/i }).first()
          if (await tabPacking.isVisible().catch(() => false)) {
            await tabPacking.click()
            await page.waitForTimeout(1800)
          }

          const btnSurtir = page.getByRole('button', { name: /Surtir a bodega virtual/i }).first()
          if (await btnSurtir.isVisible().catch(() => false)) {
            await btnSurtir.click()
            await page.waitForTimeout(1500)
            await mostrarBanner(page, 'Paso 1: Generar aviso ENT (PEND) → Paso 2: Confirmar ingreso (CONF)', 'Requiere cuadre 100% sin tolerancia')
            await page.keyboard.press('Escape').catch(() => {})
          }
        }
      }

      await page.goto('/inventario-virtual', { waitUntil: 'domcontentloaded' })
      await mostrarBanner(page, 'Verificación · Bodegas Virtuales (/inventario-virtual)', 'Aquí se refleja el stock ingresado tras confirmar el surtido')
      await page.waitForTimeout(1800)
    })
  })

  test('Video 06 - Realizar un ajuste manual de inventario', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '06_inventario_ajuste_manual.webm', '/inventario/stock', true, async (page) => {
      await mostrarBanner(page, 'Video 6 · Ajuste Manual de Inventario', 'Primero consultamos el stock actual antes de crear la nota')
      await page.waitForTimeout(1500)

      await page.goto('/inventario/notas/nueva', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1800)
      await mostrarBanner(page, 'Constructor de Nota · /inventario/notas/nueva', 'Elegimos tipo (AJU para nivel <=2 o ENT/SAL), bodega y motivo en Referencia')

      // Llenar Nota de Referencia con etiqueta DEMO-VIDEO sin confirmar cambios irreversibles
      const refInput = page.locator('input[placeholder*="referencia" i], input[name*="referencia" i], textarea').first()
      if (await refInput.isVisible().catch(() => false)) {
        await refInput.fill('DEMO-VIDEO Ajuste manual de prueba sandbox').catch(() => {})
        await page.waitForTimeout(1000)
      }

      // Intentar seleccionar un producto del buscador para mostrar renglón en modo solo cajas
      const searchProd = page.locator('input[placeholder*="SKU" i], input[placeholder*="Buscar producto" i]').first()
      if (await searchProd.isVisible().catch(() => false)) {
        await searchProd.fill('1A').catch(() => {})
        await page.waitForTimeout(1200)
      }

      await mostrarBanner(page, 'Modo solo cajas (piezas = 0) y regla de compensación', 'Tras CONF no hay botón revertir: se corrige con nota compensatoria')
      await page.waitForTimeout(1800)

      await page.goto('/inventario/notas', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
    })
  })

  test('Video 07 - Escanear inventario físico OCR y comparar', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '07_inventario_escanear_fisico_ocr.webm', '/inventario/stock', true, async (page) => {
      await mostrarBanner(page, 'Video 7 · Escanear Inventario Físico OCR', 'Digitaliza hojas de libreta en 2 columnas o sincroniza desde celular')
      await page.waitForTimeout(1500)

      const btnEscanear = page.getByRole('button', { name: /Escanear inventario f[ií]sico/i }).first()
      await btnEscanear.click()
      await page.waitForTimeout(1500)

      await mostrarBanner(page, 'ConteoFisicoOcrModal · Subir hojas o Sincronizar Celular (Nube)', 'Estado en nube: CONTEO_PENDIENTE hasta aplicar conciliación')
      const btnNube = page.getByRole('button', { name: /Sincronizar Celular/i }).first()
      if (await btnNube.isVisible().catch(() => false)) {
        await btnNube.click().catch(() => {})
        await page.waitForTimeout(1800)
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(800)
      }

      const fInput = page.locator('[role="dialog"] input[type="file"]').first()
      const hojaDemo = path.join(DEMO_DIR, 'hoja_conteo_fisico_demo.png')
      if ((await fInput.count()) > 0 && fs.existsSync(hojaDemo)) {
        await fInput.setInputFiles(hojaDemo).catch(() => {})
        await page.waitForTimeout(2000)
      }

      await mostrarBanner(page, 'Paso siguiente → Comparar con Bodega (ImportStepTotalComparison)', 'Muestra coincidencias, sobrantes, faltantes y genera notas ENT/SAL al confirmar')
      await page.waitForTimeout(1800)
    })
  })

  test('Video 08 - Importar ajustes mediante Excel', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '08_inventario_importar_ajustes_excel.webm', '/inventario/stock', true, async (page) => {
      await mostrarBanner(page, 'Video 8 · Importar Ajustes mediante Excel', 'Modos: Ajuste delta, Inventario total y Corte Global (Matriz)')
      await page.waitForTimeout(1500)

      const btnImport = page.getByRole('button', { name: /Importar ajuste/i }).first()
      await btnImport.click()
      await page.waitForTimeout(1500)

      const csvPath = path.join(DEMO_DIR, 'ajuste_demo_sandbox.csv')
      const fInput = page.locator('[role="dialog"] input[type="file"]').first()
      if ((await fInput.count()) > 0 && fs.existsSync(csvPath)) {
        await mostrarBanner(page, 'Paso 1 · Subir plantilla CSV/Excel', 'Formato plano (sku, cajas, bodega) o Matriz SKU × Bodega')
        await fInput.setInputFiles(csvPath).catch(() => {})
        await page.waitForTimeout(2000)
      }

      const btnSiguiente = page.locator('[role="dialog"] button').filter({ hasText: /CONTINUAR CON|Siguiente|Vista previa|Analizar/i }).first()
      if (await btnSiguiente.isVisible({ timeout: 5000 }).catch(() => false)) {
        if (await btnSiguiente.isEnabled({ timeout: 3000 }).catch(() => false)) {
          await btnSiguiente.click().catch(() => {})
          await page.waitForTimeout(2000)
          await mostrarBanner(page, 'Paso 2–3 · Validar SKUs, diferencias y Lista Amarilla', 'Al confirmar crea y confirma notas ENT (>0) y SAL (<0) automáticamente')
        }
      }
      await page.waitForTimeout(1500)
    })
  })

  test('Video 09 - Imprimir el reporte global de inventario', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '09_inventario_reporte_global_imprimir.webm', '/inventario/stock', true, async (page) => {
      await mostrarBanner(page, 'Video 9 · Reporte Global de Inventario', 'Diferencia Stock Físico (CONF) vs Modo Pronóstico (PEND/PROC)')
      await page.waitForTimeout(1800)

      const btnPronostico = page.getByRole('button', { name: /Pron[oó]stico/i }).first()
      if (await btnPronostico.isVisible().catch(() => false)) {
        await btnPronostico.click().catch(() => {})
        await page.waitForTimeout(1500)
      }

      await page.goto('/inventario/stock/historico', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1800)
      await mostrarBanner(page, 'Stock Histórico · Corte a fecha, Kardex y Exportar Excel', 'Convención recomendada al imprimir PDF: Inventario_Global_2026-11-19_Bodega.pdf')
      await page.waitForTimeout(1800)

      await page.goto('/print/inventario/familias', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await mostrarBanner(page, 'Vista de Impresión ordenada por Familias', 'F000-000C aparece siempre al final · Lista para Imprimir / Guardar PDF')
      await page.waitForTimeout(2000)
    })
  })

  test('Video 10 - Publicar productos en el catálogo público', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '10_ecommerce_publicar_productos.webm', '/ecommerce/productos-web', true, async (page) => {
      await mostrarBanner(page, 'Video 10 · Publicar Productos en Catálogo Público', 'Sin bloqueo por stock=0 en Admin; visibilidad controlada en /ecommerce/config')
      await page.waitForTimeout(1800)

      const seoBtn = page.locator('table tbody tr button').filter({ hasText: /SEO/i }).first()
      if (await seoBtn.isVisible().catch(() => false)) {
        await seoBtn.click().catch(() => {})
        await mostrarBanner(page, 'Precios, SEO inteligente y Etiquetas', 'Nuevo (vigencia configurable), Destacado (estrella) y Oferta (< precio público)')
        await page.waitForTimeout(1800)
        await page.keyboard.press('Escape').catch(() => {})
      }

      await page.goto('/ecommerce/config', { waitUntil: 'domcontentloaded' })
      await mostrarBanner(page, 'Regla de stock en /ecommerce/config', 'modo_visibilidad_catalogo: todos_publicados | stock_individual | stock_familia')
      await page.waitForTimeout(1800)

      await page.goto('/shop', { waitUntil: 'domcontentloaded' })
      await mostrarBanner(page, 'Resultado en Tienda Pública (/shop)', 'Insignias Nuevo / -Oferta y vista detalle (/shop/[slug])')
      await page.waitForTimeout(1800)
    })
  })

  test('Video 11 - Editar el contenido administrativo de /inicio', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '11_ecommerce_editar_inicio.webm', '/inicio', true, async (page) => {
      await mostrarBanner(page, 'Video 11 · Editar contenido de /inicio', 'Con permiso ecommerce_config:puede_editar aparece LiveEditDrawer')
      await page.waitForTimeout(1800)

      const editBtn = page.getByRole('button', { name: /Editar|Personalizar|Live/i }).first()
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click().catch(() => {})
        await mostrarBanner(page, 'Editor en vivo de /inicio (LiveEditDrawer)', 'Edita textos, hero y WhatsApp regional (sin historial de versiones automático)')
        await page.waitForTimeout(2000)
        await page.keyboard.press('Escape').catch(() => {})
      }

      await page.goto('/ecommerce/config', { waitUntil: 'domcontentloaded' })
      await mostrarBanner(page, 'Banners Promocionales 16:9 en /ecommerce/config', 'CategoryBannersManager para categorías en tienda')
      await page.waitForTimeout(1800)

      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/inicio', { waitUntil: 'domcontentloaded' })
      await mostrarBanner(page, 'Comprobación móvil (390×844) en /inicio', 'Validación responsiva en teléfono y escritorio')
      await page.waitForTimeout(1800)
    })
  })

  test('Video 12 - Favoritos desde la experiencia del visitante', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '12_visitante_favoritos_ecommerce.webm', '/shop', false, async (page) => {
      await mostrarBanner(page, 'Video 12 · Favoritos del Visitante', 'No requiere iniciar sesión: se guardan en localStorage y permanecen entre visitas')
      await page.waitForTimeout(1500)

      // Activar primer corazón en /shop
      const favBtn = page.locator('button[aria-label*="favorit" i], button[title*="favorit" i]').first()
      if (await favBtn.isVisible().catch(() => false)) {
        await favBtn.click().catch(() => {})
        await mostrarBanner(page, 'Producto agregado con el corazón', 'Ahora consultamos /favoritos')
        await page.waitForTimeout(1500)
      }

      await page.goto('/favoritos', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1800)
      await mostrarBanner(page, 'Página /favoritos · Con o sin sesión', 'Recargamos para demostrar permanencia y pasamos a cotización desde el producto')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)

      const prodLink = page.locator('a[href^="/shop/"]').first()
      if (await prodLink.isVisible().catch(() => false)) {
        await prodLink.click()
        await page.waitForTimeout(1800)
      }
    })
  })

  test('Video 13 - Crear una cotización u orden desde ecommerce', async ({ browser }) => {
    test.setTimeout(180_000)
    await grabarVideo(browser, '13_visitante_crear_cotizacion_orden.webm', '/shop', false, async (page) => {
      await mostrarBanner(page, 'Video 13 · Crear Solicitud de Cotización / Orden', 'Paso 1: Abrir detalle del producto en /shop/[slug]')
      await page.waitForTimeout(1500)

      const firstProd = page.locator('a[href^="/shop/"]').first()
      if (await firstProd.isVisible().catch(() => false)) {
        const href = await firstProd.getAttribute('href')
        if (href) {
          await page.goto(href, { waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(1800)
          await mostrarBanner(page, 'Paso 2 · Elegir variantes / pedido surtido y agregar', 'Panel de compra y solicitud directa')

          const addBtn = page.getByRole('button', { name: /Agregar|Inter[eé]s|Cotizar|Solicit/i }).first()
          if (await addBtn.isVisible().catch(() => false)) {
            await addBtn.click().catch(() => {})
            await page.waitForTimeout(1500)
          }
        }
      }

      await page.goto('/cotizacion', { waitUntil: 'domcontentloaded' })
      await mostrarBanner(page, 'Paso 3 · Revisar solicitud en /cotizacion', 'Verificar cantidades y pasar a capturar datos de contacto y Región de atención')
      await page.waitForTimeout(1800)

      await page.goto('/cotizacion/solicitud', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(1500)

      // Mostrar dónde aparece para el administrador en /ecommerce/ordenes-venta
      await loginToAdmin(page, '/ecommerce/ordenes-venta')
      await mostrarBanner(page, 'Paso 4 · Recepción en Admin (/ecommerce/ordenes-venta)', 'Aquí el administrador filtra por Región de atención, edita precios y confirma COT-...')
      await page.waitForTimeout(2000)
    })
  })
})
