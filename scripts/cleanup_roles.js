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
  console.log('=== Iniciando Migración y Limpieza de Roles ===');

  // 1. Migrar usuarios a los nuevos roles
  console.log('Migrando usuarios de super_admin(1) a Super Admin(6)...');
  await mcpQuery(`UPDATE "inv-tienda".usuarios SET rol_id = 6 WHERE rol_id = 1;`, 40);

  console.log('Migrando usuarios de admin_bodega_general(2) a Admin Operativo Inventario(9)...');
  await mcpQuery(`UPDATE "inv-tienda".usuarios SET rol_id = 9 WHERE rol_id = 2;`, 41);

  console.log('Migrando usuarios de encargado_bodega(3) a Encargado de Bodega(10)...');
  await mcpQuery(`UPDATE "inv-tienda".usuarios SET rol_id = 10 WHERE rol_id = 3;`, 42);

  // 2. Borrar roles antiguos (los que tienen duplicado o ya no se usan)
  console.log('Borrando roles obsoletos...');
  // Primero borrar permisos asociados a esos roles para evitar errores de FK si existen
  await mcpQuery(`DELETE FROM "inv-tienda".rol_permisos WHERE rol_id IN (1, 2, 3, 4, 5);`, 43);
  
  // Ahora borrar los roles
  const deleted = await mcpQuery(`
    DELETE FROM "inv-tienda".roles 
    WHERE id IN (1, 2, 3, 4, 5)
    RETURNING id, nombre;
  `, 44);
  console.log('Roles borrados:', deleted);

  console.log('\n=== Verificación Final ===');
  const check = await mcpQuery(`
    SELECT r.id, r.nombre, COUNT(u.id) as usuarios_count
    FROM "inv-tienda".roles r
    LEFT JOIN "inv-tienda".usuarios u ON u.rol_id = r.id
    GROUP BY r.id, r.nombre
    ORDER BY r.id;
  `, 45);
  console.log(check);
}

main().catch(console.error);
