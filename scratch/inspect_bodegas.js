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
  console.log('=== Resincronizando la secuencia de ID de bodegas ===');
  const result = await mcpQuery(`
    SELECT setval('"inv-tienda".bodegas_id_seq', (SELECT MAX(id) FROM "inv-tienda".bodegas));
  `, 1);
  console.log(result);

  console.log('\n=== Estado de la secuencia tras la resincronización ===');
  const seqVal = await mcpQuery(`
    SELECT last_value, is_called FROM "inv-tienda".bodegas_id_seq;
  `, 2);
  console.log(seqVal);
}

main().catch(console.error);
