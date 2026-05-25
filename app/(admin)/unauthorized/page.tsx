// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\unauthorized\page.tsx
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Sin permisos</h1>
          <p className="text-sm text-muted-foreground">
            Tu rol actual no tiene acceso a esta pagina o accion. Si necesitas entrar, solicita el permiso al administrador.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
