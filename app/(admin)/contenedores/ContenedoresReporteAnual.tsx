// app/(admin)/contenedores/ContenedoresReporteAnual.tsx
import { fetchContenedoresReporteAnual } from '@/modules/contenedores/queries'
import { ReporteAnualGrid } from './ReporteAnualGrid'

export async function ContenedoresReporteAnual() {
  const data = await fetchContenedoresReporteAnual()

  // Recolectar todos los años presentes en los datos
  const yearsSet = new Set<number>()
  // Siempre añadir el año actual por si acaso
  yearsSet.add(new Date().getFullYear())

  for (const item of data) {
    Object.keys(item.anios).forEach((yr) => {
      yearsSet.add(parseInt(yr, 10))
    })
  }

  // Ordenar los años de forma descendente
  const years = Array.from(yearsSet).sort((a, b) => b - a)

  return (
    <div className="rounded-md border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <h2 className="text-lg font-semibold tracking-tight">Reporte Anual de Contenedores por Proveedor</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Historial y comparativo año con año de los contenedores programados. Haz clic en los contadores para ver los detalles.
        </p>
      </div>
      <div className="px-6 pb-6">
        <ReporteAnualGrid data={data} years={years} />
      </div>
    </div>
  )
}
