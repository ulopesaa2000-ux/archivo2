# Fase 2 — Favoritos sincronizados con Supabase (IMPLEMENTADO)

> Estado: migración `create_producto_favoritos` aplicada + `modules/ecommerce/favoritos/`
> + merge en `hooks/useFavorites.ts` (reconcilia al montar y en `SIGNED_IN`).
> Solo se muestran publicados (`productos_web.activo`); lo despublicado se conserva en DB.

> Fase 1 (implementada): corazón + `/favoritos` 100% en `localStorage`
> (`inv_tienda_favorites` + mirror en cookie + evento `inv_favorites_updated`).
> Este documento deja el plan de la fase 2 con la modificación mínima a la DB:
> **una sola tabla nueva**, sin tocar tablas existentes.

## 1. Migración mínima (1 tabla)

```sql
-- supabase/migrations/2026XXXXXX_producto_favoritos.sql
CREATE TABLE IF NOT EXISTS "inv-tienda".producto_favoritos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES "inv-tienda".usuarios(id) ON DELETE CASCADE,
  producto_web_id INTEGER NOT NULL REFERENCES "inv-tienda".productos_web(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT producto_favoritos_unique UNIQUE (usuario_id, producto_web_id)
);
CREATE INDEX IF NOT EXISTS producto_favoritos_usuario_idx
  ON "inv-tienda".producto_favoritos (usuario_id);

ALTER TABLE "inv-tienda".producto_favoritos ENABLE ROW LEVEL SECURITY;

-- Lectura/escritura solo del dueño (mismo patrón que config_ecommerce):
-- auth.uid() -> usuarios.auth_user_id -> usuarios.id
CREATE POLICY producto_favoritos_select_own
  ON "inv-tienda".producto_favoritos FOR SELECT USING (
    usuario_id IN (SELECT u.id FROM "inv-tienda".usuarios u WHERE u.auth_user_id = auth.uid())
  );
CREATE POLICY producto_favoritos_insert_own
  ON "inv-tienda".producto_favoritos FOR INSERT WITH CHECK (
    usuario_id IN (SELECT u.id FROM "inv-tienda".usuarios u WHERE u.auth_user_id = auth.uid())
  );
CREATE POLICY producto_favoritos_delete_own
  ON "inv-tienda".producto_favoritos FOR DELETE USING (
    usuario_id IN (SELECT u.id FROM "inv-tienda".usuarios u WHERE u.auth_user_id = auth.uid())
  );
-- Sin policy de UPDATE: el toggle es INSERT / DELETE, no hay nada que editar.
```

Tras aplicar: regenerar tipos (`pnpm run typegen`) para que
`Database['inv-tienda']['Tables']['producto_favoritos']` exista.

## 2. Queries y actions (a grandes rasgos)

Nuevo módulo `modules/ecommerce/favoritos/` con genéricos
(`Database['inv-tienda']['Tables']['producto_favoritos']['Row']`,
regla inquebrantable §3.2.1–3.2.2) y Server Actions (`'use server'`, §3.2.8):

| Función | Qué hace |
|---|---|
| `fetchFavoritosUsuario()` (query) | `getCurrentUser()` → busca su `usuarios.id` → `select producto_web_id` de sus filas. Solo lectura, respeta RLS. |
| `agregarFavorito(productoWebId)` (action) | Inserta `(usuario_id, producto_web_id)`; si ya existe (conflicto del UNIQUE) lo trata como éxito (idempotente). `revalidatePath('/favoritos')`. |
| `quitarFavorito(productoWebId)` (action) | `delete` de esa pareja. `revalidatePath('/favoritos')`. |
| `sincronizarFavoritosPendientes(ids: number[])` (action) | **El merge del login**: lee los existentes del usuario, calcula `pendientes − existentes`, inserta solo los faltantes en un solo `insert` (o uno por uno con `onConflict: 'ignore'`), retorna `{ guardados, total }`. Solo si `guardados == faltantes` el cliente borra la lista pendiente → nunca se pierde ni se duplica nada. |

## 3. Cambios mínimos en frontend (fase 2)

1. `hooks/useFavorites.ts`: al hidratar, si hay sesión, primero pinta localStorage (instantáneo) y en paralelo llama `fetchFavoritosUsuario()` para reconciliar; al detectar `SIGNED_IN` (supabase `onAuthStateChange` o tras login) llama `sincronizarFavoritosPendientes(pending)` y solo entonces limpia la llave pendiente.
2. `toggleFavorite` con sesión: optimista en local + `agregarFavorito`/`quitarFavorito`; rollback local si la action falla.
3. Sin sesión: todo igual que fase 1 (cero cambios).
4. `FavoritosList`: la fuente pasa a ser Supabase cuando `isLogged`, con mirror local para UI instantánea.

## 4. Verificación fase 2

- `pnpm run typegen && pnpm exec tsc --noEmit`
- RLS: usuario A no ve filas de usuario B (probar con 2 cuentas).
- Flujo del enunciado: ❤️ sin sesión → IDs en localStorage → login → merge sin borrar ni duplicar → se limpia pendiente → lectura/escritura en Supabase.
