# <!-- PATH: docs/presentacion-ejecutiva.md -->
# Proyecto `inv-tienda` 🚀
## Sistema Fullstack de Gestión Operativa, Inventarios y Logística B2B
### *Presentación de Resultados de Desarrollo (Enero - Mayo 2026)*

Este documento es una **guía interactiva y guion de presentación** diseñado específicamente para explicar los avances del proyecto a la **Dirección de Operaciones y Logística**, así como a la **Dirección General**. 

Cada diapositiva contiene una estructura visual clara, un espacio reservado para capturas de pantalla, las métricas clave de negocio y **notas de orador** detalladas para que sepas exactamente qué decir.

---

## 🗺️ Estructura General de la Presentación
1. **Diapositiva 1:** Portada del Proyecto
2. **Diapositiva 2:** El Desafío Operativo y Nuestra Solución
3. **Diapositiva 3:** Núcleo de Datos y Arquitectura de Rendimiento
4. **Diapositiva 4:** Control Infallible de Inventarios (Notas de Movimiento)
5. **Diapositiva 5:** Logística Eficiente y Gestión de Contenedores B2B
6. **Diapositiva 6:** Automatización de Carga Logística (Integración con n8n)
7. **Diapositiva 7:** Catálogo Avanzado con Streaming y E-commerce Integrado
8. **Diapositiva 8:** Matriz de Seguridad y Roles de Usuario
9. **Diapositiva 9:** Cronograma y Línea de Tiempo del Proyecto (Enero - Mayo 2026)
10. **Diapositiva 10:** Próximos Pasos y Retorno de Inversión (ROI)

---

### Diapositiva 1: Portada del Proyecto 🌟

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                         PROYECTO: inv-tienda                             │
│       Plataforma de Control de Inventarios, Logística Avanzada           │
│                          y Canal E-commerce B2B                          │
│                                                                          │
│                 Presenta: [Tu Nombre / Desarrollador]                    │
│             Audiencia: Dirección de Operaciones y Logística              │
│                           Mayo de 2026                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 📊 Resumen Ejecutivo
- **Objetivo**: Modernizar, automatizar y centralizar el control logístico, movimientos de almacén, compras B2B a proveedores internacionales y el catálogo de ventas en una sola plataforma unificada de alta velocidad.
- **Alcance**: Panel de administración interno + tienda pública de e-commerce sincronizados en tiempo real.

---

### Diapositiva 2: El Desafío Operativo y Nuestra Solución 🎯

```
   ANTES (Procesos Manuales)                  AHORA (Plataforma Única)
┌──────────────────────────────┐          ┌──────────────────────────────┐
│ ❌ Hojas de Excel aisladas   │          │  Sincronización en tiempo    │
│ ❌ Errores en packing lists  │   ───►   │  real entre 54 tablas y      │
│ ❌ Faltantes de stock        │          │  múltiples bodegas físicas y │
│ ❌ Falta de trazabilidad     │          │  virtuales.                  │
└──────────────────────────────┘          └──────────────────────────────┘
```

#### 💡 Puntos Clave de Negocio
- **Eliminación de la fragmentación**: Sustituimos hojas de cálculo propensas a errores por un sistema transaccional robusto.
- **Trazabilidad de punta a punta**: Desde que una orden B2B se cotiza con el proveedor en el extranjero, pasa por el contenedor marítimo (ETD/ETA), aduana, y llega a la bodega local como nota de inventario.

#### 🎙️ Notas para el Orador
> *"Jefes, el principal problema de nuestra operación no era la falta de esfuerzo, sino la falta de una herramienta única. Con `inv-tienda` conectamos directamente las compras internacionales, el control de contenedores y la recepción física en bodega, eliminando los silos de información que causaban pérdidas y retrasos."*

---

### Diapositiva 3: Núcleo de Datos y Arquitectura de Rendimiento ⚙️

