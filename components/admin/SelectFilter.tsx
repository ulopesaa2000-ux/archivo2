// components/admin/SelectFilter.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Option = { value: string; label: string }

export function SelectFilter({
  paramKey,
  placeholder,
  options,
}: {
  paramKey: string
  placeholder: string
  options: Option[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === '_all') {
        params.delete(paramKey)
      } else {
        params.set(paramKey, value)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <Select
      key={searchParams.get(paramKey) ?? '_all'}
      defaultValue={searchParams.get(paramKey) ?? '_all'}
      onValueChange={handleChange}
    >
      <SelectTrigger className={`w-[160px] ${isPending ? 'opacity-50' : ''}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_all">Todos</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
