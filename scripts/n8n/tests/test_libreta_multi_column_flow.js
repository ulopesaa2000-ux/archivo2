// scripts/n8n/tests/test_libreta_multi_column_flow.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../../../.env.local')));

const WEBHOOK_URL = 'https://n8n.sistemaindumentaria.com/webhook/nota-movimiento-local';
const IMAGE_URL = 'https://supabase.sistemaindumentaria.com/storage/v1/object/public/comprobantes/2026/08/nota_1787864851596_842781.jpg';

async function testWebhook() {
  console.log('=== TEST DE OCR CON IMAGEN DE LIBRETA EN 2 COLUMNAS ===\n');
  console.log('URL de la imagen:', IMAGE_URL);
  console.log('Enviando petición con webhook (sin hints específicos para probar fallback a BODEGA AUX)...');

  const imgRes = await fetch(IMAGE_URL);
  const imgBlob = await imgRes.blob();

  const form = new FormData();
  form.append('foto', imgBlob, 'nota_libreta.jpg');
  form.append('usuario_id', '1');
  form.append('priorizar_ia', 'true');

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    body: form
  });

  const resJson = await response.json();
  console.log('\n--- RESPUESTA DEL WORKFLOW ---');
  console.log('Status HTTP:', response.status);
  console.log('Resumen devuelto:', JSON.stringify(resJson, null, 2));

  if (resJson && resJson.lineas) {
    console.log(`\n✅ Total de líneas extraídas: ${resJson.lineas.length}`);
    console.log('Primeras 5 líneas:', resJson.lineas.slice(0, 5));
    console.log('Últimas 5 líneas:', resJson.lineas.slice(-5));
  }
}

testWebhook().catch(console.error);
