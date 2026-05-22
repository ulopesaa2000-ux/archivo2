// app/(admin)/contenedores/layout.tsx
import { verifyModuleAccess } from '@/lib/dal'

export default async function ContenedoresLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await verifyModuleAccess('contenedores')
  return <>{children}</>
}
