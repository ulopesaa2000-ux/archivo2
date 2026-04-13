// app/(admin)/dashboard/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

/**
 * Dashboard placeholder.
 * Este es el destino después de un login exitoso.
 * Se completará en la Fase 9 con datos reales.
 * 
 * Por ahora solo confirma que el login funcionó
 * y que el usuario está dentro del shell admin.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de administración
        </p>
      </div>

      {/* Tarjetas placeholder */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Productos Activos', value: '—', color: 'bg-blue-50' },
          { label: 'Notas Pendientes', value: '—', color: 'bg-yellow-50' },
          { label: 'Órdenes Nuevas', value: '—', color: 'bg-green-50' },
          { label: 'Contenedores', value: '—', color: 'bg-purple-50' },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-6 ${card.color}`}
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-3xl font-bold mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center py-8">
        ✅ Login exitoso — El shell admin y la navegación funcionan correctamente.
        <br />
        Los datos reales se integrarán en la Fase 9.
      </p>
    </div>
  )
}
