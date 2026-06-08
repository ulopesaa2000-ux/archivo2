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
  console.log('=== Unique families in productos ===');
  const families = await mcpQuery(`
    SELECT familia, COUNT(*) as count
    FROM "inv-tienda".productos
    GROUP BY familia
    ORDER BY count DESC;
  `, 120);
  console.log(families);

  console.log('\n=== Products with F000-000C pattern ===');
  const sampleProducts = await mcpQuery(`
    SELECT id, sku_base, nombre, familia
    FROM "inv-tienda".productos
    WHERE familia ILIKE 'F%'
    LIMIT 20;
  `, 121);
  console.log(sampleProducts);
}

main().catch(console.error);
