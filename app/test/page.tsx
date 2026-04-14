// app/test/page.tsx
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, formatCurrency } from '@/lib/utils'

async function TestContent() {
  const supabase = await createClient()

  const [bodegas, roles, estados, productos] = await Promise.all([
    supabase.from('bodegas').select('*').order('nombre'),
    supabase.from('roles').select('*').order('nivel_acceso'),
    supabase.from('cat_estados_nota').select('*'),
    supabase.from('productos').select('id, sku_base, nombre, precio_ec, created_at').limit(3),
  ])

  const allOk = !bodegas.error && !roles.error && !estados.error && !productos.error

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">🔌 Test de Conexión</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Bodegas</h2>
        {bodegas.error
          ? <p className="text-red-500">{bodegas.error.message}</p>
          : <pre className="bg-muted p-4 rounded text-sm overflow-auto">
              {JSON.stringify(bodegas.data, null, 2)}
            </pre>
        }
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Roles</h2>
        {roles.error
          ? <p className="text-red-500">{roles.error.message}</p>
          : <pre className="bg-muted p-4 rounded text-sm overflow-auto">
              {JSON.stringify(roles.data, null, 2)}
            </pre>
        }
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Estados Nota</h2>
        {estados.error
          ? <p className="text-red-500">{estados.error.message}</p>
          : <pre className="bg-muted p-4 rounded text-sm overflow-auto">
              {JSON.stringify(estados.data, null, 2)}
            </pre>
        }
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Productos (timezone test)</h2>
        {productos.error
          ? <p className="text-red-500">{productos.error.message}</p>
          : <div className="space-y-2">
              {(productos.data as any[])?.map((p: any) => (
                <div key={p.id} className="bg-muted p-3 rounded text-sm">
                  <strong>{p.sku_base}</strong> — {p.nombre}<br />
                  Precio: {formatCurrency(p.precio_ec)}<br />
                  Creado (UTC raw): {p.created_at}<br />
                  Creado (MX City): {formatDateTime(p.created_at)}
                </div>
              ))}
            </div>
        }
      </section>

      <div className={`p-4 rounded text-lg font-medium ${allOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        {allOk
          ? '✅ Conexión exitosa — Esquema accesible — Timezone funcionando'
          : '❌ Hay errores — Revisa .env.local y RLS'
        }
      </div>
    </div>
  )
}

function TestSkeleton() {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="h-10 w-64 bg-muted animate-pulse rounded" />
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}

export default function TestPage() {
  return (
    <Suspense fallback={<TestSkeleton />}>
      <TestContent />
    </Suspense>
  )
}
