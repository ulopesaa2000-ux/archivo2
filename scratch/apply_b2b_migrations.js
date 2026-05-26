// scratch/apply_b2b_migrations.js
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
  console.log('=== APLICANDO MIGRACIONES B2B EN SUPABASE (FLUJO SEGURO DROP-CREATE) ===\n');

  // Paso 1: Eliminar vista existente para evitar dependencias
  console.log('> Paso 1: Eliminando vista v_producto_detalle temporalmente...');
  const sqlStep1 = 'DROP VIEW IF EXISTS "inv-tienda".v_producto_detalle CASCADE;';
  console.log(await mcpQuery(sqlStep1, 1));

  // Paso 2: Borrar columna obsoleta proveedor_id
  console.log('> Paso 2: Eliminando columna obsoleta proveedor_id de productos...');
  const sqlStep2 = 'ALTER TABLE "inv-tienda".productos DROP COLUMN IF EXISTS proveedor_id;';
  console.log(await mcpQuery(sqlStep2, 2));

  // Paso 3: Agregar columna cliente_b2b_id (por si no existe, aunque ya se creó antes)
  console.log('> Paso 3: Asegurando que existe cliente_b2b_id en productos...');
  const sqlStep3 = 'ALTER TABLE "inv-tienda".productos ADD COLUMN IF NOT EXISTS cliente_b2b_id integer REFERENCES "inv-tienda".personas(id);';
  console.log(await mcpQuery(sqlStep3, 3));

  // Paso 4: Crear la vista v_producto_detalle limpia
  console.log('> Paso 4: Creando vista v_producto_detalle con cliente_b2b_id...');
  const sqlStep4 = `
    CREATE VIEW "inv-tienda".v_producto_detalle AS
     SELECT p.id,
        p.sku_base,
        p.nombre,
        p.descripcion,
        p.composicion,
        p.precio_ec,
        p.marca_id,
        p.genero_id,
        p.tela_forro_id,
        p.tela_ext_id,
        p.edad_id,
        p.tipo_prenda_id,
        p.pz_en_caja,
        p.activo,
        p.created_at,
        p.updated_at,
        p.familia,
        p.estado,
        p.destacado,
        p.es_conjunto,
        p.persona_id,
        p.cliente_b2b_id,
        m.nombre AS marca_nombre,
        m.logo_url AS marca_logo,
        g.nombre AS genero_nombre,
        g.codigo AS genero_codigo,
        e.rango AS edad_rango,
        e.edad_talla,
        tp.nombre AS tipo_prenda_nombre,
        tp.sup_inf_compl AS tipo_prenda_clasificacion,
        tp.vista_web AS tipo_prenda_vista_web,
        tp.descripcion_prenda AS tipo_prenda_descripcion,
        te.nombre AS tela_ext_nombre,
        te.composicion AS tela_ext_composicion,
        te.tela_descripcion AS tela_ext_descripcion,
        te.elasticidad_tela AS tela_ext_elasticidad,
        te.transparencia AS tela_ext_transparencia,
        te.instrucciones_base_cuidado AS tela_ext_cuidado,
        tf.nombre AS tela_forro_nombre,
        tf.composicion AS tela_forro_composicion,
        per.nombre_completo AS persona_nombre,
        per.tipo_entidad AS persona_tipo,
        pw.id AS web_id,
        pw.slug AS web_slug,
        pw.titulo_seo AS web_titulo_seo,
        pw.descripcion_seo AS web_descripcion_seo,
        pw.keywords AS web_keywords,
        pw.precio_publico AS web_precio_publico,
        pw.precio_oferta AS web_precio_oferta,
        pw.en_oferta AS web_en_oferta,
        pw.destacado AS web_destacado,
        pw.nuevo AS web_nuevo,
        pw.activo AS web_activo,
        pw.orden_display AS web_orden_display,
        pw.visitas AS web_visitas,
        pw.fecha_publicacion AS web_fecha_publicacion,
        ( SELECT pi.url
               FROM "inv-tienda".producto_imagenes pi
              WHERE ((pi.producto_id = p.id) AND (pi.es_principal = true))
             LIMIT 1) AS imagen_principal,
        (( SELECT count(*) AS count
               FROM "inv-tienda".variantes_producto vp
              WHERE ((vp.producto_id = p.id) AND (vp.activo = true))))::integer AS total_variantes,
        (( SELECT count(*) AS count
               FROM "inv-tienda".cajas_producto cp
              WHERE (cp.producto_id = p.id)))::integer AS total_cajas,
        (( SELECT count(*) AS count
               FROM "inv-tienda".producto_imagenes pi
              WHERE (pi.producto_id = p.id)))::integer AS total_imagenes,
        (( SELECT count(*) AS count
               FROM "inv-tienda".producto_tags pt
              WHERE (pt.producto_id = p.id)))::integer AS total_tags,
        (( SELECT count(*) AS count
               FROM "inv-tienda".complemento_producto comp
              WHERE (comp.producto_id = p.id)))::integer AS total_complementos,
        (( SELECT count(*) AS count
               FROM "inv-tienda".acabado_producto ap
              WHERE (ap.producto_id = p.id)))::integer AS total_acabados,
        (( SELECT count(*) AS count
               FROM "inv-tienda".medidas_producto mp
              WHERE (mp.producto_id = p.id)))::integer AS total_medidas,
        (( SELECT count(*) AS count
               FROM "inv-tienda".producto_conjunto pc
              WHERE (pc.producto_padre_id = p.id)))::integer AS total_conjunto,
        cli.nombre_completo AS cliente_b2b_nombre
       FROM ((((((((("inv-tienda".productos p
         LEFT JOIN "inv-tienda".cat_marcas m ON ((p.marca_id = m.id)))
         LEFT JOIN "inv-tienda".cat_generos g ON ((p.genero_id = g.id)))
         LEFT JOIN "inv-tienda".cat_edades e ON ((p.edad_id = e.id)))
         LEFT JOIN "inv-tienda".cat_tipo_prenda tp ON ((p.tipo_prenda_id = tp.id)))
         LEFT JOIN "inv-tienda".cat_telas te ON ((p.tela_ext_id = te.id)))
         LEFT JOIN "inv-tienda".cat_telas tf ON ((p.tela_forro_id = tf.id)))
         LEFT JOIN "inv-tienda".personas per ON ((p.persona_id = per.id)))
         LEFT JOIN "inv-tienda".personas cli ON ((p.cliente_b2b_id = cli.id)))
         LEFT JOIN "inv-tienda".productos_web pw ON ((pw.producto_id = p.id)));
  `;
  console.log(await mcpQuery(sqlStep4, 4));

  // Paso 5: Asegurar tablas aditivas
  console.log('> Paso 5: Asegurando que las tablas aditivas (usuario_personas, comentarios, eventos) existen...');
  const sqlStep5 = `
    CREATE TABLE IF NOT EXISTS "inv-tienda".usuario_personas (
      id BIGSERIAL PRIMARY KEY,
      usuario_id UUID NOT NULL,
      persona_id INTEGER NOT NULL REFERENCES "inv-tienda".personas(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      CONSTRAINT uq_usuario_persona UNIQUE (usuario_id, persona_id)
    );
  `;
  console.log(await mcpQuery(sqlStep5, 5));

  const sqlStep6 = `
    CREATE TABLE IF NOT EXISTS "inv-tienda".orden_detalles_comentarios (
      id BIGSERIAL PRIMARY KEY,
      orden_detalle_id INTEGER NOT NULL REFERENCES "inv-tienda".ordenes_b2b_detalles(id) ON DELETE CASCADE,
      usuario_id UUID NOT NULL,
      comentario TEXT NOT NULL,
      archivo_adjunto_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `;
  console.log(await mcpQuery(sqlStep6, 6));

  const sqlStep7 = `
    CREATE TABLE IF NOT EXISTS "inv-tienda".orden_detalle_eventos (
      id BIGSERIAL PRIMARY KEY,
      orden_detalle_id INTEGER NOT NULL REFERENCES "inv-tienda".ordenes_b2b_detalles(id) ON DELETE CASCADE,
      usuario_id UUID NOT NULL,
      tipo_evento VARCHAR(50) NOT NULL,
      datos JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `;
  console.log(await mcpQuery(sqlStep7, 7));

  console.log('\n=== MIGRACIONES APLICADAS CON ÉXITO ===');
}

main().catch(console.error);
