// app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 overflow-hidden select-none">
      
      {/* Orbes de luz ambiente premium (Glassmorphism & Glow) */}
      <div className="absolute top-10 left-1/2 -translate-x-[60%] w-[35rem] h-[35rem] bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-10 left-1/2 translate-x-[20%] w-[30rem] h-[30rem] bg-emerald-400/15 dark:bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-[10000ms]" />

      {/* Sutil cuadrícula de fondo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      {/* Contenedor principal con ancho optimizado */}
      <div className="w-full max-w-[440px] space-y-6 z-10">
        {children}
      </div>

      {/* Footer mínimo */}
      <p className="mt-8 text-xs font-light text-slate-400 dark:text-slate-600 tracking-wider">
        inv-tienda © 2026 • Sistema de Control Premium
      </p>
    </div>
  )
}

