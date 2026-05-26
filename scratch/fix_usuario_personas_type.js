// scratch/fix_usuario_personas_type.js
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
  console.log('=== REDEFINIENDO usuario_personas CON usuario_id INTEGER ===\n');

  console.log('> Paso 1: Eliminando tabla usuario_personas anterior...');
  await mcpQuery('DROP TABLE IF EXISTS "inv-tienda".usuario_personas CASCADE;', 1);

  console.log('> Paso 2: Creando tabla usuario_personas con usuario_id INTEGER apuntando a usuarios(id)...');
  const sqlCreate = `
    CREATE TABLE IF NOT EXISTS "inv-tienda".usuario_personas (
      id BIGSERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES "inv-tienda".usuarios(id) ON DELETE CASCADE,
      persona_id INTEGER NOT NULL REFERENCES "inv-tienda".personas(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      CONSTRAINT uq_usuario_persona UNIQUE (usuario_id, persona_id)
    );
  `;
  console.log(await mcpQuery(sqlCreate, 2));

  console.log('\n=== TABLA REDEFINIDA CON ÉXITO ===');
}

main().catch(console.error);
