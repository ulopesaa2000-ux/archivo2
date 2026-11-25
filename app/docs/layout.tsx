// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\layout.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { isClienteEcommerce, isSuperAdmin } from '@/lib/auth/permissions'
import { fetchDocsRegistry } from '@/modules/docs/storage'
import { DocsShellClient } from './_components/DocsShellClient'

export const metadata: Metadata = {
  title: 'Centro de Guías y Documentación | inv-tienda',
  description: 'Guías operativas por rol y procedimientos del sistema inv-tienda',
}

async function DocsShell({ children }: { children: React.ReactNode }) {
  const { user } = await verifySession()

  if (isClienteEcommerce(user)) {
    redirect('/')
  }

  const { registry, source } = await fetchDocsRegistry()
  const canEdit = isSuperAdmin(user)

  return (
    <DocsShellClient
      user={{
        nombre: user.nombre_completo ?? 'Usuario',
        rolNombre: user.rol?.nombre ?? 'Sin rol',
      }}
      canEdit={canEdit}
      registry={registry}
      storageSource={source}
    >
      {children}
    </DocsShellClient>
  )
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Cargando centro de guías...</p>
          </div>
        </div>
      }
    >
      <DocsShell>{children}</DocsShell>
    </Suspense>
  )
}
