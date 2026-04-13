// components/admin/Pagination.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZE } from '@/lib/constants'

export function Pagination({ total }: { total: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentPage = Number(searchParams.get('page') ?? '1')
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (totalPages <= 1) return null

  function goToPage(page: number) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (page === 1) {
        params.delete('page')
      } else {
        params.set('page', String(page))
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  const from = (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, total)

  return (
    <div className={`flex items-center justify-between py-4 ${isPending ? 'opacity-50' : ''}`}>
      <p className="text-sm text-muted-foreground">
        Mostrando {from}-{to} de {total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1 || isPending}
          onClick={() => goToPage(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let page: number
          if (totalPages <= 5) {
            page = i + 1
          } else if (currentPage <= 3) {
            page = i + 1
          } else if (currentPage >= totalPages - 2) {
            page = totalPages - 4 + i
          } else {
            page = currentPage - 2 + i
          }

          return (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
              disabled={isPending}
              onClick={() => goToPage(page)}
            >
              {page}
            </Button>
          )
        })}

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages || isPending}
          onClick={() => goToPage(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
