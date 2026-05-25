// scratch/setup_b2b_test_environment.js
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno de .env.local
try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.warn('Advertencia: No se pudo cargar .env.local', e.message);
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'inv-tienda' }
});

async function mcpQuery(sql, id) {
  const http = require('http');
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

async function syncUserClaimsNode(authUserId) {
  console.log(`[Sync] Sincronizando claims para ${authUserId}...`);
  const { data: usuario, error: userError } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('activo', true)
    .maybeSingle();

  if (userError || !usuario) {
    console.error(`[Sync] Error al buscar usuario o inactivo:`, userError || 'No encontrado');
    return false;
  }

  const { data: rol } = await supabaseAdmin
    .from('roles')
    .select('*')
    .eq('id', usuario.rol_id)
    .maybeSingle();

  const { data: permisos } = await supabaseAdmin
    .from('usuario_permisos')
    .select('*')
    .eq('usuario_id', usuario.id)
    .maybeSingle();

  const { data: persona } = await supabaseAdmin
    .from('personas')
    .select('id, tipo_entidad')
    .eq('usuario_id', usuario.id)
    .eq('activo', true)
    .maybeSingle();

  const { data: rolPermisos } = await supabaseAdmin
    .from('rol_permisos')
    .select('modulo, puede_leer, puede_crear, puede_editar, puede_eliminar')
    .eq('rol_id', usuario.rol_id);

  // Armar matriz de permisos
  const effectivePermissions = {};
  const modules = [
    'catalogo_productos', 'catalogo_catalogos', 'catalogo_imagenes',
    'inventario_stock', 'inventario_notas', 'inventario_bodegas', 'inventario_virtual',
    'b2b_ordenes', 'b2b_cajas', 'b2b_contenedores', 'despachos',
    'ecommerce_catalogo', 'ecommerce_ordenes', 'ecommerce_config',
    'config_usuarios', 'config_roles', 'config_auditoria_productos', 'config_tablas'
  ];
  modules.forEach(m => {
    effectivePermissions[m] = {
      puede_leer: m === 'catalogo_catalogos',
      puede_crear: false,
      puede_editar: false,
      puede_eliminar: false
    };
  });
  
  if (rol.nivel_acceso === 4 || rol.nivel_acceso === 5) {
    effectivePermissions.b2b_ordenes.puede_leer = true;
    effectivePermissions.b2b_contenedores.puede_leer = true;
  }

  (rolPermisos ?? []).forEach(p => {
    if (effectivePermissions[p.modulo]) {
      effectivePermissions[p.modulo] = {
        puede_leer: p.puede_leer ?? false,
        puede_crear: p.puede_crear ?? false,
        puede_editar: p.puede_editar ?? false,
        puede_eliminar: p.puede_eliminar ?? false
      };
    }
  });

  const claims = {
    version: 2,
    usuario_id: usuario.id,
    username: usuario.username,
    nombre_completo: usuario.nombre_completo,
    rol_id: usuario.rol_id,
    rol_nombre: rol.nombre,
    nivel_acceso: rol.nivel_acceso,
    rol_descripcion: rol.descripcion,
    permisos: permisos ? {
      es_super_admin: permisos.es_super_admin,
      puede_gestionar_compras_b2b: permisos.puede_gestionar_compras_b2b,
      puede_gestionar_contenedores: permisos.puede_gestionar_containers,
      puede_gestionar_ecommerce: permisos.puede_gestionar_ecommerce,
      puede_ver_inventario: permisos.puede_ver_inventario,
      puede_crear_notas_inventario: permisos.puede_crear_notas_inventario,
      puede_aprobar_notas_inventario: permisos.puede_aprobar_notas_inventario,
    } : null,
    persona_id: persona?.id || null,
    persona_tipo: persona?.tipo_entidad || null,
    permissions: {
      version: 2,
      modules: effectivePermissions
    }
  };

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    authUserId,
    { app_metadata: { inv_tienda_claims: claims } }
  );

  if (updateError) {
    console.error(`[Sync] Error updating claims:`, updateError.message);
    return false;
  }
  console.log(`[Sync] ✅ Claims sincronizados para ${usuario.username} (${persona?.tipo_entidad || 'Sin Persona'})`);
  return true;
}

