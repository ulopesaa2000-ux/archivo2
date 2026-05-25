// scratch/query_personas_usuarios.js
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
  console.log('=== CONSULTANDO PERSONAS ===');
  const personas = await mcpQuery(`
    SELECT id, nombre_completo, tipo_entidad, usuario_id, email_contacto, activo 
    FROM "inv-tienda".personas 
    ORDER BY tipo_entidad, nombre_completo;
  `, 1);
  console.log(personas);

  console.log('\n=== CONSULTANDO USUARIOS ===');
  const usuarios = await mcpQuery(`
    SELECT id, username, nombre_completo, email, rol_id, activo 
    FROM "inv-tienda".usuarios 
    ORDER BY username;
  `, 2);
  console.log(usuarios);

  console.log('\n=== CONSULTANDO ROLES ===');
  const roles = await mcpQuery(`
    SELECT id, nombre, nivel_acceso, descripcion 
    FROM "inv-tienda".roles 
    ORDER BY nivel_acceso;
  `, 3);
  console.log(roles);
}

main().catch(console.error);
