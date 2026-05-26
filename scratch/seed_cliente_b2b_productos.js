// scratch/seed_cliente_b2b_productos.js
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
          if (r.error) {
            reject(r.error);
          } else {
            resolve(r.result?.content?.[0]?.text ?? data);
          }
        } catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('=== ACTUALIZANDO CLIENTE B2B EN TODOS LOS PRODUCTOS ===\n');

  console.log('> Ejecutando UPDATE SET cliente_b2b_id = 27 (Jose Andres Mendoza)...');
  const sqlUpdate = 'UPDATE "inv-tienda".productos SET cliente_b2b_id = 27;';
  const result = await mcpQuery(sqlUpdate, 1);
  console.log(result);

  console.log('\n> Verificando cantidad de productos actualizados...');
  const count = await mcpQuery('SELECT count(*) FROM "inv-tienda".productos WHERE cliente_b2b_id = 27;', 2);
  console.log(count);

  console.log('\n=== PRODUCTOS ACTUALIZADOS CON ÉXITO ===');
}

main().catch(console.error);
