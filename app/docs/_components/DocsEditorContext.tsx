// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\_components\DocsEditorContext.tsx
'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface DocsEditorContextValue {
  canEdit: boolean
  isEditMode: boolean
  setIsEditMode: (value: boolean) => void
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void
}

const DocsEditorContext = createContext<DocsEditorContextValue | undefined>(undefined)

export function DocsEditorProvider({
  canEdit,
  children,
}: {
  canEdit: boolean
  children: ReactNode
}) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <DocsEditorContext.Provider
      value={{
        canEdit,
        isEditMode: canEdit ? isEditMode : false,
        setIsEditMode: (val) => {
          if (canEdit) setIsEditMode(val)
        },
        isCreateModalOpen,
        setIsCreateModalOpen,
      }}
    >
      {children}
    </DocsEditorContext.Provider>
  )
}

export function useDocsEditor() {
  const ctx = useContext(DocsEditorContext)
  if (!ctx) {
    throw new Error('useDocsEditor debe usarse dentro de DocsEditorProvider')
  }
  return ctx
}
