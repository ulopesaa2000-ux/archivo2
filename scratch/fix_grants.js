// scratch/fix_grants.js
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
  console.log('=== APLICANDO GRANTS DE TABLAS PARA ROLES DE SUPABASE ===\n');

  console.log('> Otorgando permisos en "usuario_personas"...');
  await mcpQuery('GRANT ALL ON TABLE "inv-tienda".usuario_personas TO authenticated, service_role;', 1);
  await mcpQuery('GRANT ALL ON SEQUENCE "inv-tienda".usuario_personas_id_seq TO authenticated, service_role;', 2);

  console.log('> Otorgando permisos en "orden_detalles_comentarios"...');
  await mcpQuery('GRANT ALL ON TABLE "inv-tienda".orden_detalles_comentarios TO authenticated, service_role;', 3);
  await mcpQuery('GRANT ALL ON SEQUENCE "inv-tienda".orden_detalles_comentarios_id_seq TO authenticated, service_role;', 4);

  console.log('> Otorgando permisos en "orden_detalle_eventos"...');
  await mcpQuery('GRANT ALL ON TABLE "inv-tienda".orden_detalle_eventos TO authenticated, service_role;', 5);
  await mcpQuery('GRANT ALL ON SEQUENCE "inv-tienda".orden_detalle_eventos_id_seq TO authenticated, service_role;', 6);

  console.log('\n=== PERMISOS (GRANTS) APLICADOS CON ÉXITO ===');
}

main().catch(console.error);
