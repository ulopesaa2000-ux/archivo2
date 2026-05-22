// app/(admin)/configuracion/layout.tsx
import { verifyModuleAccess } from '@/lib/dal'

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await verifyModuleAccess('configuracion')
  return <>{children}</>
}
