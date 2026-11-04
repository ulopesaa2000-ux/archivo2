'use client'

import React, { useState } from 'react'

export function DevEnvironmentBadge() {
  const [collapsed, setCollapsed] = useState(false)

  // Solo se renderiza en desarrollo local. En producción (build de Dokploy / VPS) se elimina por completo.
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const isSandbox = process.env.NEXT_PUBLIC_DB_TARGET === 'sandbox'
  const targetLabel = isSandbox ? 'SANDBOX (supabase.com)' : 'PRODUCCIÓN (autohost VPS)'
  const targetColor = isSandbox
    ? 'bg-emerald-600/90 text-white border-emerald-400 hover:bg-emerald-700'
    : 'bg-rose-600/95 text-white border-rose-400 hover:bg-rose-700 animate-pulse'

  return (
    <div className="fixed bottom-3 right-3 z-50 select-none font-mono text-xs">
      <div
        onClick={() => setCollapsed(!collapsed)}
        className={`flex items-center gap-2 rounded-full border px-3 py-1 shadow-lg backdrop-blur cursor-pointer transition-all ${targetColor}`}
        title={`Base de datos activa: ${targetLabel}. Haz clic para colapsar/expandir.`}
      >
        <span className="inline-block h-2 w-2 rounded-full bg-white opacity-80" />
        <span className="font-semibold tracking-wide">
          {collapsed ? (isSandbox ? '🧪 Sandbox' : '⚠️ Prod') : targetLabel}
        </span>
      </div>
    </div>
  )
}

