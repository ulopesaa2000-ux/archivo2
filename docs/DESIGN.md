# Sistema de Diseño de `inv-tienda` (Storefront Pública)

## 🎨 Principios de Diseño Visual

La interfaz de la tienda pública (`/`) sigue una filosofía **minimalista de alta gama**, combinando la sobriedad del diseño contemporáneo con acentos de color vibrantes para jerarquía visual.

---

## 💎 Tokens de Color y Acentos por Sección

| Sección / Categoría | Tono de Acento Principal | Gradiente / Glassmorphism |
|---|---|---|
| **Fondo Principal** | Charcoal/Zinc (`#09090b` dark / `#fafafa` light) | `bg-background` con bordes `border-border` |
| **Línea Dama** | Esmeralda Refinado (`#047857` / `#10b981`) | `from-emerald-900/10 to-emerald-950/30` |
| **Línea Caballero** | Ámbar / Dorado Industrial (`#b45309` / `#f59e0b`) | `from-amber-900/10 to-zinc-950/30` |
| **Línea Infantil / Novedades** | Violeta / Cían Vibrante (`#7c3aed` / `#06b6d4`) | `from-violet-900/10 to-cyan-950/30` |

---

## 🔤 Escala de 3 Tamaños Tipográficos Configurables

El **Editor Rápido** permite seleccionar entre 3 niveles de escala tipográfica independiente tanto para **Títulos** como para **Subtítulos/Mensajes**:

### Escala de Títulos (`titleSize`)

```typescript
export function getTitleSizeClass(size?: string | null) {
  switch (size) {
    case 'small':
      return 'text-xl md:text-2xl font-bold tracking-tight'
    case 'large':
      return 'text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight'
    case 'normal':
    default:
      return 'text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight'
  }
}
```

### Escala de Subtítulos y Mensajes (`subtitleSize`)

```typescript
export function getSubtitleSizeClass(size?: string | null) {
  switch (size) {
    case 'small':
      return 'text-xs md:text-sm font-normal text-muted-foreground'
    case 'large':
      return 'text-base md:text-xl lg:text-2xl font-medium leading-relaxed'
    case 'normal':
    default:
      return 'text-sm md:text-base lg:text-lg font-normal leading-relaxed'
  }
}
```

---

## 📱 Guía Responsiva Móvil y Escritorio

- **Móvil (320px – 640px)**:
  - Rejillas de categorías en 2 columnas con tarjetas táctiles de 44px+ de alto.
  - Padding lateral compacto (`px-4 py-8`).
  - Drawer del editor a pantalla completa con navegación superior de secciones.

- **Escritorio (1024px+)**:
  - Rejillas de 4 a 7 columnas.
  - Sombra sutil y micro-elevación en hover (`hover:-translate-y-1 duration-300`).
  - Botones de edición rápida sutiles pero accesibles para el administrador.