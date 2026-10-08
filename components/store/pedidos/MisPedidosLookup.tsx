// components/store/pedidos/MisPedidosLookup.tsx
'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buscarOrdenInvitado } from '@/modules/ecommerce/queries'
import type { OrdenVentaDetalle } from '@/modules/ecommerce/types'
import { OrdenDetalleView } from './OrdenDetalleView'

export function MisPedidosLookup() {
  const [folio, setFolio] = useState('')
  const [email, setEmail] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [orden, setOrden] = useState<OrdenVentaDetalle | null>(null)
  const [noEncontrada, setNoEncontrada] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folio.trim() || !email.trim()) return
    setIsSearching(true)
    setNoEncontrada(false)
    setOrden(null)
    try {
      const result = await buscarOrdenInvitado(folio, email)
      if (result) {
        setOrden(result)
      } else {
        setNoEncontrada(true)
      }
    } catch {
      setNoEncontrada(true)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="font-semibold text-foreground mb-1">Rastrear pedido sin cuenta</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Ingresa el folio que recibiste al cotizar y el mismo email del formulario.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="folio" className="text-xs">Folio *</Label>
            <Input
              id="folio"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              placeholder="COT-XXXXXX"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="email-lookup" className="text-xs">Email *</Label>
            <Input
              id="email-lookup"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="mt-1"
            />
          </div>
        </div>
        <Button type="submit" disabled={isSearching} className="mt-4 bg-emerald-700 hover:bg-emerald-800">
          <Search className="h-4 w-4 mr-2" />
          {isSearching ? 'Buscando...' : 'Buscar pedido'}
        </Button>
        {noEncontrada && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">
            No encontramos un pedido con ese folio y email. Verifica los datos.
          </p>
        )}
      </form>

      {orden && <OrdenDetalleView orden={orden} />}
    </div>
  )
}
