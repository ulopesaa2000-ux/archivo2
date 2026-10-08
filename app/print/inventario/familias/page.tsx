// app/print/inventario/familias/page.tsx
// Vista de impresión directa del reporte global de familias (carta horizontal).
// El Excel queda intacto para análisis; esta ruta es solo para imprimir en
// papel (Canon de oficina) o guardar como PDF desde el diálogo del navegador:
// el encabezado se repite en cada página (table-header-group) y cada familia
// viaja íntegra a la página (break-inside: avoid), sin celdas partidas.
import { Suspense } from 'react'
import { fetchResumenFamilias } from '@/modules/catalogo/queries'
import { fetchConfigInventario } from '@/modules/inventario/config-queries'
import { sortBodegasWithConfig } from '@/modules/inventario/config-types'
import type { BodegaRow } from '@/lib/types/tables'
import { createClient } from '@/lib/supabase/server'
import {
  compareFamiliaAsc,
  compareSkuAsc,
  isUnassignedFamily,
} from '@/lib/inventario/familias-orden'
import { TIMEZONE, LOCALE } from '@/lib/constants'
import { AutoPrint } from '@/app/print/inventario/notas/[id]/AutoPrint'
import { PrintActionBar } from '@/app/print/inventario/familias/PrintActionBar'
import {
  FamiliasPrintTable,
  type BodegaPrint,
  type FamiliaPrint,
} from '@/app/print/inventario/familias/FamiliasPrintTable'

