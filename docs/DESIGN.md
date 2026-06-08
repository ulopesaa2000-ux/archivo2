---
name: Obsidian Retail Engine
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bccbb9'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#869585'
  outline-variant: '#3d4a3d'
  surface-tint: '#4ae176'
  primary: '#4be277'
  on-primary: '#003915'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#006e2f'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#ffba61'
  on-tertiary: '#472a00'
  tertiary-container: '#ef9900'
  on-tertiary-container: '#5c3800'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-md-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  insertion-zone-height: 80px
  drag-handle-width: 32px
---

## Brand & Style

The design system is engineered for high-density retail logistics and inventory management. It utilizes a **Corporate / Modern** aesthetic with a heavy emphasis on **Minimalism** to ensure that complex data remains legible.

The personality is authoritative, precise, and highly functional. By using a deep charcoal foundation, the UI minimizes eye strain during long working hours. Interactive elements leverage vibrant accents to guide the user's focus toward actions like drag-and-drop operations, sequencing, and status changes. The emotional response should be one of control and efficiency.

## Colors

This design system uses a dark-first color strategy. The base background is a deep black-charcoal to provide maximum contrast for white typography. 

- **Primary (Vibrant Green):** Used for success states, primary "Export" or "Save" actions, and positive status indicators.
- **Secondary (Action Blue):** Reserved for interactive sequences, primary buttons in sidebars, and active drag states.
- **Neutral:** A scale of zinc/slate greys used to define container hierarchy.
- **Functional Accents:** Amber is used for "Warning" or "Pending" SKU labels to distinguish them from finalized items.

## Typography

The system utilizes **Hanken Grotesk** for its sharp, contemporary feel and excellent legibility at small sizes. 

For technical data—such as SKUs, SKU codes, and count markers—**JetBrains Mono** is employed to provide a clear distinction between narrative text and systemic data. This monospaced choice ensures that alphanumeric strings align vertically in lists and tables.

Headers should maintain a tight letter spacing to feel "locked-in" and professional, while labels use slightly expanded tracking for clarity in high-density areas.

## Layout & Spacing

The design system follows a **Fluid Grid** model with a sidebar-content-sidebar arrangement typical of management dashboards. 

- **Vertical Rhythm:** Based on a 4px baseline.
- **Columnar Layout:** Use a 12-column grid for the main stage. In the provided retail view, the screen is split into three functional zones: Unassigned (left), Master Sequence (center), and Controls (right).
- **Insertion Zones:** These specific vertical spaces are reserved for drag-and-drop feedback. They expand to a minimum height of 80px when an item is hovered over them.
- **Mobile Reflow:** On mobile devices, sidebars collapse into drawers, and the Master Sequence becomes the primary scrollable view.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** rather than heavy shadows. 

1. **Base:** `#09090B` (Canvas)
2. **Level 1 Containers:** `#18181B` (Columns/Sidebars)
3. **Level 2 Cards:** `#27272A` (Product Items/Draggables)
4. **Floating Tooltips:** `#3F3F46` with a `12px` blur shadow to separate them from the grid.

**Interaction Depth:** When an element is "picked up" for dragging, it should scale by 2% and receive a `0 10px 15px -3px rgba(0, 0, 0, 0.5)` shadow to simulate physical lift.

## Shapes

The design system adopts a **Soft** shape language. 

- **Cards & Inputs:** 0.25rem (4px) corner radius for a precise, technical look.
- **Primary Action Buttons:** 0.5rem (8px) to make them feel more approachable and distinct from the structural grid.
- **Insertion Zones:** Defined by a `1px dashed` border using the `secondary_color` (Blue) or `border_subtle` depending on state. This visual metaphor clearly signals where a user can drop an item.
- **SKU Tags:** Fully rounded (pill-shaped) to distinguish them from square functional buttons.

## Components

### Buttons & Actions
- **Primary:** Solid fill (`primary_color` or `secondary_color`) with high-contrast white text.
- **Ghost/Tertiary:** No background, `border_subtle` outline, used for "Work" or "Edit" actions within cards.

### Drag-and-Drop Cards
- Product cards must include a visible "Handle" icon (6-dot grid).
- Selection state: A `2px` solid blue border when a checkbox is active.

### Insertion Zones
- **Default:** Dashed border, light grey text ("Drop here").
- **Active Hover:** Border changes to `primary_color` (Green), background gains a 5% opacity tint of the primary color.

### Floating Tooltips
- Markers that appear during dragging or on hover of SKU details.
- Use a dark background (`surface_card`) with a small "tail" or pointer.

### Status Chips
- Small, uppercase labels using `label-mono`. Use Amber for warning/pending and Green for assigned/active.