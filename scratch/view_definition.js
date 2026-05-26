// scratch/view_definition.js
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
  console.log('=== DEFINICION DE LA VISTA V_PRODUCTO_DETALLE ===\n');
  const result = await mcpQuery(`
    SELECT view_definition 
    FROM information_schema.views 
    WHERE table_schema = 'inv-tienda' 
      AND table_name = 'v_producto_detalle';
  `, 1);
  console.log(result);
}

main().catch(console.error);