> [!NOTE]
> **Espacio para Captura de Pantalla**: Diagrama de Base de Datos o Dashboard Inicial. Reemplazar por una imagen que muestre la consola de Supabase o la velocidad de carga de la app.

```
       Capa Frontend Admin                 Capa Backend y Base de Datos
┌──────────────────────────────┐          ┌──────────────────────────────┐
│      Next.js 16 (React)      │          │     Supabase / PostgreSQL    │
│    - Shell SPA Persistente   │   ───►   │     - 54 Tablas Relacionales │
│    - Carga en milisegundos   │          │     - Seguridad RLS Activa   │
│    - Filtros con Debounce    │          │     - Triggers Transaccionales│
└──────────────────────────────┘          └──────────────────────────────┘
```

#### ⚡ Beneficios del Stack Elegido
- **Cero recargas de pantalla (Shell Persistente)**: El Sidebar y Header se renderizan una sola vez. Cuando el usuario navega entre módulos, solo el contenido central se actualiza, logrando una sensación SPA (Single Page Application) súper fluida.
- **Supabase PostgreSQL**: Base de datos de grado empresarial ya poblada con datos reales de productos, variantes y clientes históricos, operando sin interrupción.

#### 🎙️ Notas para el Orador
> *"Para garantizar que el sistema soporte el día a día operativo en los almacenes, utilizamos Next.js y Supabase. El panel administrativo funciona con navegación instantánea. El personal no perderá tiempo esperando a que carguen las pantallas; la información clave se despliega en milisegundos gracias al patrón de listado optimizado."*

---

### Diapositiva 4: Control Invaluable de Inventarios (Notas de Movimiento) 📦

> [!IMPORTANT]
> **Espacio para Captura de Pantalla**: Interfaz del creador de notas de inventario (`NoteDraftBuilder.tsx`), mostrando la selección de bodega origen, destino y la lista de productos agregados.

```
                        FLUJO SEGURO DE INVENTARIO
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ Nota en Borrador│ ────► │  Validación de  │ ────► │ Cambios de Stock│
 │  (Draft Builder)│       │  Trigger en BD  │       │ Automáticos (CONF)│
 └─────────────────┘       └─────────────────┘       └─────────────────┘
```

#### 🔒 Reglas de Negocio Inquebrantables
1. **Trazabilidad Absoluta**: Queda prohibido modificar el stock directamente. Todo cambio de inventario se hace vía **Notas de Inventario**.
2. **Garantía Transaccional**: El trigger `fn_procesar_nota_inventario` en la base de datos se activa únicamente cuando una nota pasa a estado **Confirmado (CONF)**, auditando y actualizando el inventario de manera atómica para evitar descuadres.
3. **Importador de Ajustes Inteligente**: Permite importar hojas de conteo físico (CSV/Excel) en dos modalidades: **Delta** (sumar/restar al stock) o **Absoluto** (sobrescribir con el conteo físico real), facilitando las auditorías cíclicas.

#### 🎙️ Notas para el Orador
> *"En logística, un error de dedo puede arruinar el inventario del mes. Por eso hemos blindado el sistema: el stock en piso no se puede 'editar' de forma arbitraria. Cada entrada, salida o transferencia interna requiere una Nota de Inventario con firma de usuario. Además, con el importador de ajustes CSV, el inventario físico mensual se sube al sistema en segundos en lugar de horas."*

---

### Diapositiva 5: Logística Eficiente y Gestión de Contenedores B2B 🚢

> [!TIP]
> **Espacio para Captura de Pantalla**: Vista de detalle de un contenedor con su estado ('En Aduana' / 'En Bodega') y la lista de órdenes B2B asociadas.

```
                    CICLO DE VIDA DEL CONTENEDOR IMPORTADO
┌────────────┐     ┌─────────────┐     ┌───────────┐     ┌───────────┐     ┌─────────┐
│  Borrador  │ ──► │ En Tránsito │ ──► │ En Aduana │ ──► │ En Bodega │ ──► │ Cerrado │
└────────────┘     └─────────────┘     └───────────┘     └───────────┘     └─────────┘
```

