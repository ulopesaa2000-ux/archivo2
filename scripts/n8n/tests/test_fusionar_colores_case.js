// scripts/n8n/tests/test_fusionar_colores_case.js
// Simula el nodo "Fusionar e Inteligencia" parchado (LT/DK + insensible):
// 1) translation_map aplica aunque el detalle venga en otra capitalizacion.
// 2) "Cafe Claro"/"CAFE CLARO"/"Café  Claro" generan UNA sola entrada.
// 3) Tripletes + fallback no duplican por case.
// Uso:
//   node scripts/n8n/tests/test_fusionar_colores_case.js [--workflow <json>]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function fusionar(fusionCode, original, aiData) {
  const fn = new Function('$input', '$', fusionCode);
  // Envelope real OpenRouter: choices[0].message.content con el JSON en texto
  const respuestaIA = { choices: [{ message: { content: JSON.stringify(aiData) } }] };
  const fakeInput = {
    first: () => ({ json: respuestaIA }),
    all: () => [{ json: respuestaIA }],
  };
  const fakeDollar = (name) => {
    if (String(name) === 'Preparar Ollama') return { first: () => ({ json: { original } }) };
    throw new Error('nodo inesperado: ' + name);
  };
  return fn(fakeInput, fakeDollar)[0].json;
}

function main() {
  const wfDefault = fs.readdirSync('scripts/backups')
    .filter((d) => d.startsWith('n8n_'))
    .sort()
    .map((d) => path.join('scripts/backups', d, '9XsVokBIW5HW3Pe-XP66f_packing-parser-switch-excel-reader-v13-sin-env.json'))
    .filter((f) => fs.existsSync(f))
    .pop();
  const wfPath = path.resolve(arg('workflow', wfDefault || ''));
  if (!wfPath || !fs.existsSync(wfPath)) throw new Error('Sin workflow base (usa --workflow)');

  // Genera el preview parchado en seco (no sube nada)
  const r = spawnSync('node', ['scripts/n8n/updates/update_n8n_colores_lt_dk.js', '--local', wfPath], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Fallo el parche en seco:\n' + (r.stderr || r.stdout));
  const fusionCode = fs.readFileSync(
    'C:/Users/uriel/AppData/Local/Temp/opencode/colores_ltdk_preview/fusionar_patched.js', 'utf8');
  if (!fusionCode.includes('normColorKey')) throw new Error('El preview no trae el parche C4');

  let fails = 0;
  const check = (cond, msg) => {
    console.log((cond ? 'PASS' : 'FAIL') + ' | ' + msg);
    if (!cond) fails++;
  };

  // 1) Case-insensitive en translation_map
  const out1 = fusionar(fusionCode, {
    caja_detalles_para_editar: [
      { color_raw: 'black', codigo_caja_temporal: 'CJ-1' },
      { color_raw: 'Black ', codigo_caja_temporal: 'CJ-1' },
      { color_raw: 'LT BLUE', codigo_caja_temporal: 'CJ-2' },
    ],
    cajas_para_editar: [{ codigo_caja_temporal: 'CJ-1', colores: 'black|BLACK' }],
    warnings: [],
  }, {
    translation_map: { colores: { BLACK: 'Negro', 'LT BLUE': 'Azul Claro' }, tallas: {} },
    colores: [],
    correcciones_productos: [],
    alertas_calidad: [],
  });
  check(out1.caja_detalles_para_editar.every((d) => d.color_raw === 'Negro' || d.color_raw === 'Azul Claro'),
    'detalles traducidos aunque vengan en otra capitalizacion: ' +
    JSON.stringify(out1.caja_detalles_para_editar.map((d) => d.color_raw)));
  check(out1.cajas_para_editar[0].colores === 'Negro|Negro',
    'colores de caja traducidos por pipe: ' + out1.cajas_para_editar[0].colores);
  check((out1.colores_por_confirmar || []).length === 0,
    'nada por confirmar cuando todo lo cubre el map');

  // 2) Dedup de variantes en por confirmar
  const out2 = fusionar(fusionCode, {
    caja_detalles_para_editar: [
      { color_raw: 'Cafe Claro', codigo_caja_temporal: 'CJ-1' },
      { color_raw: 'CAFE CLARO', codigo_caja_temporal: 'CJ-2' },
      { color_raw: 'Café  Claro', codigo_caja_temporal: 'CJ-3' },
    ],
    cajas_para_editar: [],
    warnings: [],
  }, { translation_map: { colores: {}, tallas: {} }, colores: [], correcciones_productos: [], alertas_calidad: [] });
  const conf2 = out2.colores_por_confirmar || [];
  check(conf2.length === 1, 'una sola entrada para 3 variantes (fue ' + conf2.length + ')');
  check(conf2[0] && conf2[0].cajas.length === 3, 'cajas fusionadas: ' + JSON.stringify(conf2[0] && conf2[0].cajas));
  check((out2.warnings || []).filter((w) => w.tipo === 'color_por_confirmar').length === 1,
    'un solo warning color_por_confirmar');

  // 3) Triplete IA + fallback mismo color no duplican
  const out3 = fusionar(fusionCode, {
    caja_detalles_para_editar: [{ color_raw: 'DK GREY', codigo_caja_temporal: 'CJ-1' }],
    cajas_para_editar: [],
    warnings: [],
  }, {
    translation_map: { colores: {}, tallas: {} },
    colores: [{ raw: 'dk grey', en: 'DARK GREY', es: 'Gris Oscuro' }],
    correcciones_productos: [],
    alertas_calidad: [],
  });
  const conf3 = out3.colores_por_confirmar || [];
  check(conf3.length === 1 && conf3[0].fuente === 'ia',
    'triplete gana sin duplicar fallback: ' + JSON.stringify(conf3.map((c) => [c.raw, c.fuente])));

  if (fails) { console.log('FALLOS: ' + fails); process.exit(1); }
  console.log('OK fusionar insensible (3/3 grupos)');
}

main();
