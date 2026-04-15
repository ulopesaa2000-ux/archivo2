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
  allLabel = 'Todos',
}: {
  paramKey: string
  placeholder: string
  options: Option[]
  allLabel?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentValue = searchParams.get(paramKey) ?? '_all'

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
      key={currentValue}
      defaultValue={currentValue}
      onValueChange={handleChange}
    >
      <SelectTrigger className={`w-[160px] ${isPending ? 'opacity-50' : ''}`}>
        <span className="truncate">
          {currentValue === '_all' 
            ? allLabel 
            : (options.find(o => o.value === currentValue)?.label ?? placeholder)}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_all">{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
