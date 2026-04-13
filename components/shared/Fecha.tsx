// components/shared/Fecha.tsx
import { formatDate, formatDateTime, formatDateLong, formatTimeAgo } from '@/lib/utils'

type Formato = 'fecha' | 'fecha-hora' | 'fecha-larga' | 'relativo'

export function Fecha({
  valor,
  formato = 'fecha-hora',
  fallback = '—',
  className,
}: {
  valor: string | null | undefined
  formato?: Formato
  fallback?: string
  className?: string
}) {
  if (!valor) {
    return <span className="text-muted-foreground">{fallback}</span>
  }

  const formatters: Record<Formato, (d: string) => string> = {
    'fecha': formatDate,
    'fecha-hora': formatDateTime,
    'fecha-larga': formatDateLong,
    'relativo': formatTimeAgo,
  }

  return (
    <time dateTime={valor} title={formatDateTime(valor)} className={className}>
      {formatters[formato](valor)}
    </time>
  )
}
