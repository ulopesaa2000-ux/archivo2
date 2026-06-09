# <!-- PATH: README.md -->
# Proyecto `inv-tienda` 🚀
### *Sistema Fullstack de Gestión Operativa, Inventarios, Logística B2B y E-commerce*

<div align="center">
  <img width="1200" height="400" alt="Plataforma inv-tienda Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  <p><em>Plataforma unificada para la automatización logística e inventario omnicanal en tiempo real.</em></p>
</div>

---

## 📖 Introducción y Propósito del Proyecto
`inv-tienda` es una solución fullstack empresarial diseñada para centralizar, automatizar y robustecer las operaciones de comercio y logística. La plataforma conecta el flujo operativo interno de importaciones y almacenes con los canales de venta públicos de la empresa, eliminando silos de información y previniendo pérdidas financieras por descuadres de stock o errores de empaque.

El sistema se divide en dos grandes capas operativas:
1. **Panel de Administración (Backoffice Interno)**: Panel protegido con permisos granulares para el control técnico del catálogo de productos, inventario transaccional, bodegas físicas/virtuales, órdenes B2B, rastreo de contenedores marítimos y automatizaciones.
2. **E-commerce Público (Tienda Online)**: Tienda de cara al cliente final con catálogo interactivo, carrito de compras persistente, cotizaciones automáticas y flujo de checkout optimizado.

---

## 🛠️ Stack Tecnológico de Grado de Producción
- **Frontend & Server Actions**: Next.js 16+ con **App Router** y TypeScript estricto.
- **Base de Datos & Autenticación**: Supabase (PostgreSQL) con el esquema dedicado `inv-tienda`.
- **Diseño & UI Kit**: Tailwind CSS y **shadcn/ui** (utilizando componentes Radix y animaciones de Lucide React).
- **Integraciones & Automatización**: **n8n** (para ingestión de packing lists) + **imgproxy** (optimización reactiva de imágenes en el storage de Supabase).
- **Entorno de Ejecución**: Node.js 22 (LTS) en Docker.
- **Framework de Pruebas**: Playwright (Suite de pruebas End-to-End para flujos críticos).

---

## ⚙️ Configuración del Entorno e Instalación

### 1. Requisitos Previos
- **Node.js** v22 o superior.
- Gestor de paquetes **pnpm** (recomendado) o **npm**.

### 2. Clonación e Instalación de Dependencias
```bash
# Instalar dependencias del proyecto
npm install
# o con pnpm
pnpm install
```

### 3. Configuración de Variables de Entorno (`.env.local`)
El proyecto cuenta con un archivo `.env.example` en la raíz. Para configurar tu entorno local, crea un archivo `.env.local` en la raíz del proyecto y define las siguientes variables de acuerdo con los requerimientos operativos:

```env
# ── CONFIGURACIÓN BÁSICA DE LA APP ──
GEMINI_API_KEY="tu-gemini-api-key"
APP_URL="http://localhost:3000"

# ── SUPABASE CREDENTIALS (Conexión Directa) ──
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC..."

# ── LLAVE DE SERVICIO DE SUPABASE (Solo Lado del Servidor) ──
# ¡PRECAUCIÓN! Nunca expongas esta llave en componentes del cliente ('use client')
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC..."

# ── AUTOMATIZACIÓN LOGÍSTICA CON n8n ──
# URL base del webhook de tu instancia de n8n para la carga de packing lists
N8N_WEBHOOK_URL="https://tu-instancia-n8n.com/webhook/"
# Token de seguridad compartido para verificar que la petición provenga de n8n
N8N_WEBHOOK_SECRET="genera-un-token-seguro-openssl-base64"

# ── PROCESAMIENTO INTELIGENTE (OpenAI en n8n) ──
OPENAI_API_KEY="sk-proj-..."

# ── SUITE DE PRUEBAS PLAYWRIGHT E2E ──
PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"
TEST_ADMIN_EMAIL="admin@test.com"
TEST_ADMIN_PASSWORD="password_de_pruebas"
```