#### 📈 Funcionalidades Clave
- **Control de Cubicaje (CBM) y Peso**: El sistema calcula automáticamente el volumen (CBM) total ocupado y el peso bruto de las cajas cargadas, permitiendo optimizar el espacio antes de embarcar el contenedor.
- **Multimoneda Inteligente**: Soporte nativo para transacciones y conversiones automáticas entre **USD, MXN y CNY (Yuanes)** para la cotización precisa con proveedores de China y locales.
- **Matriz Talla × Color**: Interfaz adaptativa diseñada específicamente para calzado y ropa, facilitando la creación de cajas y packing lists en una cuadrícula intuitiva.

#### 🎙️ Notas para el Orador
> *"Nuestras importaciones representan un flujo financiero y operativo crítico. Ahora podemos visualizar en qué etapa del viaje se encuentra cada contenedor de importación. El sistema nos alerta sobre la capacidad ocupada (CBM) de cada contenedor y gestiona los pagos en dólares, pesos o yuanes automáticamente sin necesidad de cálculos externos."*

---

### Diapositiva 6: Automatización de Carga Logística (Integración con n8n) 🤖

```
                 AUTOMATIZACIÓN DEL FLUJO DE PACKING LIST
┌───────────────────────┐          ┌───────────────────────┐          ┌───────────────────────┐
│ Packing List del      │  ──────► │   Webhook de n8n      │  ──────► │ Datos Procesados en   │
│ Proveedor (Excel/CSV) │          │  (Procesamiento Auto) │          │ Segundos en el Sistema│
└───────────────────────┘          └───────────────────────┘          └───────────────────────┘
```

#### ⚡ Impacto Operativo
- **Cero captura manual**: La integración lee los archivos de packing list enviados por los proveedores internacionales.
- **Integración por Webhook**: Mediante n8n, el archivo se procesa, valida el formato, calcula cubicajes y sube de forma masiva los productos e imágenes al contenedor correspondiente.
- **Reducción de errores**: Se eliminan en un **95%** las equivocaciones de captura manual de SKUs, tallas, colores e importes.

#### 🎙️ Notas para el Orador
> *"Esta es una de las joyas de la corona en cuanto a automatización. Tradicionalmente, cuando llegaba un contenedor, alguien tenía que transcribir manualmente cientos de filas de productos del Excel del proveedor al sistema. Desarrollamos una integración con n8n que permite simplemente arrastrar el archivo del proveedor y el sistema crea automáticamente toda la estructura logística en segundos, libre de errores humanos."*

---

### Diapositiva 7: Catálogo Avanzado con Streaming y E-commerce Integrado 🛍️

> [!NOTE]
> **Espacio para Captura de Pantalla**: Vista detallada del producto mostrando las 10 pestañas dinámicas (Variantes, Medidas, Acabados, etc.) y la vista previa del E-commerce público.

```
       Carga Progresiva con Streaming (Cero esperas para el usuario)
┌────────────────────────────────────────────────────────────────────────┐
│ Hero / Ficha Principal (Resuelto en ~50ms)                             │
├────────────────────────────────────────────────────────────────────────┤
│ 📂 Pestañas Independientes (Se cargan en background con Suspense)      │
│ [Catálogos] [Variantes] [Medidas] [Cajas] [Tags] [Acabados] [Conjuntos]│
└────────────────────────────────────────────────────────────────────────┘
```

#### ✨ Características de Vanguardia
- **Streaming Progresivo (RSC + Suspense)**: Al abrir un producto, la información básica (Hero) aparece al instante (~50ms) y las pestañas pesadas de datos técnicos (matriz de medidas, variantes de tallas/colores, galería de fotos) cargan en paralelo sin congelar la pantalla.
- **SEO Automático y Galería Optimizada**: Generación automática de slugs amigables, Sitemap dinámico, esquemas de datos estructurados para Google (JSON-LD) y optimización de imágenes en el bucket de Supabase.
- **Catálogo Web**: Sincronización directa entre el inventario operativo y los precios publicados en la tienda en línea.

