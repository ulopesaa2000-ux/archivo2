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
  console.log('=== Inspeccionando Usuarios y Roles ===');
  const check = await mcpQuery(`
    SELECT u.username, u.nombre_completo, r.nombre as rol_nombre, r.id as rol_id
    FROM "inv-tienda".usuarios u
    JOIN "inv-tienda".roles r ON u.rol_id = r.id;
  `, 30);
  console.log(check);

  console.log('\n=== Listado de Roles ===');
  const roles = await mcpQuery(`
    SELECT id, nombre, nivel_acceso FROM "inv-tienda".roles ORDER BY nombre;
  `, 31);
  console.log(roles);
}

main().catch(console.error);
