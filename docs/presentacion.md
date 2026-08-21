<!-- C:\Users\uriel\Downloads\enero 26\archivo2\docs\presentacion.md -->
---
marp: true
theme: default
paginate: true
header: "Sistema ERP inv-tienda | Capacitación de Equipo"
footer: "Uso Interno Operativo"
style: |
  section {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 24px;
    padding: 40px;
    background-color: #f8fafc;
    color: #1e293b;
  }
  h1 {
    color: #0f172a;
    font-size: 38px;
    border-bottom: 3px solid #3b82f6;
    padding-bottom: 10px;
  }
  h2 {
    color: #1e40af;
    font-size: 30px;
  }
  h3 {
    color: #2563eb;
    font-size: 24px;
  }
  .highlight {
    background-color: #dbeafe;
    padding: 12px 18px;
    border-radius: 8px;
    border-left: 6px solid #2563eb;
  }
  .card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .card {
    background: white;
    padding: 18px;
    border-radius: 10px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    border: 1px solid #e2e8f0;
  }
  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: bold;
    color: white;
  }
  .badge-blue { background: #2563eb; }
  .badge-green { background: #16a34a; }
  .badge-amber { background: #d97706; }
  .badge-purple { background: #9333ea; }
  table {
    font-size: 20px;
    width: 100%;
  }
  th {
    background-color: #1e293b;
    color: white;
  }
---

# 📦 Bienvenido a tu Nuevo Sistema ERP
## Gestión Integral de Inventarios y Catálogo Comercial

### Capacitación para el Equipo Operativo y Administrativo

- 🎯 **Objetivo:** Conocer el sistema, aprender cómo se mueve la mercancía y cómo tus tareas diarias mantienen el control de la empresa.
- 👥 **Dirigido a:** Bodegueros, Encargados de Almacén, Equipo de Catálogo y Administración.
- 💡 **Enfoque:** 100% Práctico y Libre de Tecnisismo.

---

# 🏢 ¿Qué es un ERP y para qué sirve?

Un **ERP** (*Enterprise Resource Planning*) es como el sistema nervioso central de nuestra empresa:

1. **Un solo lugar para todo:** Adiós a libretas sueltas, notas de papel perdidas o excels desactualizados.
2. **Información en Tiempo Real:** Si entra una caja en bodega, en ese mismo segundo el sistema sabe que está disponible.
3. **Cero Dudas:** Sabemos exactamente **quién**, **cuándo**, **dónde** y **por qué** se movió una prenda o producto.

> 🌟 **El inventario es el motor principal:** Todo lo que vendemos, despachamos o compramos gira en torno a tener el stock exacto.

---

# 🧭 Mapa General del Sistema

```
                    ┌─────────────────────────┐
                    │    INICIO DE SESIÓN     │
                    │ (Usuario y Contraseña)  │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
    ┌─────────────────────────┐     ┌─────────────────────────┐
    │   MÓDULO CATÁLOGO       │     │   MÓDULO INVENTARIO     │
    │  (La Ficha del Producto)│     │  (El Movimiento Físico) │
    │ • Modelos, SKU, Fotos   │     │ • Entradas / Salidas    │
    │ • Tallas, Colores, Cajas│     │ • Traspasos / Ajustes   │
    │ • Precios sugeridos     │     │ • Control por Bodegas   │
    └────────────┬────────────┘     └────────────┬────────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │    TIENDA ONLINE / WEB  │
                    │   (Catálogo Comercial)  │
                    │  * Próximamente público │
                    └─────────────────────────┘
```

---

# 👥 Roles y Niveles de Usuario

Para mantener el orden y la seguridad, cada persona tiene un rol con permisos claros:

| Rol | ¿Qué puede hacer en el día a día? | Ejemplo de Uso |
| :--- | :--- | :--- |
| 👷 **Bodeguero** | • Consulta stock.<br>• Crea **borradores de notas** (conteo físico). | Cuenta cajas de llegada y registra lo que recibió. |
| 🧑‍💼 **Encargado de Bodega** | • Todo lo anterior.<br>• **Aprueba / Confirma notas** de su bodega.<br>• Autoriza traspasos y ajustes. | Revisa que el conteo coincida y autoriza que el stock suba. |
| 👑 **Admin de Inventario / Dirección** | • Control total de todas las bodegas.<br>• Creación de productos y precios.<br>• Reportes globales y configuración. | Da de alta usuarios, crea bodegas y supervisa cierres. |

---

# 🏬 Acceso a Bodegas Asignadas

No todos necesitan ver todas las sucursales; el sistema te muestra **únicamente las bodegas autorizadas**:

- 📍 **Selector en la barra superior:** Al iniciar sesión, verás arriba a la derecha tu **Bodega Activa**.
- 🔄 **Cambio fácil:** Si tienes acceso a varias bodegas (ej. *Bodega Principal*, *Tienda Centro*, *Bodega Virtual*), puedes alternar con un solo clic.
- 🛡️ **Seguridad total:** Las notas que crees pertenecerán automáticamente a la bodega que tengas seleccionada.

<div class="highlight">
👉 <b>Regla de oro:</b> Antes de registrar mercancía, asegúrate de tener seleccionada la bodega correcta en la esquina superior.
</div>

---

# 🔑 La Regla de Oro: ¿Cómo se Mueve el Inventario?

### ⚠️ El stock físico NUNCA se edita "a mano" ni mágicamente.

Todo incremento o descuento de mercancía ocurre a través de una **Nota de Inventario**:

1. **Paso 1: Se crea la Nota en estado BORRADOR 📝**
   - Se selecciona el motivo (*Entrada por compra*, *Salida por venta*, *Traspaso*, *Ajuste por daño*).
   - Se agregan los productos y las cantidades contadas.
2. **Paso 2: Revisión 👀**
   - En borrador puedes corregir, agregar o quitar piezas sin alterar las existencias reales.
3. **Paso 3: Aprobación / Confirmación ✅**
   - El encargado o supervisor autoriza la nota cambiando su estado a **CONFIRMADA**.
   - **¡En ese milisegundo el inventario se actualiza automáticamente!**

---

# 📝 Tipos de Notas de Inventario

<div class="card-grid">
  <div class="card">
    <h3>🟢 Entradas (Sumar Stock)</h3>
    <p>• Recepción de compras o maquila.</p>
    <p>• Devoluciones de clientes.</p>
    <p>• Carga inicial de inventario.</p>
  </div>
  <div class="card">
    <h3>🔴 Salidas (Restar Stock)</h3>
    <p>• Venta / Despacho a cliente.</p>
    <p>• Mercancía dañada o merma.</p>
    <p>• Muestras comerciales.</p>
  </div>
  <div class="card">
    <h3>🔄 Traspasos entre Bodegas</h3>
    <p>• Mueve piezas de la <i>Bodega Central</i> a la <i>Tienda Sucursal</i>.</p>
    <p>• Descuenta en origen y suma en destino sin duplicar.</p>
  </div>
  <div class="card">
    <h3>⚖️ Ajustes de Auditoría</h3>
    <p>• Cuadre tras conteo físico mensual.</p>
    <p>• Justificación obligatoria para auditoría.</p>
  </div>
</div>

---

# 🚶 Recorrido Paso a Paso: Desde el Login hasta la Nota

```
[ 1. Iniciar Sesión ] ──► Ingresa tu correo y contraseña asignada
        │
[ 2. Seleccionar Bodega ] ──► Verifica tu sucursal en el menú superior
        │
[ 3. Ir a Inventario / Notas ] ──► Clic en el menú lateral "Notas"
        │
[ 4. Nueva Nota ] ──► Botón "+ Nueva Nota" y elige Tipo (Entrada/Salida/Traspaso)
        │
[ 5. Agregar Productos ] ──► Busca por código SKU o Nombre y anota cantidades
        │
[ 6. Guardar Borrador ] ──► Queda guardada para verificación
        │
[ 7. APROBAR NOTA ] ──► Encargado presiona "Confirmar" ──► ¡Stock Actualizado!
```

---

# 🎨 El Módulo de Catálogo: La Base de Todo

El catálogo es la **biblioteca central de productos**. El inventario no podría funcionar sin él:

- 🏷️ **Ficha de Identidad:** Código único (**SKU**), Nombre descriptivo, Familia y Marca.
- 📐 **Variantes y Atributos:** Tallas (CH, M, G, XL...), Colores con muestra visual, Tipo de tela y Género.
- 📦 **Cajas y Empaques:** Número de piezas por caja y surtido de tallas/colores.
- 🖼️ **Fotografías Oficiales:** Imágenes en alta calidad del producto real.

> 💡 **Ventaja:** Cuando en bodega capturan una nota, solo buscan el SKU y el sistema autocompleta toda la información sin errores de dedo.

---

# 🌐 Futuro Inmediato: El Catálogo Web / Ecommerce

Actualmente se encuentra en preparación el **Ecommerce y Catálogo Digital**:

1. **Conexión Directa:** Todo producto que cargamos en el módulo de Catálogo con fotos y descripción podrá mostrarse a clientes externos.
2. **Precios y Ofertas:** Se definen precios públicos y promociones de forma independiente a los costos de compra.
3. **Disponibilidad Real:** Al estar conectado al inventario, el catálogo web sabrá qué modelos tienen existencia real disponible para venta.
4. **Ventas B2B y Mayoreo:** Facilitará que los clientes levanten pedidos directamente.

---

# 🛡️ Seguridad, Auditoría y Trazabilidad

### ¿Por qué este sistema protege tu trabajo?

- 🔍 **Historial Inalterable:** Cada movimiento guarda automáticamente el usuario que lo creó, la fecha y la hora exacta.
- 🔒 **Cero modificaciones no autorizadas:** Nadie puede borrar o modificar un stock "por accidente"; siempre hay una nota y un responsable que lo avala.
- 📊 **Cuentas Claras:** En cualquier inventario o auditoría, si falta o sobra una pieza, se rastrea nota por nota hasta encontrar el origen.

---

# 💡 Consejos y Buenas Prácticas

1. 🔐 **Cuida tu usuario:** No compartas tu contraseña; tus movimientos quedan firmados a tu nombre.
2. 🏷️ **Usa el buscador por SKU:** Es la forma más rápida y sin confusiones de encontrar una prenda.
3. 📦 **Verifica antes de Confirmar:** Revisa bien las cantidades en el borrador antes de que el supervisor confirme la nota.
4. 📱 **Diseño amigable:** Puedes usar el sistema cómodamente desde computadoras de escritorio, laptops y tabletas en el almacén.

---

# 🚀 ¡Comencemos a trabajar juntos!

### Resumen de beneficios para el equipo:

- ✅ **Menos tiempo en papeleo manual.**
- ✅ **Menos errores de conteo.**
- ✅ **Información confiable para todos.**
- ✅ **Un sistema ágil, moderno y fácil de usar.**

---
### ¿Dudas o Preguntas?
*¡Tu retroalimentación y uso diario hacen que el sistema mejore continuamente!*