---

## ⚡ Conexión y Arquitectura de Datos con Supabase

### El Esquema `inv-tienda`
A diferencia de configuraciones estándar de Supabase que operan sobre el esquema `public`, este sistema interactúa exclusivamente con el esquema de negocio **`inv-tienda`** (que consta de 54 tablas y 11 funciones/triggers). 

Para garantizar esto sin alterar el comportamiento general de Supabase, los clientes de base de datos están explícitamente configurados para apuntar a dicho esquema.

### Clientes Supabase en la Aplicación
Para optimizar el rendimiento y respetar los límites de renderizado de Next.js, implementamos **3 clientes de Supabase** especializados ubicados en `lib/supabase/`:

1. **Cliente Browser (`client.ts`)**:
   - Usado exclusivamente en **Client Components** (`'use client'`) con interactividad en tiempo real.
   ```typescript
   import { createClient } from '@/lib/supabase/client'
   const supabase = createClient()
   ```
2. **Cliente Servidor (`server.ts`)**:
   - Usado en **Server Components** y **Server Actions** (`'use server'`). Maneja automáticamente la persistencia y lectura de cookies de sesión cifradas.
   ```typescript
   import { createClient } from '@/lib/supabase/server'
   const supabase = await createClient()
   ```
3. **Cliente Middleware (`proxy.ts`)**:
   - Corre en el borde de la aplicación (`proxy.ts`). Valida la sesión del usuario con `supabase.auth.getUser()`, refresca los tokens expirados en las cabeceras HTTP y redirige de forma segura protegiendo las rutas administrativas del backoffice.

---

## 💼 Explicación de Negocio: Módulos Clave del Sistema

El sistema está diseñado en torno al flujo real de mercancía, estructurado en los siguientes módulos operativos:

### 1. Módulo de Catálogo Técnico y Streaming Progresivo 🏷️
* **Detalle Multidimensional**: Los productos no se limitan a SKU y precio; cuentan con variantes de tallas/colores, medidas precisas por punto, composición de tela, acabados especiales y kits de conjuntos.
* **Rendimiento SPA con Streaming**: Al ingresar a `/catalogo/[id]`, los datos básicos del producto cargan en **50ms**. Las 10 pestañas asíncronas de datos técnicos pesados (Variantes, Medidas, Cajas) cargan en paralelo mediante componentes `<Suspense>` individuales, evitando pantallas en blanco.
* **Galería de Imágenes**: Sincronizada directamente y optimizada mediante CDN a través de imgproxy.

<div align="center">
  <p>📸 <em>[Insertar Captura de Pantalla: Detalle Técnico del Producto y Navegación de Pestañas]</em></p>
</div>

### 2. Módulo de Inventarios Infallible (Control Transaccional) 📦
* **Restricción Estricta**: Queda prohibido editar la tabla de stock directamente. Toda entrada, salida o transferencia física de material requiere una **Nota de Inventario**.
* **Garantía Transaccional**: El trigger relacional `fn_procesar_nota_inventario` en PostgreSQL valida y aplica los cambios físicos de stock de forma atómica únicamente cuando la nota pasa a estado **Confirmado (CONF)**.
* **Importador de Ajustes CSV**: Permite subir hojas de conteo cíclico físico en modo **Delta** (sumas/restas rápidas) o **Absoluto** (rectificación total del inventario).

<div align="center">
  <p>📸 <em>[Insertar Captura de Pantalla: Interfaz NoteDraftBuilder para el armado local de Notas de Inventario]</em></p>
</div>

