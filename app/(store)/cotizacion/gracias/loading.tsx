// app/(store)/cotizacion/gracias/loading.tsx
export default function GraciasLoading() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-xl text-center">
      <div className="flex items-center justify-center space-x-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-opacity-25"></div>
        <span className="text-muted-foreground">Cargando...</span>
      </div>
    </div>
  )
}