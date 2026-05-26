// scratch/fix_rls_policies.js
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
  console.log('=== CONFIGURANDO POLÍTICAS RLS PARA TABLAS B2B ===\n');

  console.log('> Habilitando permisos en usuario_personas...');
  // Habilitar y permitir ALL a usuarios autenticados para usuario_personas
  await mcpQuery('ALTER TABLE "inv-tienda".usuario_personas ENABLE ROW LEVEL SECURITY;', 1);
  await mcpQuery('DROP POLICY IF EXISTS "Permitir gestion de usuario_personas" ON "inv-tienda".usuario_personas;', 2);
  const pol1 = `
    CREATE POLICY "Permitir gestion de usuario_personas" 
    ON "inv-tienda".usuario_personas 
    FOR ALL TO authenticated 
    USING (true) 
    WITH CHECK (true);
  `;
  console.log(await mcpQuery(pol1, 3));

  console.log('\n> Habilitando permisos en orden_detalles_comentarios...');
  // Habilitar y permitir ALL a usuarios autenticados para comentarios
  await mcpQuery('ALTER TABLE "inv-tienda".orden_detalles_comentarios ENABLE ROW LEVEL SECURITY;', 4);
  await mcpQuery('DROP POLICY IF EXISTS "Permitir gestion de comentarios" ON "inv-tienda".orden_detalles_comentarios;', 5);
  const pol2 = `
    CREATE POLICY "Permitir gestion de comentarios" 
    ON "inv-tienda".orden_detalles_comentarios 
    FOR ALL TO authenticated 
    USING (true) 
    WITH CHECK (true);
  `;
  console.log(await mcpQuery(pol2, 6));

  console.log('\n> Habilitando permisos en orden_detalle_eventos...');
  // Habilitar y permitir ALL a usuarios autenticados para eventos
  await mcpQuery('ALTER TABLE "inv-tienda".orden_detalle_eventos ENABLE ROW LEVEL SECURITY;', 7);
  await mcpQuery('DROP POLICY IF EXISTS "Permitir gestion de eventos" ON "inv-tienda".orden_detalle_eventos;', 8);
  const pol3 = `
    CREATE POLICY "Permitir gestion de eventos" 
    ON "inv-tienda".orden_detalle_eventos 
    FOR ALL TO authenticated 
    USING (true) 
    WITH CHECK (true);
  `;
  console.log(await mcpQuery(pol3, 9));

  console.log('\n=== POLÍTICAS RLS CONFIGURADAS CON ÉXITO ===');
}

main().catch(console.error);
