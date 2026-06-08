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
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
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
  const total = await mcpQuery('SELECT count(*) FROM "inv-tienda".productos;', 1);
  console.log('Total products:', total);

  const matched = await mcpQuery(`
    SELECT count(*) 
    FROM "inv-tienda".productos 
    WHERE familia ~* '^F[0-9]{3}-[0-9]{3}[A-Z]$';
  `, 2);
  console.log('Products matching unclassified pattern (F000-000C):', matched);
}

main().catch(console.error);
