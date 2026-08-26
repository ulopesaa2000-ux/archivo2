# Regla 00: Base, Autenticación, RBAC y Shell Transversal

## 1. Identidad y Stack Tecnológico
- **Framework:** Next.js 16+ con App Router y React 19.
- **Tipado:** TypeScript estricto con tipos generados desde Supabase (`Database['inv-tienda']`).
- **Estilos:** Tailwind CSS 3+/4 con shadcn/ui.
- **Backend & DB:** Supabase PostgreSQL bajo el esquema `inv-tienda`.
- **Clientes Supabase:**
  - `lib/supabase/server.ts`: Server Components, Server Actions y Route Handlers (con manejo de cookies).
  - `lib/supabase/client.ts`: Client Components interactivos (`'use client'`).
  - `lib/supabase/middleware.ts`: Middleware de protección de rutas y actualización de sesión.
- **Gestor de paquetes:** Estrictamente **pnpm**.

---

## 2. Autenticación, Usuarios, Roles y Personas (RBAC)

### Entidades y Relaciones:
- `auth.users`: Identidad y credenciales gestionadas por Supabase Auth.
- `inv-tienda.usuarios`: Perfil del usuario interno (`email`, `activo`, `rol_id`, `nivel_acceso`, `ultimo_acceso`).
- `inv-tienda.roles`: Definición de roles del sistema (Super Admin, Administrador, Bodeguero, Vendedor, etc.).
- `inv-tienda.usuario_permisos`: Flags de permisos específicos por usuario (`puede_ver_inventario`, `puede_gestionar_b2b`, `puede_gestionar_ecom`, `puede_editar_precios`, etc.).
- `inv-tienda.personas`: Datos personales de contacto/fiscales vinculados mediante `usuario_personas`.
- `inv-tienda.usuario_bodegas`: Asignación de bodegas autorizadas (`puede_consultar`, `puede_operar`).

### Reglas de Control de Acceso:
1. Nivel de acceso ≤ 1: Super Admin / Acceso total al sistema y configuraciones.
2. Nivel de acceso 2: Administrador de operaciones (Catálogo, Inventario, B2B, Ecommerce).
3. Nivel de acceso ≥ 3: Operadores específicos filtrados por permisos individuales y bodegas asignadas.
4. **Verificación en Servidor:** Cada Server Action y Server Component debe validar permisos usando `getCurrentUser()` y las políticas RLS del esquema `inv-tienda`.

---

## 3. Shell Admin Persistente y Estado

### Arquitectura de Navegación:
- El shell admin reside exclusivamente en `app/(admin)/layout.tsx`.
- Sidebar y Header se renderizan una sola vez y no parpadean al navegar.
- La navegación interna utiliza `<Link>` de `next/link` con prefetch automático.
- En admin, solo `{children}` cambia entre rutas.

### Selector de Bodega Activa:
- Persiste la selección del usuario en cookies seguras (`useBodegaActiva.ts` y `getBodegaActivaFromCookies()`).
- Soporte para bodegas físicas y bodegas virtuales (`bodegas.es_virtual`).
- Si el usuario tiene acceso restringido, el selector únicamente permite elegir bodegas autorizadas en `usuario_bodegas`.

---

## 4. Convenciones Transversales Obligatorias
- **Timezone:** Todo dato de fecha en BD se almacena en UTC. Se muestra al usuario en `America/Mexico_City` usando funciones de `lib/utils.ts` (`formatDate`, `formatDateTime`) y `<Fecha />`.
- **Modales/Dialogs:** En móvil `w-full`, en escritorio anchos amplios (`sm:max-w-4xl`, `sm:max-w-[85vw]`).
- **Manejo de Errores:** Errores legibles en español, validación previa en cliente y validación estricta con Server Actions.
