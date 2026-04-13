// app/(store)/catalogo/[slug]/loading.tsx
import { ProductSkeleton } from '@/components/store/producto/ProductSkeleton'

export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProductSkeleton />
    </div>
  )
}
