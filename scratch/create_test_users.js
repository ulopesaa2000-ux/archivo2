// scratch/create_test_users.js
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno de .env.local manualmente
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

const USERS_TO_CREATE = [
  {
    email: 'super@invtienda.com',
    password: 'Super123!',
    nombre_completo: 'Super Administrador Principal',
    rol_id: 6, // Super Admin (Nivel 1)
    username: 'superadmin',
    permisos: {
      es_super_admin: true,
      puede_gestionar_compras_b2b: true,
      puede_gestionar_contenedores: true,
      puede_gestionar_ecommerce: true,
      puede_ver_inventario: true,
      puede_crear_notas_inventario: true,
      puede_aprobar_notas_inventario: true,
    }
  },
  {
    email: 'comercial@invtienda.com',
    password: 'Comercial123!',
    nombre_completo: 'Jefe Operativo Comercial',
    rol_id: 7, // Admin Operativo Comercial (Nivel 2)
    username: 'jefecomercial',
    permisos: {
      es_super_admin: false,
      puede_gestionar_compras_b2b: true,
      puede_gestionar_contenedores: false,
      puede_gestionar_ecommerce: true,
      puede_ver_inventario: true,
      puede_crear_notas_inventario: false,
      puede_aprobar_notas_inventario: false,
    }
  },
  {
    email: 'inventario@invtienda.com',
    password: 'Inventario123!',
    nombre_completo: 'Admin Operativo Inventario',
    rol_id: 9, // Admin Operativo Inventario (Nivel 2)
    username: 'jefeinventario',
    permisos: {
      es_super_admin: false,
      puede_gestionar_compras_b2b: false,
      puede_gestionar_contenedores: false,
      puede_gestionar_ecommerce: false,
      puede_ver_inventario: true,
      puede_crear_notas_inventario: true,
      puede_aprobar_notas_inventario: true,
    }
  },
  {
    email: 'bodega.restringido@invtienda.com',
    password: 'Bodega123!',
    nombre_completo: 'Operador Bodega Restringido',
    rol_id: 10, // Encargado de Bodega (Nivel 3)
    username: 'bodegarestringido',
    permisos: {
      es_super_admin: false,
      puede_gestionar_compras_b2b: false,
      puede_gestionar_contenedores: false,
      puede_gestionar_ecommerce: false,
      puede_ver_inventario: false,
      puede_crear_notas_inventario: false,
      puede_aprobar_notas_inventario: false,
    }
  },
  {
    email: 'bodega.inventario@invtienda.com',
    password: 'Bodega123!',
    nombre_completo: 'Operador Bodega Inventarios',
    rol_id: 10, // Encargado de Bodega (Nivel 3)
    username: 'bodegainventario',
    permisos: {
      es_super_admin: false,
      puede_gestionar_compras_b2b: false,
      puede_gestionar_contenedores: false,
      puede_gestionar_ecommerce: false,
      puede_ver_inventario: true,
      puede_crear_notas_inventario: true,
      puede_aprobar_notas_inventario: false,
    }
  }
];

async function syncUserClaimsNode(authUserId) {
  console.log(`[Sync] Sincronizando claims para ${authUserId}...`);
  
  // 1. Obtener usuario de inv-tienda.usuarios
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

  // 2. Obtener rol
  const { data: rol, error: rolError } = await supabaseAdmin
    .from('roles')
    .select('*')
    .eq('id', usuario.rol_id)
    .maybeSingle();

  if (rolError || !rol) {
    console.error(`[Sync] Error al buscar rol:`, rolError || 'No encontrado');
    return false;
  }

  // 3. Obtener permisos individuales de usuario_permisos
  const { data: permisos, error: permError } = await supabaseAdmin
    .from('usuario_permisos')
    .select('*')
    .eq('usuario_id', usuario.id)
    .maybeSingle();

  if (permError) {
    console.error(`[Sync] Error al buscar permisos de usuario:`, permError);
  }

  // 4. Armar el objeto de claims personalizado
  const claims = {
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
      puede_gestionar_contenedores: permisos.puede_gestionar_contenedores,
      puede_gestionar_ecommerce: permisos.puede_gestionar_ecommerce,
      puede_ver_inventario: permisos.puede_ver_inventario,
      puede_crear_notas_inventario: permisos.puede_crear_notas_inventario,
      puede_aprobar_notas_inventario: permisos.puede_aprobar_notas_inventario,
    } : null
  };

  // 5. Actualizar app_metadata en Supabase Auth
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    authUserId,
    {
      app_metadata: {
        inv_tienda_claims: claims
      }
    }
  );

  if (updateError) {
    console.error(`[Sync] Error al actualizar app_metadata en Auth:`, updateError.message);
    return false;
  }

  console.log(`[Sync] ✅ Sincronización exitosa para ${usuario.email}`);
  return true;
}

async function main() {
  console.log('=== Creando/Actualizando Usuarios de Prueba ===\n');

  // Listar usuarios existentes para verificar si ya existen
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Error al listar usuarios:', listError);
    process.exit(1);
  }

  for (const userConfig of USERS_TO_CREATE) {
    console.log(`> Procesando ${userConfig.email}...`);

    let authUser = users.find(u => u.email === userConfig.email);
    let authUserId;

    if (authUser) {
      console.log(`  El usuario ya existe en auth.users (ID: ${authUser.id}). Actualizando contraseña...`);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: userConfig.password, email_confirm: true }
      );
      if (updateError) {
        console.error(`  Error al actualizar contraseña:`, updateError);
        continue;
      }
      authUserId = authUser.id;
    } else {
      console.log(`  El usuario no existe. Creando en auth.users...`);
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userConfig.email,
        password: userConfig.password,
        email_confirm: true
      });
      if (createError || !createData.user) {
        console.error(`  Error al crear usuario en auth:`, createError);
        continue;
      }
      authUserId = createData.user.id;
      console.log(`  Usuario creado exitosamente (ID: ${authUserId})`);
    }

    // 2. Upsert en "inv-tienda".usuarios
    console.log(`  Sincronizando con tabla "inv-tienda".usuarios...`);
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        auth_user_id: authUserId,
        email: userConfig.email,
        nombre_completo: userConfig.nombre_completo,
        rol_id: userConfig.rol_id,
        activo: true,
        username: userConfig.username
      }, { onConflict: 'auth_user_id' })
      .select('id')
      .single();

    if (dbError || !dbUser) {
      console.error(`  Error al insertar/actualizar en usuarios:`, dbError);
      continue;
    }

    const usuarioId = dbUser.id;
    console.log(`  Usuario en base de datos listo (ID: ${usuarioId})`);

    // 3. Upsert en "inv-tienda".usuario_permisos
    console.log(`  Configurando permisos en "inv-tienda".usuario_permisos...`);
    const { error: permError } = await supabaseAdmin
      .from('usuario_permisos')
      .upsert({
        usuario_id: usuarioId,
        ...userConfig.permisos
      }, { onConflict: 'usuario_id' });

    if (permError) {
      console.error(`  Error al guardar permisos:`, permError);
      continue;
    }

    // 4. Sincronizar JWT Claims
    await syncUserClaimsNode(authUserId);
    console.log(`--------------------------------------------------`);
  }

  console.log('\n=== Proceso finalizado con éxito! ===');
}

main().catch(console.error);
