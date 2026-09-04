// scripts/n8n/tests/test_live_packing_webhook.js
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables desde .env.local si existen
let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '../../../.env.local');
  if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath));
  }
} catch (e) {}

const webhookUrl = process.env.N8N_PACKING_WEBHOOK_URL || envConfig.N8N_PACKING_WEBHOOK_URL || 'https://n8n.sistemaindumentaria.com/webhook/packing-parser-sku-style-api';

async function testFileWebhook(filePath, label) {
  console.log(`\n======================================================`);
  console.log(`PROBANDO EN VIVO EN N8N: ${label}`);
  console.log(`Archivo: ${filePath}`);
  console.log(`URL Webhook: ${webhookUrl}`);

  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  formData.append('archivo', blob, fileName);
  formData.append('parser_selector', 'jackie');
  formData.append('proveedor', 'Jackie');
  formData.append('cliente_b2b_id', '1');

  const startTime = Date.now();
  console.log('Enviando petición a n8n...');
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Respuesta HTTP recibida en ${elapsed}s. Status: ${res.status}`);

    const rawText = await res.text();
    let json;
    try {
      json = JSON.parse(rawText);
    } catch {
      console.log('Respuesta raw (no JSON):', rawText.slice(0, 500));
      return;
    }

    // Si viene envuelto en array o en data
    const payload = Array.isArray(json) ? json[0] : json;
    const data = payload?.data || payload;

    console.log('RESULTADO DE N8N:');
    console.log(`- OK:`, payload?.ok ?? true);
    console.log(`- Mensaje UI:`, payload?.ia_info?.mensaje_ui || payload?.mensaje);
    console.log(`- Modelo IA:`, payload?.ia_info?.modelo_usado);
    console.log(`- Colores traducidos:`, payload?.ia_info?.colores_traducidos);
    console.log(`- Total productos:`, data?.resumen?.total_productos ?? data?.productos_para_editar?.length);
    console.log(`- Total cajas físicas:`, data?.resumen?.total_cajas);
    console.log(`- Total piezas:`, data?.resumen?.total_piezas);
    console.log(`- CBM orden:`, data?.resumen?.cbm_orden);
    console.log(`- Peso bruto:`, data?.resumen?.peso_bruto_total_kg);
    console.log(`- NextJS Tabs:`, JSON.stringify(data?.nextjs_tabs));

    if (data?.productos_para_editar?.length) {
      console.log('\nProductos detectados:');
      data.productos_para_editar.forEach(p => {
        console.log(`  - SKU: ${p.sku_base} | Marca: ${p.marca} | Desc: ${p.descripcion}`);
      });
    }

    if (data?.warnings?.length) {
      console.log(`\nWarnings (${data.warnings.length}):`, JSON.stringify(data.warnings.slice(0, 5), null, 2));
    }
  } catch (err) {
    console.error('Error durante la llamada:', err);
  }
}

async function main() {
  const fHonor = path.resolve(__dirname, '../../../docs/samples/packing-lists/honor 2026-8 ja.xlsx');
  await testFileWebhook(fHonor, 'Honor 2026-8 ja.xlsx (Antes daba 0 cajas)');
}

main().catch(console.error);
