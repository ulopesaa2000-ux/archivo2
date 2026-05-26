// scratch/test_query_error.js
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
  console.log('=== TEST DE CONSULTA DIRECTA usuario_personas ===\n');

  const res = await mcpQuery('SELECT * FROM "inv-tienda".usuario_personas;', 1);
  console.log('Result:', res);

  console.log('\n=== REVISAR SCHEMAS Y TABLAS ===\n');
  const tables = await mcpQuery(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'inv-tienda' AND table_name = 'usuario_personas';
  `, 2);
  console.log('Table Exist:', tables);
}

main().catch(console.error);
