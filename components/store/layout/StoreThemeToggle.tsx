// components/store/layout/StoreThemeToggle.tsx
'use client'

import * as React from 'react'
import { Sun, Moon, Laptop, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface StoreThemeToggleProps {
  variant?: 'segmented' | 'capsule' | 'dropdown'
  className?: string
  size?: 'sm' | 'default'
}

export function StoreThemeToggle({
  variant = 'segmented',
  className,
  size = 'default',
}: StoreThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Placeholder para evitar mismatch de hidratación durante SSR
  if (!mounted) {
    if (variant === 'segmented') {
      return (
        <div
          className={cn(
            'inline-flex items-center p-1 rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300/40 dark:border-zinc-700/40 backdrop-blur-md animate-pulse',
            size === 'sm' ? 'h-8 text-xs' : 'h-10 text-xs sm:text-sm',
            className
          )}
        >
          <div className="w-16 h-full rounded-xl bg-transparent" />
          <div className="w-16 h-full rounded-xl bg-transparent" />
          <div className="w-16 h-full rounded-xl bg-transparent" />
        </div>
      )
    }

    if (variant === 'capsule') {
      return (
        <div
          className={cn(
            'inline-flex items-center p-1 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300/40 dark:border-zinc-700/40 backdrop-blur-md animate-pulse h-9 w-24',
            className
          )}
        />
      )
    }

    return (
      <div
        className={cn(
          'w-9 h-9 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse',
          className
        )}
      />
    )
  }

  // 1. SEGMENTED CONTROL (3 opciones completas con etiquetas e iconos)
  if (variant === 'segmented') {
    const options = [
      { key: 'light', label: 'Claro', icon: Sun },
      { key: 'dark', label: 'Oscuro', icon: Moon },
      { key: 'system', label: 'Sistema', icon: Laptop },
    ] as const

    return (
      <div
        role="group"
        aria-label="Selector de tema visual"
        className={cn(
          'inline-flex items-center p-1 rounded-2xl bg-zinc-200/60 dark:bg-zinc-900/80 border border-zinc-300/60 dark:border-zinc-800/80 shadow-xs backdrop-blur-md select-none transition-all duration-300',
          size === 'sm' ? 'h-8.5 gap-0.5' : 'h-10 gap-1',
          className
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon
          const isActive = theme === opt.key

          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTheme(opt.key)}
              className={cn(
                'relative flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-200 outline-none',
                size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs',
                isActive
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95'
              )}
              title={`Activar modo ${opt.label.toLowerCase()}`}
            >
              <Icon
                className={cn(
                  size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4',
                  isActive
                    ? opt.key === 'light'
                      ? 'text-amber-500'
                      : opt.key === 'dark'
                      ? 'text-indigo-400'
                      : 'text-emerald-500 dark:text-emerald-400'
                    : 'opacity-70'
                )}
              />
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // 2. CAPSULE (Pastilla compacta de 3 iconos sin texto)
  if (variant === 'capsule') {
    const options = [
      { key: 'light', title: 'Modo Claro', icon: Sun },
      { key: 'dark', title: 'Modo Oscuro', icon: Moon },
      { key: 'system', title: 'Modo Sistema (Automático)', icon: Laptop },
    ] as const

    return (
      <div
        role="group"
        aria-label="Selector de tema visual compacto"
        className={cn(
          'inline-flex items-center p-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-900/80 border border-zinc-300/60 dark:border-zinc-800/80 shadow-xs backdrop-blur-md select-none',
          className
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon
          const isActive = theme === opt.key

          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTheme(opt.key)}
              className={cn(
                'relative p-1.5 rounded-full transition-all duration-200 outline-none flex items-center justify-center',
                isActive
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-105'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95'
              )}
              title={opt.title}
              aria-label={opt.title}
            >
              <Icon
                className={cn(
                  'w-3.5 h-3.5',
                  isActive
                    ? opt.key === 'light'
                      ? 'text-amber-500'
                      : opt.key === 'dark'
                      ? 'text-indigo-400'
                      : 'text-emerald-500 dark:text-emerald-400'
                    : 'opacity-70'
                )}
              />
            </button>
          )
        })}
      </div>
    )
  }

  // 3. DROPDOWN (Botón interactivo con menú desplegable estilizado)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative p-2 rounded-xl border border-store-border dark:border-zinc-800 bg-store-bg/60 dark:bg-zinc-900/80 text-store-ink hover:bg-store-surface dark:hover:bg-zinc-800 active:scale-95 transition-all outline-none flex items-center justify-center shadow-xs',
            className
          )}
          aria-label="Cambiar tema visual"
          title="Cambiar tema visual (Claro / Oscuro / Sistema)"
        >
          <Sun className="h-[1.15rem] w-[1.15rem] text-amber-500 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.15rem] w-[1.15rem] text-indigo-400 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 p-1.5 rounded-2xl shadow-xl bg-store-surface border-store-border">
        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Tema Visual
        </div>
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center justify-between cursor-pointer rounded-xl text-xs font-semibold py-2 px-2.5 transition-colors',
            theme === 'light' ? 'bg-store-bg text-amber-600 dark:text-amber-400' : 'text-store-ink'
          )}
        >
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Claro</span>
          </div>
          {theme === 'light' && <Check className="h-3.5 w-3.5 text-amber-500" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center justify-between cursor-pointer rounded-xl text-xs font-semibold py-2 px-2.5 transition-colors',
            theme === 'dark' ? 'bg-store-bg text-indigo-400' : 'text-store-ink'
          )}
        >
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-indigo-400" />
            <span>Oscuro</span>
          </div>
          {theme === 'dark' && <Check className="h-3.5 w-3.5 text-indigo-400" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center justify-between cursor-pointer rounded-xl text-xs font-semibold py-2 px-2.5 transition-colors',
            theme === 'system' ? 'bg-store-bg text-emerald-600 dark:text-emerald-400' : 'text-store-ink'
          )}
        >
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4 text-emerald-500" />
            <span>Sistema</span>
          </div>
          {theme === 'system' && <Check className="h-3.5 w-3.5 text-emerald-500" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
