// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\_components\DocsFloatingToolbar.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CloudUpload, Edit3, Eye, Plus, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { syncBaseDocsToStorageAction } from '@/modules/docs/actions'
import { useDocsEditor } from './DocsEditorContext'

export function DocsFloatingToolbar({
  storageSource,
}: {
  storageSource: 'storage' | 'fallback'
}) {
  const router = useRouter()
  const { canEdit, isEditMode, setIsEditMode, setIsCreateModalOpen } = useDocsEditor()
  const [isPending, startTransition] = useTransition()

  if (!canEdit) return null

  const handleSyncBase = () => {
    startTransition(async () => {
      const res = await syncBaseDocsToStorageAction()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`Base sincronizada (${res.syncedCount} guías guardadas en el bucket)`)
      router.refresh()
    })
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-wrap items-center gap-2.5 rounded-full border border-amber-500/50 bg-zinc-900/95 px-4 py-2 text-white shadow-2xl backdrop-blur-md">
      <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-amber-400">
        <ShieldAlert className="h-4 w-4 text-amber-400" />
        <span>Super Admin</span>
      </div>

      <div className="hidden sm:block h-4 w-px bg-zinc-700" />

      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
        title="Crear una nueva guía o importar desde Markdown (.md)"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Nueva Guía</span>
      </button>

      {storageSource === 'fallback' && (
        <>
          <div className="h-4 w-px bg-zinc-700" />
          <button
            type="button"
            disabled={isPending}
            onClick={handleSyncBase}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-50 transition-colors cursor-pointer"
            title="Subir las guías base iniciales al bucket privado documentation"
          >
            <CloudUpload className="h-3.5 w-3.5" />
            <span>{isPending ? 'Sincronizando...' : 'Sincronizar Base'}</span>
          </button>
        </>
      )}

      <div className="h-4 w-px bg-zinc-700" />

      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-200 select-none">
        {isEditMode ? (
          <Edit3 className="h-3.5 w-3.5 text-amber-400" />
        ) : (
          <Eye className="h-3.5 w-3.5 text-gray-400" />
        )}
        <span>Modo Edición</span>
        <Switch
          checked={isEditMode}
          onCheckedChange={setIsEditMode}
          className="data-checked:bg-amber-500"
        />
      </label>
    </div>
  )
}