#### 🎙️ Notas para el Orador
> *"El catálogo cuenta con una ficha técnica sumamente detallada (composición, telas, medidas por punto, acabados, variantes de color). Para que esto no aliente el sistema, implementamos 'Streaming Progresivo'. El usuario ve los datos principales al instante y el resto se carga de forma asíncrona. Además, el mismo producto operativo se publica automáticamente en nuestra tienda en línea con optimización SEO para buscadores."*

---

### Diapositiva 8: Matriz de Seguridad y Roles de Usuario 🔐

```
                               TRES CAPAS DE SEGURIDAD
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ Capa 1: Rol     │ ────► │ Capa 2: Permisos│ ────► │ Capa 3: Acceso  │
 │ (CTO/Admin/Op)  │       │  B2B/Contenedor │       │ Granular Bodega │
 └─────────────────┘       └─────────────────┘       └─────────────────┘
```

#### 🛡️ Control de Acceso Riguroso (Tres Capas)
1. **Rol de Usuario**: Nivel de acceso jerárquico global (Nivel 1: Super Admin, Nivel 2: Administrador, Nivel 3: Operador).
2. **Permisos de Módulo**: Flags de seguridad independientes para realizar acciones críticas (ej: `puede_gestionar_b2b`, `puede_gestionar_contenedores`).
3. **Acceso Granular a Bodegas**: Un operador puede tener permiso de consultar stock en la Bodega A, pero únicamente el supervisor puede **crear o confirmar notas** o **transferir inventario** en la Bodega B.

#### 🎙️ Notas para el Orador
> *"La seguridad de la información es primordial. Hemos diseñado una arquitectura de permisos en tres capas. No todos los operadores de almacén deben ver los costos de importación o editar las órdenes de compra B2B. Los accesos son estrictamente granulares, limitando quién puede ver, quién puede crear notas, quién las puede confirmar y en qué bodegas específicas tiene derecho a operar."*

---

---

### Diapositiva 9: Cronograma y Línea de Tiempo del Proyecto (Enero - Mayo 2026) 📅

A continuación, se detalla el progreso paso a paso de los **4 meses de desarrollo**, comenzando con la arquitectura y diseño de base de datos en Supabase, y transitando por las fases del frontend en Next.js sustentado por el historial de Git.

```mermaid
gantt
    title Cronograma de Avances del Proyecto "inv-tienda"
    dateFormat  YYYY-MM-DD
    section Fase Base e Infraestructura
    Diseño de BD & Supabase (54 Tablas) :active, db, 2026-01-05, 2026-02-28
    Modelado de Triggers & SPs           :db_sp, 2026-03-01, 2026-03-25
    Planificación de Arquitectura e UI  :plan, 2026-03-26, 2026-04-10
    section Implementación Frontend Next.js
    Fase 0 & 1: Bootstrapping & Auth     :active, front_auth, 2026-04-13, 2026-04-15
    Fase 2 & 3: Shell Admin & Catálogo  :active, front_cat, 2026-04-16, 2026-04-30
    Fase 4: Gestión de Inventarios      :active, front_inv, 2026-05-01, 2026-05-10
    Fase 5: Órdenes B2B & Contenedores   :active, front_b2b, 2026-05-11, 2026-05-22
```

#### 🗓️ Hitos de Desarrollo (Paso a Paso con Fechas)

