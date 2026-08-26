// scripts\supabase\queries\query.js
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
  console.log('=== PASO 1: Insertar Roles ===');
  const roles = await mcpQuery(`
    INSERT INTO "inv-tienda".roles (nombre, descripcion, nivel_acceso)
    VALUES
      ('Super Admin',               'Acceso total sin restricciones',                                  1),
      ('Admin Operativo Comercial', 'B2B, catálogo y ecommerce. Sin control de stock/bodegas',         2),
      ('Cliente Admin Lectura',     'Solo lectura en B2B, catálogo, ecommerce e inventario general',   2),
      ('Admin Operativo Inventario','Stock, notas, aprobación y supervisión de bodegas',               2),
      ('Encargado de Bodega',       'Operación local: consulta stock y crea borradores de notas',      3)
    ON CONFLICT (nombre) DO NOTHING
    RETURNING id, nombre, nivel_acceso;
  `, 20);
  console.log(roles);

  console.log('\n=== PASO 2: Permisos Admin Operativo Comercial ===');
  const p1 = await mcpQuery(`
    INSERT INTO "inv-tienda".rol_permisos (rol_id, modulo, puede_leer, puede_crear, puede_editar, puede_eliminar)
    SELECT r.id, mod.modulo, mod.ler, mod.cre, mod.edi, mod.eli
    FROM "inv-tienda".roles r
    CROSS JOIN (VALUES
      ('catalogo_productos',   true,  true,  true,  false),
      ('catalogo_catalogos',   true,  true,  true,  false),
      ('inventario_stock',     true,  false, false, false),
      ('inventario_notas',     false, false, false, false),
      ('inventario_bodegas',   false, false, false, false),
      ('b2b_ordenes',          true,  true,  true,  false),
      ('b2b_contenedores',     true,  true,  true,  false),
      ('ecommerce_catalogo',   true,  true,  true,  false),
      ('ecommerce_ordenes',    true,  true,  true,  false),
      ('config_usuarios',      false, false, false, false),
      ('config_roles',         false, false, false, false)
    ) AS mod(modulo, ler, cre, edi, eli)
    WHERE r.nombre = 'Admin Operativo Comercial'
    ON CONFLICT DO NOTHING;
  `, 21);
  console.log(p1);

  console.log('\n=== PASO 3: Permisos Encargado de Bodega ===');
  const p2 = await mcpQuery(`
    INSERT INTO "inv-tienda".rol_permisos (rol_id, modulo, puede_leer, puede_crear, puede_editar, puede_eliminar)
    SELECT r.id, mod.modulo, mod.ler, mod.cre, mod.edi, mod.eli
    FROM "inv-tienda".roles r
    CROSS JOIN (VALUES
      ('catalogo_productos',   true,  false, false, false),
      ('catalogo_catalogos',   false, false, false, false),
      ('inventario_stock',     true,  false, false, false),
      ('inventario_notas',     true,  true,  false, false),
      ('inventario_bodegas',   false, false, false, false),
      ('b2b_ordenes',          false, false, false, false),
      ('b2b_contenedores',     false, false, false, false),
      ('ecommerce_catalogo',   false, false, false, false),
      ('ecommerce_ordenes',    false, false, false, false),
      ('config_usuarios',      false, false, false, false),
      ('config_roles',         false, false, false, false)
    ) AS mod(modulo, ler, cre, edi, eli)
    WHERE r.nombre = 'Encargado de Bodega'
    ON CONFLICT DO NOTHING;
  `, 22);
  console.log(p2);

  console.log('\n=== PASO 4: Permisos Admin Operativo Inventario ===');
  const p3 = await mcpQuery(`
    INSERT INTO "inv-tienda".rol_permisos (rol_id, modulo, puede_leer, puede_crear, puede_editar, puede_eliminar)
    SELECT r.id, mod.modulo, mod.ler, mod.cre, mod.edi, mod.eli
    FROM "inv-tienda".roles r
    CROSS JOIN (VALUES
      ('catalogo_productos',   true,  false, false, false),
      ('catalogo_catalogos',   false, false, false, false),
      ('inventario_stock',     true,  false, true,  false),
      ('inventario_notas',     true,  true,  true,  false),
      ('inventario_bodegas',   true,  true,  true,  false),
      ('b2b_ordenes',          false, false, false, false),
      ('b2b_contenedores',     false, false, false, false),
      ('ecommerce_catalogo',   false, false, false, false),
      ('ecommerce_ordenes',    false, false, false, false),
      ('config_usuarios',      false, false, false, false),
      ('config_roles',         false, false, false, false)
    ) AS mod(modulo, ler, cre, edi, eli)
    WHERE r.nombre = 'Admin Operativo Inventario'
    ON CONFLICT DO NOTHING;
  `, 23);
  console.log(p3);

  console.log('\n=== PASO 5: Permisos Cliente Admin Lectura ===');
  const p4 = await mcpQuery(`
    INSERT INTO "inv-tienda".rol_permisos (rol_id, modulo, puede_leer, puede_crear, puede_editar, puede_eliminar)
    SELECT r.id, mod.modulo, mod.ler, mod.cre, mod.edi, mod.eli
    FROM "inv-tienda".roles r
    CROSS JOIN (VALUES
      ('catalogo_productos',   true,  false, false, false),
      ('catalogo_catalogos',   true,  false, false, false),
      ('inventario_stock',     true,  false, false, false),
      ('inventario_notas',     true,  false, false, false),
      ('inventario_bodegas',   false, false, false, false),
      ('b2b_ordenes',          true,  false, false, false),
      ('b2b_contenedores',     true,  false, false, false),
      ('ecommerce_catalogo',   true,  false, false, false),
      ('ecommerce_ordenes',    true,  false, false, false),
      ('config_usuarios',      false, false, false, false),
      ('config_roles',         false, false, false, false)
    ) AS mod(modulo, ler, cre, edi, eli)
    WHERE r.nombre = 'Cliente Admin Lectura'
    ON CONFLICT DO NOTHING;
  `, 24);
  console.log(p4);

  console.log('\n=== PASO 6: Permisos Super Admin (todos en true) ===');
  const p5 = await mcpQuery(`
    INSERT INTO "inv-tienda".rol_permisos (rol_id, modulo, puede_leer, puede_crear, puede_editar, puede_eliminar)
    SELECT r.id, mod.modulo, true, true, true, true
    FROM "inv-tienda".roles r
    CROSS JOIN (VALUES
      ('catalogo_productos'), ('catalogo_catalogos'),
      ('inventario_stock'), ('inventario_notas'), ('inventario_bodegas'),
      ('b2b_ordenes'), ('b2b_contenedores'),
      ('ecommerce_catalogo'), ('ecommerce_ordenes'),
      ('config_usuarios'), ('config_roles')
    ) AS mod(modulo)
    WHERE r.nombre = 'Super Admin'
    ON CONFLICT DO NOTHING;
  `, 25);
  console.log(p5);

  console.log('\n=== VERIFICACIÓN: Roles con conteo de permisos ===');
  const verify = await mcpQuery(`
    SELECT r.nombre, r.nivel_acceso,
           COUNT(rp.modulo) AS modulos_configurados,
           SUM(CASE WHEN rp.puede_leer THEN 1 ELSE 0 END) AS puede_leer,
           SUM(CASE WHEN rp.puede_crear THEN 1 ELSE 0 END) AS puede_crear
    FROM "inv-tienda".roles r
    LEFT JOIN "inv-tienda".rol_permisos rp ON rp.rol_id = r.id
    GROUP BY r.id, r.nombre, r.nivel_acceso
    ORDER BY r.nivel_acceso;
  `, 26);
  console.log(verify);
}

main().catch(console.error);