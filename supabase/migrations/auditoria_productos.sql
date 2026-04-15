-- ================================================================
-- TABLA: auditoria_productos
-- Esquema: inv-tienda
-- Registra cada INSERT / UPDATE / DELETE en la tabla productos.
-- Sigue el mismo patrón que auditoriainventario del sistema.
-- ================================================================

-- 1. TABLA PRINCIPAL ─────────────────────────────────────────────
CREATE TABLE "inv-tienda".auditoria_productos (
    id                  integer  GENERATED ALWAYS AS IDENTITY NOT NULL,
    productoid          integer                               NOT NULL,
    accion              character varying(10)                 NOT NULL,  -- INSERT | UPDATE | DELETE
    campos_modificados  text[]                                NULL,      -- campos que cambiaron en UPDATE
    datos_anteriores    jsonb                                 NULL,      -- fila completa ANTES del cambio (NULL en INSERT)
    datos_nuevos        jsonb                                 NULL,      -- fila completa DESPUÉS del cambio (NULL en DELETE)
    usuarioid           integer                               NULL,      -- inv-tienda.usuarios.id (resuelto via auth.uid)
    fechaauditoria      timestamp without time zone           NOT NULL DEFAULT now(),

    CONSTRAINT auditoria_productos_pkey
        PRIMARY KEY (id),
    CONSTRAINT auditoria_productos_productoid_fkey
        FOREIGN KEY (productoid) REFERENCES "inv-tienda".productos(id),
    CONSTRAINT auditoria_productos_usuarioid_fkey
        FOREIGN KEY (usuarioid)  REFERENCES "inv-tienda".usuarios(id),
    CONSTRAINT auditoria_productos_accion_check
        CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- 2. ÍNDICES ─────────────────────────────────────────────────────
CREATE INDEX idx_auditproductos_productoid
    ON "inv-tienda".auditoria_productos USING btree (productoid);

CREATE INDEX idx_auditproductos_fecha
    ON "inv-tienda".auditoria_productos USING btree (fechaauditoria DESC);

CREATE INDEX idx_auditproductos_accion
    ON "inv-tienda".auditoria_productos USING btree (accion);

CREATE INDEX idx_auditproductos_usuarioid
    ON "inv-tienda".auditoria_productos USING btree (usuarioid);

-- ================================================================
-- 3. FUNCIÓN HELPER: obtener usuarioid desde auth.uid()
--    Reutiliza el vínculo authuserid → inv-tienda.usuarios
-- ================================================================
CREATE OR REPLACE FUNCTION "inv-tienda".get_current_usuario_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT id
    FROM   "inv-tienda".usuarios
    WHERE  auth_user_id = auth.uid()
    LIMIT  1;
$$;

-- ================================================================
-- 4. FUNCIÓN TRIGGER: fn_auditoria_productos
-- ================================================================
CREATE OR REPLACE FUNCTION "inv-tienda".fn_auditoria_productos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_productoid   integer;
    v_datos_ant    jsonb;
    v_datos_nvo    jsonb;
    v_campos       text[]  := ARRAY[]::text[];
    v_key          text;
    v_usuarioid    integer;
BEGIN
    -- Resolver usuario activo a partir de la sesión de Supabase Auth
    v_usuarioid := "inv-tienda".get_current_usuario_id();

    -- ── INSERT ──────────────────────────────────────────────────
    IF TG_OP = 'INSERT' THEN
        v_productoid := NEW.id;
        v_datos_ant  := NULL;
        v_datos_nvo  := to_jsonb(NEW);
        v_campos     := ARRAY['INSERT'];

    -- ── DELETE ──────────────────────────────────────────────────
    ELSIF TG_OP = 'DELETE' THEN
        v_productoid := OLD.id;
        v_datos_ant  := to_jsonb(OLD);
        v_datos_nvo  := NULL;
        v_campos     := ARRAY['DELETE'];

    -- ── UPDATE ──────────────────────────────────────────────────
    ELSE
        v_productoid := NEW.id;
        v_datos_ant  := to_jsonb(OLD);
        v_datos_nvo  := to_jsonb(NEW);

        -- Detectar qué campos cambiaron (excluye ruido de timestamps automáticos)
        FOR v_key IN SELECT key FROM jsonb_each(to_jsonb(NEW))
        LOOP
            IF v_key NOT IN ('updatedat', 'createdat') THEN
                IF (to_jsonb(OLD) ->> v_key) IS DISTINCT FROM (to_jsonb(NEW) ->> v_key) THEN
                    v_campos := array_append(v_campos, v_key);
                END IF;
            END IF;
        END LOOP;

        -- Si no hubo cambios reales (p.ej. solo updatedat), no registrar
        IF cardinality(v_campos) = 0 THEN
            RETURN NEW;
        END IF;
    END IF;

    -- ── Registrar en la tabla de auditoría ──────────────────────
    INSERT INTO "inv-tienda".auditoria_productos (
        productoid,
        accion,
        campos_modificados,
        datos_anteriores,
        datos_nuevos,
        usuarioid,
        fechaauditoria
    ) VALUES (
        v_productoid,
        TG_OP,
        v_campos,
        v_datos_ant,
        v_datos_nvo,
        v_usuarioid,
        now()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- ================================================================
-- 5. TRIGGER en la tabla productos
-- ================================================================
CREATE TRIGGER trg_auditoria_productos
    AFTER INSERT OR UPDATE OR DELETE
    ON "inv-tienda".productos
    FOR EACH ROW
    EXECUTE FUNCTION "inv-tienda".fn_auditoria_productos();

-- ================================================================
-- 6. VISTA ÚTIL para el frontend
--    Une la auditoría con nombres legibles (usuario, producto, marca)
-- ================================================================
CREATE OR REPLACE VIEW "inv-tienda".v_auditoria_productos AS
SELECT
    ap.id,
    ap.productoid,
    p.sku_base,
    p.nombre                   AS productonombre,
    ap.accion,
    ap.campos_modificados,
    ap.datos_anteriores,
    ap.datos_nuevos,
    ap.usuarioid,
    u.nombre_completo          AS usuarionombre,
    ap.fechaauditoria
FROM  "inv-tienda".auditoria_productos ap
JOIN  "inv-tienda".productos            p  ON p.id = ap.productoid
LEFT  JOIN "inv-tienda".usuarios        u  ON u.id = ap.usuarioid
ORDER BY ap.fechaauditoria DESC;

-- ================================================================
-- 7. PERMISOS Y POLÍTICAS RLS
-- ================================================================

-- Habilitar RLS en la tabla de auditoría
ALTER TABLE "inv-tienda".auditoria_productos ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden ver todos los registros
CREATE POLICY "auditoria_productos_select_all"
    ON "inv-tienda".auditoria_productos
    FOR SELECT
    TO authenticated
    USING (true);

-- Política: solo el sistema (via trigger) puede insertar
CREATE POLICY "auditoria_productos_insert_system"
    ON "inv-tienda".auditoria_productos
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ================================================================
-- 8. PERMISOS PARA LA VISTA
-- ================================================================

-- Asegurar que usuarios autenticados pueden leer la vista
GRANT SELECT ON "inv-tienda".v_auditoria_productos TO authenticated;