// app/(auth)/login/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Se muestra INSTANTÁNEAMENTE (0ms) mientras page.tsx se resuelve.
 * Como login/page.tsx es simple, esto será casi imperceptible,
 * pero garantiza que NUNCA haya pantalla en blanco.
 */
export default function LoginLoading() {
  return (
    <>
      {/* Logo placeholder */}
      <div className="text-center space-y-3">
        <Skeleton className="mx-auto w-12 h-12 rounded-xl" />
        <Skeleton className="mx-auto h-7 w-32" />
        <Skeleton className="mx-auto h-4 w-48" />
      </div>

      {/* Form placeholder */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full mt-2" />
      </div>
    </>
  )
}
