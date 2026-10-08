// app/(store)/mis-pedidos/loading.tsx
export default function MisPedidosLoading() {
  return (
    <div className="bg-background min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="h-6 w-40 bg-muted rounded-full mx-auto animate-pulse" />
          <div className="h-9 w-64 bg-muted rounded mx-auto animate-pulse" />
        </div>
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    </div>
  )
}
