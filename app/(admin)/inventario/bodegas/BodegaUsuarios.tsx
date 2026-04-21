// app/(admin)/inventario/bodegas/BodegaUsuarios.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Users } from 'lucide-react'
import {
  asignarUsuarioBodegaAction,
  eliminarUsuarioBodegaAction,
} from '@/modules/inventario/actions'

type UsuarioBodega = {
  id: number
  usuario_id: number
  bodega_id: number
  puede_consultar: boolean | null
  puede_crear_notas: boolean | null
  puede_confirmar_notas: boolean | null
  puede_transferir: boolean | null
  usuario_nombre: string
}

type Props = {
  bodegaId: number
  initialUsuarios?: UsuarioBodega[]
}

export function BodegaUsuarios({ bodegaId, initialUsuarios }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [usuarios, setUsuarios] = useState<UsuarioBodega[]>(initialUsuarios ?? [])
  const [isLoading, setIsLoading] = useState(!initialUsuarios)

  // Cargar usuarios solo si no se pasaron como prop
  if (isLoading && initialUsuarios === undefined) {
    setIsLoading(false)
    fetch(`/api/inventario/bodega-usuarios?bodega_id=${bodegaId}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUsuarios(data))
      .catch(() => { /* ignore */ })
  }

  const handleDelete = (asignacionId: number) => {
    startTransition(async () => {
      await eliminarUsuarioBodegaAction(asignacionId)
      setUsuarios((prev) => prev.filter((u) => u.id !== asignacionId))
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <Users className="h-3 w-3" />
        Usuarios asignados ({usuarios.length})
      </h4>

      {usuarios.length > 0 ? (
        <div className="rounded border divide-y text-xs">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2">
              <span className="font-medium flex-1">{u.usuario_nombre}</span>
              {u.puede_consultar && <Badge variant="outline" className="text-[10px]">Consultar</Badge>}
              {u.puede_crear_notas && <Badge variant="outline" className="text-[10px]">Crear</Badge>}
              {u.puede_confirmar_notas && <Badge variant="outline" className="text-[10px]">Confirmar</Badge>}
              {u.puede_transferir && <Badge variant="outline" className="text-[10px]">Transferir</Badge>}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(u.id)}
                disabled={isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sin usuarios asignados.</p>
      )}
    </div>
  )
}