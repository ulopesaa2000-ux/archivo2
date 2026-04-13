// app/(admin)/inventario/stock/StockFilters.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Search, Loader2, X, Eye } from 'lucide-react'

export function StockFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
        params.delete('page')
        const qs = params.toString()
        router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
      })
    },
    [searchParams, pathname, router]
  )

  const handleSearch = useDebouncedCallback((term: string) => {
    updateParam('q', term || null)
  }, 400)

  const currentQ = searchParams.get('q') ?? ''
  const currentStockCero = searchParams.get('con_stock_cero') === 'true'

  const hasFilters = Array.from(searchParams.entries()).some(
    ([key]) => key !== 'page'
  )

  return (
    <div className={`flex flex-wrap items-center gap-3 ${isPending ? 'opacity-70' : ''}`}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="stock-search"
          placeholder="Buscar por SKU o nombre..."
          defaultValue={currentQ}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="stock-cero"
          checked={currentStockCero}
          onCheckedChange={(checked) =>
            updateParam('con_stock_cero', checked === true ? 'true' : null)
          }
        />
        <Label htmlFor="stock-cero" className="text-sm font-normal cursor-pointer flex items-center gap-1">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          Incluir stock en cero
        </Label>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            startTransition(() => router.push(pathname, { scroll: false }))
            const input = document.getElementById('stock-search') as HTMLInputElement
            if (input) input.value = ''
          }}
          className="text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
