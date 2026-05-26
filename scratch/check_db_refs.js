// scratch/check_db_refs.js
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
  console.log('=== VERIFICANDO REFERENCIAS DE PRODUCTOS.PROVEEDOR_ID EN BASE DE DATOS ===\n');

  console.log('> Buscando en Vistas que mencionen "proveedor_id"...');
  const views = await mcpQuery(`
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_schema = 'inv-tienda' 
      AND view_definition ILIKE '%proveedor_id%';
  `, 1);
  console.log(views);

  console.log('\n> Buscando en Funciones/Triggers que mencionen "proveedor_id"...');
  const functions = await mcpQuery(`
    SELECT p.proname 
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'inv-tienda' 
      AND p.prosrc ILIKE '%proveedor_id%';
  `, 2);
  console.log(functions);
}

main().catch(console.error);
