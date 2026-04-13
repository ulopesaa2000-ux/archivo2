---
trigger: always_on
---

Resumen Ejecutivo — Fases 0 a 3
FASE 0 — Bootstrapping y Estructura Base [2 días]
Qué se hizo
Crear el proyecto desde cero con toda la infraestructura necesaria antes de escribir una sola línea de lógica de negocio.

Entregables
text

PROYECTO:
  ✅ Next.js 14+ con App Router, TypeScript strict, Tailwind CSS
  ✅ shadcn/ui inicializado con ~20 componentes base

DEPENDENCIAS:
  ✅ @supabase/supabase-js + @supabase/ssr (cliente BD)
  ✅ clsx + tailwind-merge (estilos)
  ✅ lucide-react (iconos)
  ✅ use-debounce (optimización de buscadores)

SUPABASE (3 clientes):
  ✅ lib/supabase/client.ts   → browser (Client Components)
  ✅ lib/supabase/server.ts   → servidor (Server Components)
  ✅ lib/supabase/middleware.ts → middleware (protección de rutas)
  Todos configurados con schema: 'inv-tienda'

TIPOS:
  ✅ lib/types/database.types.ts → auto-generado de Supabase
  ✅ lib/types/tables.ts → 50+ aliases tipados:
     ProductoRow, VarianteProductoRow, NotaInventarioRow, BodegaRow,
     UsuarioConRol, etc. + Enums de negocio + Tipos compuestos

UTILIDADES:
  ✅ lib/constants.ts:
     TIMEZONE, LOCALE, ESTADO_NOTA, ESTADO_PRODUCTO_COLORS,
     ADMIN_ROUTES (todas las rutas tipadas), PAGE_SIZE

  ✅ lib/utils.ts (17 funciones):
     TIMEZONE:  formatDate, formatDateTime, formatTime, formatDateLong,
                formatDateTimeLong, formatTimeAgo, formatForDateTimeInput,
                formatForDateInput, inputDateTimeToUTC, nowUTC, todayMX
     MONEDA:    formatCurrency
     TEXTO:     slugify, generateSlug, generateSKU, truncate
     ESTILOS:   cn (clsx + tailwind-merge)

COMPONENTES DE OPTIMIZACIÓN:
  ✅ components/shared/Fecha.tsx       → renderiza fechas con timezone MX
  ✅ components/admin/SearchFilter.tsx  → buscador con debounce 300ms
  ✅ components/admin/SelectFilter.tsx  → filtro select via searchParams
  ✅ components/admin/ClearFilters.tsx  → limpiar todos los filtros
  ✅ components/admin/Pagination.tsx    → paginación client-side
  ✅ components/admin/PageSkeleton.tsx  → ListPageSkeleton, DetailPageSkeleton, TabSkeleton

ESTRUCTURA:
  ✅ 20+ carpetas de rutas creadas con page.tsx placeholder
  ✅ loading.tsx con skeleton en cada ruta del admin
  ✅ middleware.ts protegiendo 7 prefijos de rutas admin

PROTECCIÓN DE RUTAS:
  ✅ Sin sesión + ruta admin → redirect /login?redirect=X
  ✅ Con sesión + /login → redirect a dashboard
  ✅ Rutas del store y auth son públicas

VERIFICACIÓN:
  ✅ Página /test temporal conecta a Supabase y muestra datos
  ✅ Timezone funciona: UTC raw vs MX City formateado
Reglas establecidas
text

TIMEZONE:  BD almacena UTC → Frontend muestra America/Mexico_City
           Conversión SOLO al renderizar, NUNCA al guardar
           
CÓDIGO:    Server Components por defecto
           'use client' solo con interactividad
           Server Actions para mutaciones
           supabase.rpc() para stored procedures
           NUNCA tocar inventario_stock directamente

URLS:      Admin usa productos.id en rutas (seguro con cualquier SKU)
           Ecommerce usa productos_web.slug (SEO-friendly)
FASE 1 — Autenticación y Login [1 día]
Qué se hizo
Login funcional y moderno conectado a auth.users + inv-tienda.usuarios, con protección completa de rutas y detección de sesión expirada.

Entregables
text

MODULES:
  ✅ modules/auth/queries.ts:
     getSession()       → verifica auth con getUser() (no getSession)
     getCurrentUser()   → JOIN usuarios + roles + usuario_permisos
                          Actualiza ultimo_acceso (fire and forget)
                          Retorna null si inactivo o no registrado

  ✅ modules/auth/actions.ts:
     signIn(email, password) → Server Action:
       1. Valida inputs
       2. supabase.auth.signInWithPassword()
       3. Verifica usuario en inv-tienda.usuarios
       4. Verifica activo = true
       5. Si falla → signOut + error amigable en español
       6. Si éxito → revalidatePath + success

     signOut() → cierra sesión + revalidatePath

PÁGINAS:
  ✅ app/(auth)/layout.tsx      → centrado, gradiente, footer mínimo
  ✅ app/(auth)/login/page.tsx   → lee ?redirect= y ?expired=
  ✅ app/(auth)/login/loading.tsx → skeleton instantáneo del formulario
  ✅ app/(auth)/login/LoginForm.tsx → Client Component optimizado:
     - Autofocus en email (useRef + useEffect)
     - Validación client-side ANTES del server (regex email, vacíos)
     - useTransition (UI no se bloquea durante login)
     - Toggle show/hide password
     - Spinner en botón durante carga
     - Error con animación fade-in slide-in
     - Redirect inteligente post-login (?redirect= o /dashboard)

COMPONENTES:
  ✅ components/admin/LogoutButton.tsx:
     AlertDialog de confirmación antes de cerrar sesión
     Spinner durante logout
     Redirect a /login post-logout

HOOKS:
  ✅ hooks/useSession.ts:
     Suscripción a onAuthStateChange
     SIGNED_OUT → redirect /login?expired=true
     TOKEN_REFRESHED → router.refresh()

LAYOUT ADMIN (placeholder para Fase 2):
  ✅ app/(admin)/layout.tsx:
     getCurrentUser() → redirect si null
     Header mínimo con nombre + rol + nav + LogoutButton
     {children} como zona dinámica

MIDDLEWARE REFINADO:
  ✅ 7 prefijos admin protegidos
  ✅ ?redirect= preserva destino original
  ✅ ?expired= se limpia al redirigir
  ✅ getUser() en vez de getSession() (valida con servidor)
Flujos verificados
text

✅ Login correcto → dashboard
✅ Login incorrecto → error amigable
✅ Usuario no en inv-tienda.usuarios → signOut + error
✅ Usuario inactivo → signOut + error
✅ Acceso directo a /catalogo sin sesión → /login?redirect=/catalogo
✅ Login exitoso con redirect → llega a /catalogo
✅ Ya logueado + ir a /login → redirect automático
✅ Sesión expira → redirect automático a /login?expired=true
✅ Logout → confirmación → /login

