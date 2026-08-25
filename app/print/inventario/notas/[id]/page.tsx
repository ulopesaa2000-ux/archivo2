// app/print/inventario/notas/[id]/page.tsx
import { Suspense } from 'react'
import { fetchNotaById } from '@/modules/inventario/queries'
import { notFound } from 'next/navigation'
import { Fecha } from '@/components/shared/Fecha'
import { AutoPrint } from '@/app/print/inventario/notas/[id]/AutoPrint'
import { PrintActionBar } from '@/app/print/inventario/notas/[id]/PrintActionBar'

export default function ImprimirNotaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <div className="min-h-screen bg-white text-black p-6 sm:p-12 font-sans selection:bg-gray-100">
      <Suspense fallback={
        <div className="max-w-4xl mx-auto py-20 text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Generando formato de impresión membretado...
        </div>
      }>
        <ImprimirNotaContenido params={params} />
      </Suspense>
    </div>
  )
}

async function ImprimirNotaContenido({ params }: { params: Promise<{ id: string }> }) {
  const p = await params
  const id = parseInt(p.id)
  if (isNaN(id)) notFound()

  const nota = await fetchNotaById(id)
  if (!nota) notFound()

  // Generar enlace dinámico para el código QR de doble verificación
  const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://wear.fashiondisplaysmexico.com'
  const deepLink = `inv-tienda://nota?num=${nota.cabecera.numero_nota}&orig=${nota.cabecera.bodega_origen_codigo}&id=${nota.cabecera.id}&tot=${nota.cabecera.total_cajas}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(deepLink)}`

  return (
    <>
      {/* Auto-print trigger */}
      <AutoPrint />

      {/* Floating Action Bar (print:hidden Client Component) */}
      <PrintActionBar notaId={id} />

      {/* Hoja de impresión */}
      <div className="max-w-4xl mx-auto space-y-8 bg-white">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 border-b-2 border-black pb-6">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-none">Sistema de Gestión de Almacén</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-none">
              Nota de Movimiento
            </h1>
            <p className="text-xl font-bold font-mono tracking-wider">{nota.cabecera.numero_nota}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs pt-1">
              <span className="font-bold text-gray-500 uppercase">Estado:</span>
              <span className="font-bold uppercase">{nota.cabecera.estado_nombre}</span>
              
              <span className="font-bold text-gray-500 uppercase">Movimiento:</span>
              <span className="font-bold uppercase">{nota.cabecera.tipo_nombre}</span>
              
              <span className="font-bold text-gray-500 uppercase">Fecha Emisión:</span>
              <span>
                {nota.cabecera.fecha_nota ? (
                  <Fecha valor={nota.cabecera.fecha_nota} formato="fecha-hora" />
                ) : '—'}
              </span>

              {nota.cabecera.costo_total !== undefined && nota.cabecera.costo_total !== null && Number(nota.cabecera.costo_total) > 0 && (
                <>
                  <span className="font-bold text-gray-500 uppercase">Costo Nota:</span>
                  <span className="font-bold font-mono">${Number(nota.cabecera.costo_total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </>
              )}
            </div>
          </div>

          {/* Código QR de Doble Verificación */}
          <div className="flex flex-col items-center justify-center p-3 border rounded-xl bg-gray-50 text-center shrink-0 w-[170px] self-start sm:self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Código QR de verificación"
              width={130}
              height={130}
              className="object-contain"
            />
            <span className="text-[8px] font-bold font-mono tracking-wider text-gray-500 mt-2 uppercase">Escanear para verificar</span>
          </div>
        </div>

        {/* Bodegas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">Bodega Origen</span>
            <p className="font-bold text-base leading-tight">{nota.cabecera.bodega_origen_nombre}</p>
            <p className="text-[10px] font-mono text-gray-400">{nota.cabecera.bodega_origen_codigo}</p>
          </div>
          {nota.cabecera.bodega_destino_nombre && (
            <div className="space-y-1 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-6">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">Bodega Destino</span>
              <p className="font-bold text-base leading-tight">{nota.cabecera.bodega_destino_nombre}</p>
              <p className="text-[10px] font-mono text-gray-400">{nota.cabecera.bodega_destino_codigo}</p>
            </div>
          )}
        </div>

        {/* Tabla de Productos */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none block">Artículos Detallados</span>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 border-b font-bold text-gray-600">
                  <th className="px-4 py-2 text-left w-[120px]">SKU</th>
                  <th className="px-4 py-2 text-left">Descripción del Producto</th>
                  <th className="px-4 py-2 text-center w-[120px]">Caja Pack</th>
                  <th className="px-4 py-2 text-center w-[80px]">Cajas</th>
                  <th className="px-4 py-2 text-center w-[80px]">Piezas</th>
                  <th className="px-4 py-2 text-right w-[100px]">Total Est.</th>
                </tr>
              </thead>
              <tbody>
                {nota.detalles.map((d) => {
                  const totalEst = (d.cajas * (d.producto_pz_en_caja ?? 0)) + d.piezas_sueltas
                  return (
                    <tr key={d.id} className="border-b">
                      <td className="px-4 py-2 font-mono">
                        <div>{d.producto_sku}</div>
                        {d.codigo_original && d.codigo_original !== d.producto_sku && (
                          <span className="text-[9px] text-gray-500 block font-sans">
                            Físico: <strong>{d.codigo_original}</strong>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <p className="font-semibold">{d.producto_nombre ?? '—'}</p>
                        {d.color_nombre && (
                          <span className="text-[10px] text-gray-500 uppercase">Talla: {d.talla_codigo ?? '—'} | Color: {d.color_nombre}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center font-mono text-gray-500">
                        {d.caja_codigo ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-center font-bold font-mono">{d.cajas}</td>
                      <td className="px-4 py-2 text-center font-mono">{d.piezas_sueltas}</td>
                      <td className="px-4 py-2 text-right font-bold font-mono text-sm">{totalEst}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold border-t">
                  <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider text-gray-500 font-bold">Total Cajas Declaradas:</td>
                  <td className="px-4 py-3 text-center font-mono text-base font-black">{nota.cabecera.total_cajas}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sección de Anotaciones / Verificación de Tallas y Cajas (Punteada para escritura manual) */}
        <div className="space-y-3 pt-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none block">Anotaciones / Verificación de Cajas Físicas</span>
          <div className="border border-dashed border-gray-300 rounded-xl p-6 min-h-[160px] space-y-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight leading-none mb-4">Espacio reservado para notas de validación en bodega:</p>
            <div className="border-b border-dashed border-gray-300 h-6"></div>
            <div className="border-b border-dashed border-gray-300 h-6"></div>
            <div className="border-b border-dashed border-gray-300 h-6"></div>
          </div>
        </div>

        {/* Firmas de Verificación */}
        <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
          <div className="space-y-12">
            <div className="border-b border-black w-3/4 mx-auto"></div>
            <div className="space-y-0.5">
              <p className="font-bold text-gray-800">Elaborado Por</p>
              <p className="text-[10px] text-gray-400 font-mono">Firma del Almacenista</p>
            </div>
          </div>
          
          <div className="space-y-12">
            <div className="border-b border-black w-3/4 mx-auto"></div>
            <div className="space-y-0.5">
              <p className="font-bold text-gray-800">Autorizado Por</p>
              <p className="text-[10px] text-gray-400 font-mono">Firma del Administrador</p>
            </div>
          </div>

          <div className="space-y-12">
            <div className="border-b border-black w-3/4 mx-auto"></div>
            <div className="space-y-0.5">
              <p className="font-bold text-gray-800">Recibido Por</p>
              <p className="text-[10px] text-gray-400 font-mono">Firma del Transportista</p>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div className="pt-8 text-center text-[9px] text-gray-400 font-mono uppercase tracking-widest border-t">
          <span>inv-tienda logistica · ID de Nota: {nota.cabecera.id} · impreso el {new Date().toLocaleDateString('es-MX')}</span>
        </div>
      </div>
    </>
  )
}