export default function ImprimirFamiliasPage({
  searchParams,
}: {
  searchParams: Promise<{ blanco?: string; familia?: string; cero?: string }>
}) {
  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-8 font-sans">
      <Suspense
        fallback={
          <div className="py-20 text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Generando formato de impresión...
          </div>
        }
      >
        <ImprimirFamiliasContenido searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function ImprimirFamiliasContenido({
  searchParams,
}: {
  searchParams: Promise<{ blanco?: string; familia?: string; cero?: string }>
}) {
  const sp = await searchParams
  const isBlanco = sp.blanco === '1'
  const showFamilia = sp.familia !== '0'
  // Check de stock cero: por default se muestra todo (como cuando el check
  // está activo en la interfaz); con ?cero=0 solo sale stock > 0 y las
  // bodegas con total 0 se ocultan del reporte en ese caso.
  const includeZero = sp.cero !== '0'

  const supabase = await createClient()
  const [bodegasRes, stockRes, familias, config] = await Promise.all([
    supabase.from('bodegas').select('*').eq('activa', true),
    supabase.from('inventario_stock').select('producto_id, bodega_id, cajas'),
    fetchResumenFamilias(),
    fetchConfigInventario(),
  ])

  // Bodegas en el mismo orden que el Excel de Stock: según tu Configuración
  // de Inventario (criterio por ciudad/alfabético + tu orden manual de
  // bodegas + virtuales al final). Requiere la fila completa (ciudad).
  let bodegas: BodegaPrint[] = sortBodegasWithConfig(
    ((bodegasRes.data ?? []) as BodegaRow[]).filter((b) => b.activa !== false),
    config,
  ).map((b) => ({ id: b.id, nombre: b.nombre, es_virtual: b.es_virtual ?? null }))

  // Stock real por producto y bodega (cajas), y total por producto
  const stockPorProductoYBodega: Record<number, Record<number, number>> = {}
  const totalStockPorProducto: Record<number, number> = {}
  for (const st of stockRes.data || []) {
    const cajas = st.cajas ?? 0
    if (!stockPorProductoYBodega[st.producto_id]) {
      stockPorProductoYBodega[st.producto_id] = {}
    }
    stockPorProductoYBodega[st.producto_id][st.bodega_id] =
      (stockPorProductoYBodega[st.producto_id][st.bodega_id] || 0) + cajas
    totalStockPorProducto[st.producto_id] =
      (totalStockPorProducto[st.producto_id] || 0) + cajas
  }

  // Familias A-Z enviando sin-asignar al final (igual que el Excel)
  const sorted = [...familias].sort((a, b) =>
    compareFamiliaAsc(a.familia || 'SIN FAMILIA', b.familia || 'SIN FAMILIA'),
  )

  const filas: FamiliaPrint[] = []
  const totalesPorBodega: Record<number, number> = {}
  let grandTotal = 0
  let realFamiliesCount = 0

  for (const f of sorted) {
    const name = f.familia || 'Sin Clasificar'
    const unassigned = isUnassignedFamily(f.familia)

    const skus = [...(f.skus || [])].sort((a, b) =>
      compareSkuAsc(a.sku_base, b.sku_base),
    )
    if (skus.length === 0) continue

    const primerConDesc =
      skus.find((s) => s.descripcion && s.descripcion.trim()) || skus[0]
    const desc = primerConDesc?.descripcion || f.descripcion || ''

    const descripcionesPorSku: Record<number, string> = {}
    if (unassigned) {
      for (const s of skus) {
        descripcionesPorSku[s.id] = s.descripcion || desc || ''
      }
    }

    const skusPrint = skus
      .map((s) => {
        const porBodega: Record<number, number> = {}
        let total = 0
        for (const b of bodegas) {
          const v = stockPorProductoYBodega[s.id]?.[b.id] ?? 0
          porBodega[b.id] = v
          total += v
        }
        return {
          id: s.id,
          sku_base: s.sku_base,
          activo: s.activo ?? null,
          porBodega,
          total,
        }
      })
      // Sin el check de stock cero: solo estilos con stock > 0 (como la interfaz)
      .filter((s) => includeZero || s.total !== 0)
    if (skusPrint.length === 0) continue
    if (!unassigned) realFamiliesCount++

    for (const s of skusPrint) {
      for (const b of bodegas) {
        totalesPorBodega[b.id] = (totalesPorBodega[b.id] || 0) + (s.porBodega[b.id] ?? 0)
      }
      grandTotal += s.total
    }

    filas.push({
      familia: name,
      descripcion: desc,
      isUnassigned: unassigned,
      skus: skusPrint,
      descripcionesPorSku,
    })
  }

  // Sin el check de stock cero: las bodegas con total 0 no salen en el reporte
  if (!includeZero) {
    bodegas = bodegas.filter((b) => (totalesPorBodega[b.id] || 0) !== 0)
  }

  const ahora = new Date()
  const mesActual = ahora
    .toLocaleDateString(LOCALE, { month: 'long', timeZone: TIMEZONE })
    .toUpperCase()
  const anioActual = ahora.toLocaleDateString(LOCALE, {
    year: 'numeric',
    timeZone: TIMEZONE,
  })
  const titulo = isBlanco
    ? `INVENTARIO GLOBAL (FORMATO BLANCO)  ${mesActual} ${anioActual}`
    : `INVENTARIO GLOBAL CON EXISTENCIAS  ${mesActual} ${anioActual}`

  return (
    <>
      <AutoPrint />
      <PrintActionBar isBlanco={isBlanco} showFamilia={showFamilia} includeZero={includeZero} />

      <style>{`
        @page { size: letter landscape; margin: 5mm 4mm 6mm 4mm; }
        .fam-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .fam-table th, .fam-table td { border: 1px solid #94a3b8; }
        .col-desc { width: 26%; }
        .col-estilo { width: 9.5%; }
        .col-bod { width: auto; }
        .col-global { width: 4.5%; }
        .col-fam { width: 9%; }
        .fam-table thead th {
          background: #dbeafe; color: #0f172a;
          font-size: 8px; font-weight: 800; text-align: center;
        }
        .th-desc { background: #b4c6e7 !important; padding: 4px 3px; font-size: 8.5px; }
        .th-estilo { background: #f1f5f9 !important; padding: 4px 3px; }
        .th-fam { background: #dbeafe !important; color: #1e40af !important; padding: 4px 3px; }
        th.th-bod, th.th-global {
          background: #ddebf7; vertical-align: bottom; padding: 5px 1px 6px 1px;
        }
        th.th-bod.virtual { background: #fce4d6; }
        th.th-bod > span, th.th-global > span {
          writing-mode: vertical-rl; white-space: nowrap;
          font-size: 8px; font-weight: 800; color: #0f172a; line-height: 1.1;
        }
        th.th-global { background: #fee2e2 !important; }
        th.th-global > span { color: #dc2626 !important; }
        th.th-fam.foot { background: #ddebf7 !important; color: #1e40af !important; font-size: 8.5px; padding: 4px 3px; }
        .td-desc {
          font-size: 8.5px; font-weight: 700; color: #1e293b; line-height: 1.2;
          text-align: left; vertical-align: middle; padding: 1px 3px;
          overflow-wrap: break-word; word-break: break-word;
        }
        .td-estilo {
          font-size: 10px; font-weight: 800; color: #0f172a;
          text-align: center; vertical-align: middle; padding: 1px 2px;
          overflow-wrap: anywhere; word-break: break-all;
        }
        .td-estilo.sl { font-size: 9px; }
        .td-estilo.sx { font-size: 8.5px; }
        .td-estilo.sin-stock { background: #fee2e2; color: #991b1b; }
        .td-estilo.inactivo { color: #ff0000; }
        /* Números: dígitos tabulares (mismo ancho) + talla según magnitud.
           Normal 9-10px legible; mínimo 7.5px solo para 5+ dígitos con miles. */
        .num { font-variant-numeric: tabular-nums; white-space: nowrap; letter-spacing: -0.2px; }
        .td-bod {
          font-size: 9px; color: #000; text-align: center;
          vertical-align: middle; padding: 1px;
        }
        .td-bod.n4 { font-size: 8.5px; }
        .td-bod.n5 { font-size: 7.5px; }
        .td-bod.total { font-weight: 800; background: #f8fafc; }
        .td-global {
          font-size: 10px; font-weight: 800; color: #dc2626;
          text-align: center; vertical-align: middle; background: #fee2e2;
          padding: 1px;
        }
        .td-global.n4 { font-size: 9px; }
        .td-global.n5 { font-size: 8px; }
        .td-fam {
          font-size: 8.5px; font-weight: 800; color: #1e40af;
          text-align: center; vertical-align: middle; padding: 1px 3px;
          overflow-wrap: anywhere;
        }
        .td-fam.total { background: #ddebf7; font-size: 9px; }
        .td-total-label {
          font-size: 10px; font-weight: 800; color: #0f172a; text-align: right;
          vertical-align: middle; padding: 3px 6px; background: #f1f5f9;
        }
        .td-bodegas-label {
          font-size: 10px; font-weight: 800; color: #1e40af; text-align: right;
          vertical-align: middle; padding: 3px 6px; background: #ddebf7;
        }
        tbody.fam { border-bottom: 2px solid #475569; }
        @media print {
          thead { display: table-header-group; }
          tbody.fam { break-inside: avoid; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto">
        <h1 className="text-center text-lg font-black tracking-tight uppercase mb-1">
          {titulo}
        </h1>
        <p className="text-center text-[10px] text-gray-500 mb-3">
          {realFamiliesCount} familias · {filas.reduce((a, f) => a + f.skus.length, 0)} estilos
          {isBlanco ? ' · formato para conteo físico' : ''}
        </p>
        <FamiliasPrintTable
          bodegas={bodegas}
          familias={filas}
          totalesPorBodega={totalesPorBodega}
          grandTotal={grandTotal}
          realFamiliesCount={realFamiliesCount}
          isBlanco={isBlanco}
          showFamilia={showFamilia}
        />
        <p className="pt-4 text-center text-[9px] text-gray-400 font-mono uppercase tracking-widest">
          inv-tienda logística · impreso el{' '}
          {ahora.toLocaleDateString(LOCALE, { timeZone: TIMEZONE })}
        </p>
      </div>
    </>
  )
}
