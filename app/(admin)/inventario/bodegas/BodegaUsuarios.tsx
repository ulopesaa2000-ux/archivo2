// app/(admin)/inventario/bodegas/BodegaUsuarios.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, Users } from 'lucide-react'
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

export function BodegaUsuarios({ bodegaId }: { bodegaId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [usuarios, setUsuarios] = useState<UsuarioBodega[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/inventario/bodega-usuarios?bodega_id=${bodegaId}`)
        if (res.ok) {
          const data = await res.json()
          setUsuarios(data)
        }
      } catch { /* ignore */ }
      setIsLoading(false)
    }
    load()
  }, [bodegaId])

  const handleDelete = (asignacionId: number) => {
    startTransition(async () => {
      await eliminarUsuarioBodegaAction(asignacionId)
      setUsuarios((prev) => prev.filter((u) => u.id !== asignacionId))
      router.refresh()
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Cargando usuarios...
      </div>
    )
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
