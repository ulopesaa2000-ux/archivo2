# Plan: Fix Programming Issues

## Key Finding

**`tsc --noEmit` returns 0 errors** — all TypeScript errors in the log files (`docs/development/errors.txt`, `ts_errors.txt`, etc.) are **stale/already fixed**.

**ESLint finds 27 problems (17 errors, 10 warnings)** — these are the **real current issues**.

---

## ESLint Errors (17)

### Category A: `react-hooks/set-state-in-effect` — 5 occurrences

Calling `setState` synchronously inside `useEffect` causes cascading renders. These should be refactored to use `useSyncExternalStore`, lazy initialization, or event handlers.

| # | File | Line | Code | Fix |
|---|------|------|------|-----|
| A1 | [`CatalogoCreateDialog.tsx`](app/(admin)/catalogo/CatalogoCreateDialog.tsx:53) | 53 | `setFormKey('')` in useEffect | Move to event handler (onOpenChange) or use a `key` prop on the form |
| A2 | [`CatalogoCreateDialog.tsx`](app/(admin)/catalogo/CatalogoCreateDialog.tsx:107) | 107 | `setFormValues({...})` in useEffect | Derive from `producto` prop or use `key` to reset |
| A3 | [`StockMatrixFilters.tsx`](app/(admin)/inventario/stock/StockMatrixFilters.tsx:36) | 36 | `setLocalQ(searchParams.get('q') ?? '')` | Use `useSyncExternalStore` or derive from searchParams directly |
| A4 | [`OrdenFormDialog.tsx`](app/(admin)/ordenes-b2b/OrdenFormDialog.tsx:37) | 37 | `if (!open) setError(null)` | Move to `onOpenChange` callback |
| A5 | [`useQuoteCart.ts`](hooks/useQuoteCart.ts:21) | 21 | `setItems(parsed.items \|\| [])` | Use lazy initializer in `useState` or `useSyncExternalStore` |

### Category B: `react/no-unescaped-entities` — 12 occurrences

Unescaped `"` characters in JSX text. Replace with `"`, `&ldquo;`/`&rdquo;`, or `{'"'}`.

| # | File | Line | Count |
|---|------|------|-------|
| B1 | [`TabCajas.tsx`](app/(admin)/catalogo/[id]/components/TabCajas.tsx:128) | 128 | 2 |
| B2 | [`TabComplementos.tsx`](app/(admin)/catalogo/[id]/components/TabComplementos.tsx:243) | 243 | 2 |
| B3 | [`TabComplementos.tsx`](app/(admin)/catalogo/[id]/components/TabComplementos.tsx:283) | 281 | 2 |
| B4 | [`StockMatrixTable.tsx`](app/(admin)/inventario/stock/StockMatrixTable.tsx:57) | 57 | 2 |
| B5 | [`ConfigForm.tsx`](components/admin/ecommerce/ConfigForm.tsx:298) | 298 | 2 |
| B6 | [`ConfigForm.tsx`](components/admin/ecommerce/ConfigForm.tsx:315) | 315 | 2 |

---

## ESLint Warnings (10)

### Category C: `react-hooks/exhaustive-deps` — 2 occurrences

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| C1 | [`CatalogoCreateDialog.tsx`](app/(admin)/catalogo/CatalogoCreateDialog.tsx:102) | 102 | Missing `isEdit` dependency | Add `isEdit` to dep array |
| C2 | [`ProductosNoPublicados.tsx`](components/admin/ecommerce/ProductosNoPublicados.tsx:56) | 56 | Unnecessary `busqueda` dependency | Remove `busqueda` from dep array |

### Category D: `@next/next/no-img-element` — 5 occurrences

Using `<img>` instead of Next.js `<Image />`. Replace with `next/image` `<Image>` component.

| # | File | Line |
|---|------|------|
| D1 | [`HeroProducto.tsx`](app/(admin)/catalogo/[id]/components/HeroProducto.tsx:330) | 330 |
| D2 | [`TabConjunto.tsx`](app/(admin)/catalogo/[id]/components/TabConjunto.tsx:108) | 108 |
| D3 | [`TabImagenes.tsx`](app/(admin)/catalogo/[id]/components/TabImagenes.tsx:18) | 18 |
| D4 | [`TabImagenes.tsx`](app/(admin)/catalogo/[id]/components/TabImagenes.tsx:429) | 429 |
| D5 | [`page.tsx (store)`](app/(store)/page.tsx:45) | 45 |

### Category E: `@next/next/no-html-link-for-pages` — 3 occurrences

Using `<a>` for internal navigation instead of `<Link />`.

| # | File | Line | Target |
|---|------|------|--------|
| E1 | [`shop/[slug]/page.tsx`](app/(store)/shop/[slug]/page.tsx:117) | 117 | `/` |
| E2 | [`shop/[slug]/page.tsx`](app/(store)/shop/[slug]/page.tsx:123) | 123 | `/shop/` |
| E3 | [`shop/page.tsx`](app/(store)/shop/page.tsx:109) | 109 | `/` |

---

## Execution Priority

1. **Category B** (unescaped entities) — Quick mechanical fix, no logic changes
2. **Category E** (html links) — Quick mechanical fix, replace `<a>` with `<Link>`
3. **Category C** (exhaustive-deps) — Simple dep array fixes
4. **Category A** (set-state-in-effect) — Requires careful refactoring, most complex
5. **Category D** (img → Image) — Requires understanding image dimensions/external domains

## Files to Modify (11 total)

| File | Categories | Risk |
|------|-----------|------|
| `app/(admin)/catalogo/CatalogoCreateDialog.tsx` | A1, A2, C1 | Medium |
| `app/(admin)/catalogo/[id]/components/TabCajas.tsx` | B1 | Low |
| `app/(admin)/catalogo/[id]/components/TabComplementos.tsx` | B2, B3 | Low |
| `app/(admin)/catalogo/[id]/components/TabConjunto.tsx` | B, D2 | Low |
| `app/(admin)/catalogo/[id]/components/HeroProducto.tsx` | D1 | Low |
| `app/(admin)/catalogo/[id]/components/TabImagenes.tsx` | D3, D4 | Low |
| `app/(admin)/inventario/stock/StockMatrixFilters.tsx` | A3 | Medium |
| `app/(admin)/inventario/stock/StockMatrixTable.tsx` | B4 | Low |
| `app/(admin)/ordenes-b2b/OrdenFormDialog.tsx` | A4 | Medium |
| `hooks/useQuoteCart.ts` | A5 | Medium |
| `components/admin/ecommerce/ConfigForm.tsx` | B5, B6 | Low |
| `components/admin/ecommerce/ProductosNoPublicados.tsx` | C2 | Low |
| `app/(store)/page.tsx` | D5 | Low |
| `app/(store)/shop/page.tsx` | E3 | Low |
| `app/(store)/shop/[slug]/page.tsx` | E1, E2 | Low |
