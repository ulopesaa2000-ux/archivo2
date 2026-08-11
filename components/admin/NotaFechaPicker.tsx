// components/admin/NotaFechaPicker.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { todayMX } from '@/lib/utils'

interface Props {
  value: string // Formato YYYY-MM-DD
  onChange: (date: string) => void
  disabled?: boolean
  className?: string
}

export function NotaFechaPicker({ value, onChange, disabled, className }: Props) {
  const currentDate = value || todayMX()

  const handleAdjustDays = (daysDelta: number) => {
    try {
      const parts = currentDate.split('-').map(Number)
      const year = parts[0]
      const month = parts[1]
      const day = parts[2]
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        onChange(todayMX())
        return
      }
      const d = new Date(year, month - 1, day + daysDelta)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      onChange(`${yyyy}-${mm}-${dd}`)
    } catch {
      onChange(todayMX())
    }
  }

  const handleToday = () => {
    onChange(todayMX())
  }

  const isToday = currentDate === todayMX()

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 w-full ${className || ''}`}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => handleAdjustDays(-1)}
        disabled={disabled}
        className="h-11 w-11 shrink-0 rounded-xl hover:bg-muted active:scale-95 transition-all shadow-sm"
        title="Día anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="relative flex-1 min-w-[120px]">
        <Input
          type="date"
          value={currentDate}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-11 rounded-xl text-sm font-semibold text-center w-full px-2 shadow-sm bg-background"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => handleAdjustDays(1)}
        disabled={disabled}
        className="h-11 w-11 shrink-0 rounded-xl hover:bg-muted active:scale-95 transition-all shadow-sm"
        title="Día siguiente"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      <Button
        type="button"
        variant={isToday ? "secondary" : "outline"}
        onClick={handleToday}
        disabled={disabled || isToday}
        className="h-11 px-3 shrink-0 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
      >
        Hoy
      </Button>
    </div>
  )
}
