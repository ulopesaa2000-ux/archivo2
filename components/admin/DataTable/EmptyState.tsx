// components/admin/DataTable/EmptyState.tsx
'use client'

import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type Props = {
  message?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({
  message = 'No se encontraron resultados.',
  icon = <Inbox className="h-12 w-12" />,
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}