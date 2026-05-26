// scratch/inspect_schema.js
const http = require('http');

function mcpQuery(sql, id) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0', id,
      method: 'tools/call',
      params: { name: 'execute_sql', arguments: { query: sql } }
    });
    const req = http.request({
      hostname: 'localhost', port: 8080, path: '/mcp', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          resolve(r.result?.content?.[0]?.text ?? data);
        } catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('=== INSPECCIONANDO ESTRUCTURA DE LA TABLA productos ===\n');
  const cols = await mcpQuery(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'inv-tienda' AND table_name = 'productos';
  `, 1);
  console.log(cols);

  console.log('\n=== DEFINICIÓN DE VISTAS MENCIONADAS ===\n');

  console.log('> v_producto_detalle:');
  const v1 = await mcpQuery(`
    SELECT view_definition
    FROM information_schema.views
    WHERE table_schema = 'inv-tienda' AND table_name = 'v_producto_detalle';
  `, 2);
  console.log(v1);

  console.log('\n> v_contenedor_resumen:');
  const v2 = await mcpQuery(`
    SELECT view_definition
    FROM information_schema.views
    WHERE table_schema = 'inv-tienda' AND table_name = 'v_contenedor_resumen';
  `, 3);
  console.log(v2);

  console.log('\n> v_producto_cajas:');
  const v3 = await mcpQuery(`
    SELECT view_definition
    FROM information_schema.views
    WHERE table_schema = 'inv-tienda' AND table_name = 'v_producto_cajas';
  `, 4);
  console.log(v3);
}

main().catch(console.error);
