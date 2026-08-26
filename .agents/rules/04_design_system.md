# Regla 04: Sistema de Diseño Unificado (Admin y Storefront)

Este documento define las reglas de diseño visual, componentes reutilizables, estándares de densidad y convenciones de UI para todo el ecosistema `inv-tienda` (tanto el **Panel de Administración** como la **Tienda Pública**).

---

## 1. Tokens Globales y Tipografía (`app/globals.css`)

- **Tipografías:**
  - Principal (Sans): `'Plus Jakarta Sans', system-ui, sans-serif` (`font-sans`).
  - Editorial / Acentos (Serif): `'Noto Serif', Georgia, serif` (`font-serif`).
- **Esquema de Color Semántico (OKLCH / HSL):**
  - Fondo y Superficie: `bg-background`, `bg-card`, `bg-popover`, `bg-muted`.
  - Bordes y Anillos: `border-border`, `ring-ring`.
  - Estados y Acentos:
    - **Éxito / Confirmado / Línea Dama:** Esmeralda (`bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`).
    - **Pendiente / Borrador / Línea Caballero:** Ámbar (`bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20`).
    - **Destructivo / Cancelado / Error:** Rose/Rojo (`bg-destructive/10 text-destructive border-destructive/20`).
    - **Novedades / Infantil:** Violeta / Cían (`text-violet-500` / `text-cyan-500`).
    - **Neutro:** Zinc (`bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20`).

---

## 2. Panel de Administración Interno (`app/(admin)`)

Diseñado para **alta densidad de información**, agilidad operativa y visualización sin sobrecargar al usuario.

### A. Shell Persistente y Navegación
- **Layout:** `app/(admin)/layout.tsx` persistente con sidebar colapsable y header superior.
- **Header:** Contiene el selector global de bodega (`BodegaSelector.tsx`), notificaciones, modo oscuro (`ModeToggle.tsx`) y avatar del usuario.
- **Sidebar:** Clasificado por los 3 bloques (`Catálogo`, `Inventario`, `B2B`, `Ecommerce`, `Administración`), con prefetch y resaltado activo de ruta.

### B. Tablas de Datos y Filtros (`components/admin/DataTable`)
- **Estado en URL:** Filtros, búsquedas y paginación sincronizados en `searchParams`.
- **Buscador:** Input con debounce de 300 ms (`useDebounce`) y `useTransition` para evitar bloqueos del hilo principal.
- **Paginación y Conteos:** Componente `<Pagination />` reutilizable.

### C. Modales y Diálogos (Regla Inquebrantable 3.6)
- **Móvil (<640px):** Siempre `w-full` o pantalla completa para evitar scrolls horizontales.
- **Escritorio (≥640px):**
  - **Confirmación simple o borrado:** `sm:max-w-md` o `sm:max-w-lg` (`ConfirmDeleteModal.tsx`).
  - **Formularios de alta densidad, matrices de stock, OCR y conciliación:** Ancho amplio obligatorio: `sm:max-w-4xl`, `sm:max-w-5xl` o `sm:max-w-[85vw]` con `max-h-[90vh] overflow-y-auto`.

```tsx
// Patrón de Modal Denso Reutilizable:
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Conciliador de Stock / Matriz</DialogTitle>
    </DialogHeader>
    {/* Contenido denso */}
  </DialogContent>
</Dialog>
```

### D. Botones y Acciones (`components/ui/button.tsx`)
- **Acción Principal:** `<Button variant="default">` (o acento esmeralda para confirmación de notas).
- **Acción Secundaria / Cancelar:** `<Button variant="outline">` o `<Button variant="ghost">`.
- **Acción Destructiva:** `<Button variant="destructive">`.
- **Estados de Carga:** Obligatorio pasar `disabled={isPending}` con el icono `<Loader2 className="size-4 animate-spin" />`.

### E. Notificaciones (Sonner Toasts)
Todo Server Action o mutación debe notificar al usuario con `toast` de `sonner`:
```tsx
import { toast } from 'sonner'

toast.success('Nota de inventario confirmada')
toast.error('Error al guardar', { description: error.message })
toast.promise(promoverOrdenAction(id), {
  loading: 'Ingresando mercancía a bodega...',
  success: 'Orden promovida exitosamente',
  error: (err) => `Fallo: ${err.message}`
})
```

### F. Renderizado Uniforme de Fechas
Utilizar siempre el componente compartido:
```tsx
import { Fecha } from '@/components/shared/Fecha'

<Fecha date={nota.created_at} showTime />
```

---

## 3. Tienda Online y Storefront Pública (`app/(store)`)

Diseñada para **experiencia de compra premium, estética refinada y fluidez en móvil**.

### A. Jerarquía y Tarjetas de Producto
- Tarjetas táctiles con micro-animaciones en hover (`hover:-translate-y-1 duration-300`).
- Insignias flotantes de oferta (`Badge` con descuento porcentual).
- Carga de imágenes directas del bucket con `next/image` y placeholder blur.

### B. Escalas Tipográficas Configurables
```typescript
// Escala de Títulos
export function getTitleSizeClass(size?: string | null) {
  switch (size) {
    case 'small': return 'text-xl md:text-2xl font-bold tracking-tight'
    case 'large': return 'text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight'
    case 'normal': default: return 'text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight'
  }
}

// Escala de Subtítulos
export function getSubtitleSizeClass(size?: string | null) {
  switch (size) {
    case 'small': return 'text-xs md:text-sm font-normal text-muted-foreground'
    case 'large': return 'text-base md:text-xl lg:text-2xl font-medium leading-relaxed'
    case 'normal': default: return 'text-sm md:text-base lg:text-lg font-normal leading-relaxed'
  }
}
```

### C. Carrito y Checkout Lateral (`Sheet`)
- Drawer lateral responsivo con `components/ui/sheet.tsx`.
- Desglose claro de totales, productos seleccionados y botón de checkout visible sin scroll excesivo.

---

## 4. Reglas Obligatorias de Reutilización para Desarrolladores y Agentes

1. **PROHIBIDO usar etiquetas HTML crudas sin estilizar:**
   - No usar `<button>` nativo → Usar `<Button>` de `components/ui/button`.
   - No usar `<input>` nativo → Usar `<Input>` de `components/ui/input` o `<SearchInput>`.
   - No usar `<select>` nativo → Usar `<Select>` de `components/ui/select`.
   - No usar `alert()` nativo → Usar `toast` de `sonner` o `AlertDialog`.
2. **Skeletons y Streaming:**
   - Toda ruta nueva en admin debe incluir `loading.tsx` utilizando `<PageSkeleton />` o `components/ui/skeleton.tsx`.
   - Secciones pesadas (tabs, gráficos, matrices) deben envolverse en `<Suspense fallback={<Skeleton ... />}>`.
3. **Mantenimiento de Tokens:**
   - No hardcodear colores hexadecimales (`#fff`, `#000`) en clases Tailwind arbitrarias. Usar las clases semánticas (`bg-background`, `text-foreground`, `bg-card`, etc.) para soportar tanto tema claro como oscuro sin fallas.
