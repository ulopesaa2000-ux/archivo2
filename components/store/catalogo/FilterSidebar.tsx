// components/store/catalogo/FilterSidebar.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState } from 'react'
import { Search } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { cn } from '@/lib/utils'

export function FilterSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const hasFilters = Array.from(searchParams.entries()).length > 0

  const debouncedSearch = useDebouncedCallback((term: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (term) {
        params.set('q', term)
      } else {
        params.delete('q')
      }
      params.delete('page')
      router.push(`/shop?${params.toString()}`, { scroll: false })
    })
  }, 300)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    debouncedSearch(value)
  }

  const toggleFilter = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      const current = params.get(key)
      
      if (current === value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      
      params.delete('page')
      router.push(`/shop?${params.toString()}`, { scroll: false })
    })
  }

  const clearFilters = () => {
    startTransition(() => {
      setSearchTerm('')
      router.push('/shop', { scroll: false })
    })
  }

  return (
    <div className={cn("space-y-6", isPending && "opacity-50 pointer-events-none")}>
      
      {/* Buscador */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full bg-[#FFFFFF] border border-[#2D5A3D]/20 text-[13px] text-[#1A1C1A] pl-9 pr-3 py-2 rounded-md focus:outline-none focus:border-[#2D5A3D]"
          />
        </div>
      </div>

      {/* Filtros Base */}
      <div className="space-y-3">
        <div className="text-[13px] font-semibold text-[#1A1C1A] uppercase tracking-[0.05em] mb-3">Atributos</div>
        
        {/* En Oferta */}
        <div 
          onClick={() => toggleFilter('oferta', 'true')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className={cn(
            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
            searchParams.get('oferta') === 'true' 
              ? "bg-[#2D5A3D] border-[#2D5A3D] text-white" 
              : "border-[#8C8C8C] group-hover:border-[#1A1C1A]"
          )}>
            {searchParams.get('oferta') === 'true' && <span className="text-[10px]">✓</span>}
          </div>
          <span className="text-[13px] text-[#262626] group-hover:text-[#1A1C1A]">En oferta</span>
        </div>

        {/* Nuevos */}
        <div 
          onClick={() => toggleFilter('nuevo', 'true')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className={cn(
            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
            searchParams.get('nuevo') === 'true' 
              ? "bg-[#2D5A3D] border-[#2D5A3D] text-white" 
              : "border-[#8C8C8C] group-hover:border-[#1A1C1A]"
          )}>
            {searchParams.get('nuevo') === 'true' && <span className="text-[10px]">✓</span>}
          </div>
          <span className="text-[13px] text-[#262626] group-hover:text-[#1A1C1A]">Novedades</span>
        </div>

        {/* Destacados */}
        <div 
          onClick={() => toggleFilter('destacado', 'true')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className={cn(
            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
            searchParams.get('destacado') === 'true' 
              ? "bg-[#2D5A3D] border-[#2D5A3D] text-white" 
              : "border-[#8C8C8C] group-hover:border-[#1A1C1A]"
          )}>
            {searchParams.get('destacado') === 'true' && <span className="text-[10px]">✓</span>}
          </div>
          <span className="text-[13px] text-[#262626] group-hover:text-[#1A1C1A]">Destacados</span>
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={clearFilters}
          disabled={isPending}
          className="w-full text-center text-[12px] text-[#8C8C8C] hover:text-[#1A1C1A] underline tracking-[0.02em] pt-4 mt-4 border-t border-[#2D5A3D]/20"
        >
          Limpiar todos los filtros
        </button>
      )}
    </div>
  )
}
