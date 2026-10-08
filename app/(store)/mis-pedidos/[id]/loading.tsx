// app/(store)/mis-pedidos/[id]/loading.tsx
export default function MisPedidoDetalleLoading() {
  return (
    <div className="bg-background min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        <div className="h-56 rounded-2xl bg-muted animate-pulse" />
        <div className="h-72 rounded-2xl bg-muted animate-pulse" />
      </div>
    </div>
  )
}
