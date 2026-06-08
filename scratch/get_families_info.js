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
  console.log('=== Sample of unique families ===');
  const families = await mcpQuery(`
    SELECT DISTINCT familia
    FROM "inv-tienda".productos
    WHERE familia IS NOT NULL
    LIMIT 50;
  `, 122);
  console.log(families);

  console.log('=== Families count ===');
  const count = await mcpQuery(`
    SELECT COUNT(DISTINCT familia) as total_families
    FROM "inv-tienda".productos;
  `, 123);
  console.log(count);
}

main().catch(console.error);
