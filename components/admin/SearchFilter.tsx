// components/admin/SearchFilter.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Loader2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SearchFilter({
  placeholder = 'Buscar...',
  paramKey = 'q',
}: {
  placeholder?: string
  paramKey?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentValue = searchParams.get(paramKey) ?? ''

  const updateParams = useCallback(
    (value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(paramKey, value)
      } else {
        params.delete(paramKey)
      }
      params.delete('page')
      return params.toString()
    },
    [searchParams, paramKey]
  )

  const handleSearch = useDebouncedCallback((term: string) => {
    startTransition(() => {
      const qs = updateParams(term || null)
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }, 300)

  const handleClear = () => {
    startTransition(() => {
      const qs = updateParams(null)
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
    // Limpiar el input manualmente
    const input = document.getElementById(`search-${paramKey}`) as HTMLInputElement
    if (input) input.value = ''
  }

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        key={currentValue}
        id={`search-${paramKey}`}
        placeholder={placeholder}
        defaultValue={currentValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-10 pr-10"
      />
      {isPending ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      ) : currentValue ? (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  )
}
