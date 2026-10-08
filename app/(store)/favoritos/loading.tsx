// app/(store)/favoritos/loading.tsx
export default function FavoritosLoading() {
  return (
    <div className="bg-background min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="h-6 w-40 bg-muted rounded-full mx-auto animate-pulse" />
          <div className="h-9 w-72 bg-muted rounded mx-auto animate-pulse" />
          <div className="h-4 w-96 max-w-full bg-muted rounded mx-auto animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
