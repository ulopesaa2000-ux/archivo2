// app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 px-4">
      {/* Contenedor centrado con ancho fijo */}
      <div className="w-full max-w-[400px] space-y-8">
        {children}
      </div>

      {/* Footer mínimo */}
      <p className="mt-8 text-xs text-muted-foreground">
        inv-tienda © 2026
      </p>
    </div>
  )
}