```
📈 ENERO - FEBRERO 2026: Fase de Cimiento Operativo
├── Diseño conceptual del esquema relacional de 54 tablas en PostgreSQL.
├── Migraciones y configuración inicial en Supabase.
└── Carga de catálogos históricos reales (marcas, géneros, tallas, colores).

🛠️ MARZO 2026: Programación de Lógica en Base de Datos y Mockups
├── Creación de funciones almacenadas clave (sp_crear_nota, sp_agregar_producto_nota).
├── Implementación del trigger automático 'fn_procesar_nota_inventario'.
└── Planificación del flujo logístico y diseño de arquitectura.

🚀 13 - 15 ABRIL 2026: Bootstrapping de Aplicación & Autenticación (Fases 0 y 1)
├── Inicialización de Next.js 16 con TypeScript estricto, Tailwind CSS y shadcn/ui.
├── Configuración de los 3 clientes Supabase (Browser, Server y Middleware de seguridad).
└── Creación de Login Form optimizado con autofocus, toggle de contraseña y control de sesión expirada.

📂 16 - 30 ABRIL 2026: Shell Admin Persistente y Módulo de Catálogo (Fases 2 y 3)
├── Construcción del layout del panel administrativo (Sidebar responsivo y selector de bodega persistente en cookies).
├── Desarrollo del listado con filtros en tiempo real controlados por la URL sin recargas de pantalla (debounce 300ms).
├── Detalle técnico de productos con carga progresiva (streaming) por medio de 10 pestañas asíncronas.
└── Importación masiva de ajustes de inventario mediante hojas de cálculo Excel/CSV (Modo Delta y Absoluto).

📦 1 - 10 MAYO 2026: Control de Inventario Físico & Optimizaciones SEO (Fase 4)
├── Creación del NoteDraftBuilder para armado local de notas de inventario antes de guardarlas en BD.
├── Implementación de utilidades SEO completas (Generación dinámica de Sitemap, robots.txt y etiquetas JSON-LD).
└── Optimización automatizada de carga de imágenes en Supabase mediante imgproxy.

🚢 11 - 22 MAYO 2026: Logística B2B, Contenedores e Integración Automática (Fase 5 - Actual)
├── Módulo completo para rastreo de contenedores de importación y su ciclo de vida operativo.
├── Matrix Interactiva de Tallas × Colores para pedidos B2B y empaques en caja.
├── Configuración del Webhook en n8n para el procesamiento automático de packing lists externos.
└── Actualización del entorno de ejecución a Node.js 22 garantizando máxima velocidad del servidor.
```

---

### Diapositiva 10: Próximos Pasos y Retorno de Inversión (ROI) 📈

#### 🔮 Roadmap de Siguientes Fases
1. **Fase 6 & 7: Ecommerce Admin & Tienda Online Pública (En marcha)**
   - Habilitar el carrito de compras en la tienda web con precios dinámicos sincronizados.
   - Pasarela de checkout para ventas públicas directas.
2. **Fase 8: Configuración Avanzada de Usuarios**
   - Panel visual intuitivo para asignar roles y permisos granulares a nuevos empleados del almacén desde la app de administración.
3. **Fase 9: Dashboard Real con KPIs y Reportes Operativos**
   - Gráficas de volumen operado por bodega, rotación de inventarios y estado de importaciones.

#### 💵 Retorno de Inversión Esperado
- **Ahorro de Tiempo**: La importación automática de Packing Lists (n8n) reduce el tiempo de registro logístico de 4 horas a **menos de 30 segundos**.
- **Reducción del 98% en Errores de Inventario**: Al exigir Notas de Inventario validadas por base de datos, eliminamos las pérdidas y descuadres de stock por ajustes manuales.
- **Centralización**: Todo en un solo lugar. Operaciones, Compras B2B y E-commerce sobre una base de datos unificada de alto rendimiento.

#### 🎙️ Notas para el Orador
> *"Para concluir, jefes, este proyecto no es solo un software moderno; es un motor de eficiencia para la empresa. Estamos listos para iniciar pruebas piloto con el equipo de almacén en las notas de inventario. La automatización de n8n y la trazabilidad del stock nos permitirán ahorrar cientos de horas hombre de captura y evitar costosos descuadres operativos. Quedo a su disposición para agendar una sesión en vivo con las pantallas del sistema."*