async function main() {
  console.log('=== CONFIGURANDO AMBIENTE DE PRUEBAS B2B ===\n');

  // 1. Crear los roles de nivel 4 y 5 si no existen en la BD
  console.log('> Verificando roles B2B en la base de datos...');
  const { data: rolesExistentes } = await supabaseAdmin.from('roles').select('*');
  
  let rolCliente = rolesExistentes.find(r => r.nivel_acceso === 4);
  let rolProveedor = rolesExistentes.find(r => r.nivel_acceso === 5);

  if (!rolCliente) {
    console.log('  Insertando rol "Cliente B2B Lectura" (Nivel 4)...');
    const { data: newRol, error: errRol } = await supabaseAdmin
      .from('roles')
      .insert({
        nombre: 'Cliente B2B Lectura',
        nivel_acceso: 4,
        descripcion: 'Acceso restringido para ver sus propias órdenes y contenedores'
      })
      .select('id')
      .single();
    if (errRol) console.error('Error al insertar rol Cliente:', errRol);
    else rolCliente = newRol;
  } else {
    console.log(`  Rol Cliente B2B Lectura ya existe (ID: ${rolCliente.id})`);
  }

  if (!rolProveedor) {
    console.log('  Insertando rol "Proveedor Lectura" (Nivel 5)...');
    const { data: newRol, error: errRol } = await supabaseAdmin
      .from('roles')
      .insert({
        nombre: 'Proveedor Lectura',
        nivel_acceso: 5,
        descripcion: 'Acceso restringido para ver sus órdenes asignadas y contenedores'
      })
      .select('id')
      .single();
    if (errRol) console.error('Error al insertar rol Proveedor:', errRol);
    else rolProveedor = newRol;
  } else {
    console.log(`  Rol Proveedor Lectura ya existe (ID: ${rolProveedor.id})`);
  }

  // 2. Configurar permisos iniciales para estos roles en rol_permisos
  console.log('\n> Configurando permisos para roles B2B...');
  if (rolCliente) {
    await supabaseAdmin.from('rol_permisos').upsert([
      { rol_id: rolCliente.id, modulo: 'b2b_ordenes', puede_leer: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      { rol_id: rolCliente.id, modulo: 'b2b_contenedores', puede_leer: true, puede_crear: false, puede_editar: false, puede_eliminar: false }
    ], { onConflict: 'rol_id,modulo' });
  }
  if (rolProveedor) {
    await supabaseAdmin.from('rol_permisos').upsert([
      { rol_id: rolProveedor.id, modulo: 'b2b_ordenes', puede_leer: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      { rol_id: rolProveedor.id, modulo: 'b2b_contenedores', puede_leer: true, puede_crear: false, puede_editar: false, puede_eliminar: false }
    ], { onConflict: 'rol_id,modulo' });
  }

  // 3. Crear/Actualizar usuarios en Auth y la tabla usuarios
  const ACCOUNTS = [
    {
      email: 'andres@invtienda.com',
      password: 'Andres123!',
      nombre_completo: 'Jose Andres Mendoza',
      username: 'andres',
      rol_id: rolCliente.id
    },
    {
      email: 'moti@invtienda.com',
      password: 'Moti123!',
      nombre_completo: 'MOTI',
      username: 'moti',
      rol_id: rolProveedor.id
    },
    {
      email: 'diana@invtienda.com',
      password: 'Diana123!',
      nombre_completo: 'Diana',
      username: 'diana',
      rol_id: 7 // Admin Operativo Comercial (Nivel 2)
    }
  ];

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const linkedUserIds = {};

  console.log('\n> Creando/actualizando cuentas de usuario...');
  for (const acc of ACCOUNTS) {
    let authUser = users.find(u => u.email === acc.email);
    let authUserId;

    if (authUser) {
      console.log(`  Usuario ${acc.email} ya existe. Actualizando contraseña...`);
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password: acc.password, email_confirm: true });
      authUserId = authUser.id;
    } else {
      console.log(`  Creando usuario ${acc.email} en Auth...`);
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true
      });
      if (error) {
        console.error(`  Error al crear ${acc.email}:`, error.message);
        continue;
      }
      authUserId = data.user.id;
    }

    // Upsert en inv-tienda.usuarios
    const { data: dbUsr, error: errUsr } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        auth_user_id: authUserId,
        email: acc.email,
        nombre_completo: acc.nombre_completo,
        rol_id: acc.rol_id,
        username: acc.username,
        activo: true
      }, { onConflict: 'auth_user_id' })
      .select('id')
      .single();

    if (errUsr) {
      console.error(`  Error en tabla usuarios para ${acc.email}:`, errUsr.message);
      continue;
    }

    linkedUserIds[acc.username] = dbUsr.id;
    console.log(`  Usuario ${acc.username} listo con ID de base de datos: ${dbUsr.id}`);
  }

  // 4. Crear a Diana como Empleado en la tabla personas si no existe
  console.log('\n> Verificando persona Empleado "Diana"...');
  const { data: personaDiana } = await supabaseAdmin
    .from('personas')
    .select('*')
    .eq('nombre_completo', 'Diana')
    .maybeSingle();

  let dianaPersonaId;
  if (!personaDiana) {
    console.log('  Creando a Diana en la tabla personas...');
    const { data: newDiana, error: errDiana } = await supabaseAdmin
      .from('personas')
      .insert({
        nombre_completo: 'Diana',
        tipo_entidad: 'Empleado',
        email_contacto: 'diana@invtienda.com',
        activo: true
      })
      .select('id')
      .single();

    if (errDiana) console.error('Error al insertar Diana en personas:', errDiana.message);
    else dianaPersonaId = newDiana.id;
  } else {
    dianaPersonaId = personaDiana.id;
    console.log(`  Diana ya existe en personas (ID: ${dianaPersonaId})`);
  }

  // 5. Vincular las personas con sus respectivos usuarios en la base de datos
  console.log('\n> Vinculando personas con sus cuentas de usuario...');
  
  // Andrés (ID: 27 en personas)
  if (linkedUserIds.andres) {
    await supabaseAdmin
      .from('personas')
      .update({ usuario_id: linkedUserIds.andres, email_contacto: 'andres@invtienda.com' })
      .eq('id', 27);
    console.log('  José Andrés Mendoza (Persona 27) vinculado con usuario andres.');
  }

  // Moti (ID: 18 en personas)
  if (linkedUserIds.moti) {
    await supabaseAdmin
      .from('personas')
      .update({ usuario_id: linkedUserIds.moti, email_contacto: 'moti@invtienda.com' })
      .eq('id', 18);
    console.log('  MOTI (Persona 18) vinculado con usuario moti.');
  }

  // Diana
  if (linkedUserIds.diana && dianaPersonaId) {
    await supabaseAdmin
      .from('personas')
      .update({ usuario_id: linkedUserIds.diana })
      .eq('id', dianaPersonaId);
    console.log('  Diana (Empleado) vinculada con usuario diana.');
  }

  // 6. Sincronizar JWT Claims para todos los usuarios creados/actualizados
  console.log('\n> Sincronizando JWT Claims en Supabase Auth...');
  const { data: finalUsers } = await supabaseAdmin
    .from('usuarios')
    .select('auth_user_id')
    .in('username', ['andres', 'moti', 'diana']);

  for (const u of finalUsers || []) {
    if (u.auth_user_id) {
      await syncUserClaimsNode(u.auth_user_id);
    }
  }

  console.log('\n=== AMBIENTE B2B CONFIGURADO COMPLETAMENTE CON ÉXITO! ===');
}

main().catch(console.error);
