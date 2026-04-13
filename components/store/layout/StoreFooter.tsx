// components/store/layout/StoreFooter.tsx
import Link from 'next/link'

export function StoreFooter() {
  return (
    <footer className="px-8 py-6 border-t border-store-border bg-store-surface flex flex-col sm:flex-row justify-between items-center gap-4">
      <span className="font-serif text-base text-store-ink">inv-tienda</span>
      <span className="text-xs text-store-ink3">
        © {new Date().getFullYear()} · Todos los derechos reservados
      </span>
    </footer>
  )
}
