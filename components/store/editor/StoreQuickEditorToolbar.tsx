// components/store/editor/StoreQuickEditorToolbar.tsx
'use client'

import { Eye, Edit3, ShieldAlert, Globe, SlidersHorizontal } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useLiveStoreEditor } from './LiveStoreEditorContext'

export function StoreQuickEditorToolbar() {
  const { canEdit, isEditMode, setIsEditMode, openEditor } = useLiveStoreEditor()

  if (!canEdit) return null

  return (
    <div className="hidden md:flex fixed bottom-5 right-5 z-50 items-center gap-3 bg-zinc-900/95 text-white border border-amber-500/50 backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl transition-all">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
        <ShieldAlert className="h-4 w-4 text-amber-400 animate-pulse" />
        <span>Modo Administrador</span>
      </div>

      <div className="h-4 w-px bg-zinc-700" />

      <button
        type="button"
        onClick={() => openEditor('barra_rapida')}
        className="flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
        title="Editar barra rápida (Izquierda / Buscador / Prendas)"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>Barra Rápida</span>
      </button>

      <div className="h-4 w-px bg-zinc-700" />

      <button
        type="button"
        onClick={() => openEditor('seo_general')}
        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer"
        title="Ver y editar SEO general de la portada"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>SEO Sitio</span>
      </button>

      <div className="h-4 w-px bg-zinc-700" />

      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-200 select-none">
        {isEditMode ? (
          <Edit3 className="h-3.5 w-3.5 text-amber-400" />
        ) : (
          <Eye className="h-3.5 w-3.5 text-gray-400" />
        )}
        <span>Edición In-Situ</span>
        <Switch
          checked={isEditMode}
          onCheckedChange={setIsEditMode}
          className="data-[state=checked]:bg-amber-500"
        />
      </label>
    </div>
  )
}
