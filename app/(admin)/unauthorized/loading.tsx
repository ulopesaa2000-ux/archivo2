// app/(admin)/unauthorized/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function UnauthorizedLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <Skeleton className="h-44 w-full max-w-md rounded-xl" />
    </div>
  )
}
