import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'
import { StoreThemeToggle } from '@/components/store/layout/StoreThemeToggle'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8 overflow-hidden select-none">
      
      {/* Barra superior con selector de tema y regreso a tienda */}
      <header className="absolute top-4 sm:top-6 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xs transition-all hover:scale-105 active:scale-95"
          title="Regresar a la tienda pública"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ir a la Tienda</span>
          <Store className="w-3.5 h-3.5 sm:hidden" />
        </Link>

        {/* Selector de modo encapsulado (Claro | Oscuro | Sistema) */}
        <StoreThemeToggle variant="segmented" size="sm" />
      </header>

      {/* Orbes de luz ambiente premium (Glassmorphism & Glow) */}
      <div className="absolute top-10 left-1/2 -translate-x-[60%] w-[35rem] h-[35rem] bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-10 left-1/2 translate-x-[20%] w-[30rem] h-[30rem] bg-emerald-400/15 dark:bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-[10000ms]" />

      {/* Sutil cuadrícula de fondo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      {/* Contenedor principal con ancho optimizado */}
      <div className="w-full max-w-[440px] space-y-6 z-10 mt-12 sm:mt-0">
        {children}
      </div>

      {/* Footer mínimo */}
      <p className="mt-8 text-xs font-light text-slate-400 dark:text-slate-600 tracking-wider">
        inv-tienda © 2026 • Sistema de Control Premium
      </p>
    </div>
  )
}

