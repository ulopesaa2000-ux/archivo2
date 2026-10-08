// app/(admin)/ecommerce/ordenes-venta/[id]/loading.tsx
export default function OrdenVentaDetalleLoading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-40 bg-muted rounded animate-pulse" />
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-96 bg-muted rounded-lg animate-pulse" />
    </div>
  )
}
