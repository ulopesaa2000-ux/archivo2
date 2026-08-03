// components/store/editor/QuickEditButton.tsx
'use client'

import { Edit3 } from 'lucide-react'
import { useLiveStoreEditor, EditableSection } from './LiveStoreEditorContext'

interface QuickEditButtonProps {
  section: EditableSection
  label: string
  className?: string
}

export function QuickEditButton({ section, label, className = '' }: QuickEditButtonProps) {
  const { canEdit, isEditMode, openEditor } = useLiveStoreEditor()

  if (!canEdit || !isEditMode) return null

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openEditor(section)
      }}
      className={`inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-full shadow-lg border border-amber-300 transition-all transform hover:scale-105 z-30 animate-in fade-in zoom-in-90 ${className}`}
      title={`Editar ${label}`}
    >
      <Edit3 className="h-3.5 w-3.5 stroke-[2.5]" />
      <span>Editar {label}</span>
    </button>
  )
}
