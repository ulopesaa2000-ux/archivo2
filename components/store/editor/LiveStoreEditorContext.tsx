// components/store/editor/LiveStoreEditorContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export type EditableSection = 
  | 'hero' 
  | 'coleccion_dama' 
  | 'coleccion_caballero' 
  | 'destacados' 
  | 'contactos_regionales'
  | 'explora_categoria'
  | 'categorias_grid'
  | 'footer_agradecimiento'
  | null

interface LiveStoreEditorContextType {
  canEdit: boolean
  isEditMode: boolean
  setIsEditMode: (active: boolean) => void
  activeSection: EditableSection
  openEditor: (section: EditableSection) => void
  closeEditor: () => void
  isDrawerOpen: boolean
}

const LiveStoreEditorContext = createContext<LiveStoreEditorContextType | undefined>(undefined)

export function LiveStoreEditorProvider({
  canEdit = false,
  children,
}: {
  canEdit?: boolean
  children: ReactNode
}) {
  const [clientCanEdit, setClientCanEdit] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [activeSection, setActiveSection] = useState<EditableSection>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (canEdit) return

    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return
      const claims = user.app_metadata?.inv_tienda_claims as
        | {
            nivel_acceso?: number
            permisos?: { puede_gestionar_ecommerce?: boolean }
            permissions?: { modules?: { ecommerce_config?: { puede_editar?: boolean; puede_crear?: boolean } } }
          }
        | undefined
      const modulos = claims?.permissions?.modules?.ecommerce_config
      const isEditor = Boolean(
        claims &&
          ((claims.nivel_acceso !== undefined && claims.nivel_acceso <= 2) ||
            claims.permisos?.puede_gestionar_ecommerce ||
            modulos?.puede_editar ||
            modulos?.puede_crear)
      )
      if (isEditor) {
        setClientCanEdit(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [canEdit])

  const openEditor = (section: EditableSection) => {
    setActiveSection(section)
    setIsDrawerOpen(true)
  }

  const closeEditor = () => {
    setIsDrawerOpen(false)
    setActiveSection(null)
  }

  return (
    <LiveStoreEditorContext.Provider
      value={{
        canEdit: canEdit || clientCanEdit,
        isEditMode,
        setIsEditMode,
        activeSection,
        openEditor,
        closeEditor,
        isDrawerOpen,
      }}
    >
      {children}
    </LiveStoreEditorContext.Provider>
  )
}

export function useLiveStoreEditor() {
  const context = useContext(LiveStoreEditorContext)
  if (!context) {
    throw new Error('useLiveStoreEditor debe ser usado dentro de LiveStoreEditorProvider')
  }
  return context
}