### 3. Módulo de Importaciones y Contenedores B2B 🚢
* **Logística de Contenedores**: Seguimiento en tiempo real de contenedores internacionales a través de sus fases operativas (`Borrador` ➔ `En Tránsito` ➔ `En Aduana` ➔ `En Bodega` ➔ `Cerrado`).
* **Optimización CBM**: Cálculo automatizado del volumen cúbico ocupado (CBM) y peso bruto total de la carga consolidada para maximizar la capacidad contratada.
* **Matriz Talla × Color**: Cuadrícula optimizada para el registro ágil de empaques en cajas y órdenes B2B con proveedores extranjeros.
* **Multimoneda**: Conversión automática a tipo de cambio en tiempo real entre **USD, MXN y CNY (Yuanes)**.

<div align="center">
  <p>📸 <em>[Insertar Captura de Pantalla: Matriz interactiva de Talla y Color en Orden B2B]</em></p>
</div>

### 4. Automatización con n8n Webhooks 🤖
* **Carga de Packing Lists**: En lugar de capturar manualmente miles de filas de productos por contenedor, la aplicación integra un webhook conectado a n8n.
* **Procesamiento de Archivos**: Al subir el archivo Excel/CSV del proveedor extranjero, n8n valida la información operativa de los productos, recalcula cubicajes y sincroniza los ítems y las imágenes de forma masiva en segundos, eliminando errores de dedo en un **95%**.

---

## 🔐 Matriz de Seguridad y Roles Granulares

La plataforma implementa un modelo de seguridad robusto en **tres capas independientes**:

```
 ┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
 │   Capa 1: Rol Global  │ ───> │  Capa 2: Permisos de  │ ───> │ Capa 3: Acceso        │
 │   - Super Admin (1)   │      │  Módulo (B2B,        │      │ Granular por Bodega   │
 │   - Administrador (2) │      │  Contenedores, Ecom)  │      │ (Consultar, Confirmar,│
 │   - Operador (3)      │      │                       │      │ Transferir)           │
 └───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

1. **Capa 1: Roles y Nivel de Acceso**
   * *Nivel 1 (Super Admin)*: Acceso total al sistema y configuraciones.
   * *Nivel 2 (Administrador)*: Acceso a operaciones, catálogo e inventarios.
   * *Nivel 3 (Operador)*: Acceso restringido únicamente a tareas en almacén.
2. **Capa 2: Permisos Específicos por Módulo**
   * Flags independientes asignados a los usuarios en `inv-tienda.usuarios` para regular el acceso a tareas clave, tales como: `puede_gestionar_b2b`, `puede_gestionar_contenedores`, y `puede_gestionar_ecommerce`.
3. **Capa 3: Permisos Granulares por Bodega (`usuario_bodegas`)**
   * Garantiza que un operador asignado a la Bodega Norte solo pueda realizar consultas e inventarios locales, mientras que solo el supervisor asignado pueda **confirmar notas** o realizar **transferencias** a la Bodega Sur.
   * La sesión lee y persiste la bodega activa seleccionada en cookies seguras para facilitar el trabajo omnicanal.

---

## 🚀 Ejecución en Entorno Local

Una vez configurado el archivo `.env.local` y habiendo instalado las dependencias, inicia el servidor de desarrollo:

```bash
# Iniciar servidor de desarrollo en http://localhost:3000
npm run dev
# o con pnpm
pnpm dev
```

### Ejecutar Pruebas Automatizadas de E2E (Playwright)
Para validar que los flujos críticos de negocio funcionen correctamente (creación de cajas, notas de inventario y órdenes B2B):

```bash
# Instalar los navegadores de prueba la primera vez
npx playwright install

# Ejecutar la suite de pruebas
npx playwright test
```

---

## 🎯 Conclusión e Impacto de Negocio
Con `inv-tienda`, la empresa transforma un flujo logístico tradicional en un ecosistema digital automatizado. La combinación de **Next.js 16**, la solidez transaccional de **PostgreSQL**, y la automatización inteligente mediante **n8n**, se traduce directamente en:
- **Reducción masiva de tiempos operativos** de horas a segundos.
- **Trazabilidad total e histórica** de cada pieza de inventario.
- **Seguridad y confidencialidad** de datos con permisos estrictamente controlados en piso y en la web.
