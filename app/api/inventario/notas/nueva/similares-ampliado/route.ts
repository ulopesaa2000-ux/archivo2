// app/api/inventario/notas/nueva/similares-ampliado/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ProductoSustitutoAmpliado } from '@/modules/inventario/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bodegaIdStr = searchParams.get('bodega_id')
    const productoIdStr = searchParams.get('producto_id')
    const skuBase = searchParams.get('sku_base')?.trim().toUpperCase() || ''
    const familia = searchParams.get('familia')?.trim() || ''
    const marcaIdStr = searchParams.get('marca_id')
    const descripcion = searchParams.get('descripcion')?.trim() || ''

    if (!bodegaIdStr) {
      return NextResponse.json({ error: 'bodega_id es requerido' }, { status: 400 })
    }

    const bodegaId = parseInt(bodegaIdStr, 10)
    const productoId = productoIdStr ? parseInt(productoIdStr, 10) : null
    const marcaId = marcaIdStr ? parseInt(marcaIdStr, 10) : null

    const supabase = await createClient()

    // 1. Obtener datos del producto original si no se pasaron completos
    let currentSku = skuBase
    let currentFamilia = familia
    let currentMarcaId = marcaId
    let currentDesc = descripcion

    if (productoId && (!currentSku || !currentFamilia)) {
      const { data: prodData } = await supabase
        .from('productos')
        .select('sku_base, familia, marca_id, descripcion, nombre')
        .eq('id', productoId)
        .single()

      if (prodData) {
        currentSku = currentSku || prodData.sku_base || ''
        currentFamilia = currentFamilia || prodData.familia || ''
        currentMarcaId = currentMarcaId || prodData.marca_id || null
        currentDesc = currentDesc || prodData.descripcion || prodData.nombre || ''
      }
    }

    // 2. Extraer raíz o tokens significativos del SKU (ej: BO/16MSTLYC -> MSTLYC, BO/10MSTFE -> MSTFE)
    const cleanSku = currentSku.replace(/^BO\/?[0-9]+/i, '').replace(/[^A-Z0-9]/gi, '')
    const raizSku = cleanSku.length >= 3 ? cleanSku : currentSku.slice(-4)

    // 3. Consultar todo el stock con existencias (> 0) en esta bodega
    const { data: stockRows, error } = await supabase
      .from('inventario_stock')
      .select(`
        id, bodega_id, producto_id, cajas, piezas_sueltas,
        producto:productos!inner (
          id, sku_base, nombre, descripcion, familia, marca_id, pz_en_caja, activo,
          marca:cat_marcas!productos_marca_id_fkey ( nombre )
        )
      `)
      .eq('bodega_id', bodegaId)
      .is('caja_id', null)
      .gt('cajas', 0)
      .order('cajas', { ascending: false })

    if (error || !stockRows) {
      return NextResponse.json({ error: error?.message || 'Error consultando stock' }, { status: 500 })
    }

    const candidatosMap = new Map<number, ProductoSustitutoAmpliado>()

    // Palabras clave de la descripción para cotejo léxico
    const descWords = currentDesc
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['para', 'dama', 'caballero', 'chm', 'set'].includes(w))

    for (const row of stockRows) {
      const p = Array.isArray(row.producto) ? row.producto[0] : row.producto
      if (!p || (productoId && p.id === productoId) || p.activo === false) continue

      const pSku = (p.sku_base || '').toUpperCase()
      const pFamilia = p.familia || ''
      const pMarcaId = p.marca_id
      const pDesc = (p.descripcion || p.nombre || '').toLowerCase()
      const marcaObj = Array.isArray(p.marca) ? p.marca[0] : p.marca
      const marcaNombre = marcaObj?.nombre || null

      let tipo: 'misma_raiz' | 'misma_familia' | 'misma_marca' | 'descripcion_similar' | null = null

      // A. Coincidencia por Raíz de SKU (Máxima prioridad, ej: BO/1DSETFE vs BO/6DSETFE)
      if (raizSku.length >= 3 && pSku.includes(raizSku)) {
        tipo = 'misma_raiz'
      }
      // B. Misma Familia
      else if (currentFamilia && pFamilia && currentFamilia.toLowerCase() === pFamilia.toLowerCase()) {
        tipo = 'misma_familia'
      }
      // C. Misma Marca y coincidencia de palabras clave
      else if (currentMarcaId && pMarcaId === currentMarcaId && descWords.some((w) => pDesc.includes(w))) {
        tipo = 'descripcion_similar'
      }
      // D. Misma Marca
      else if (currentMarcaId && pMarcaId === currentMarcaId) {
        tipo = 'misma_marca'
      }

      if (tipo) {
        candidatosMap.set(p.id, {
          id: p.id,
          sku_base: p.sku_base,
          nombre: p.nombre,
          descripcion: p.descripcion,
          familia: p.familia,
          marca_id: p.marca_id,
          marca_nombre: marcaNombre,
          pz_en_caja: p.pz_en_caja,
          cajas_disponibles: row.cajas,
          piezas_disponibles: row.piezas_sueltas || 0,
          similitud_tipo: tipo,
        })
      }
    }

    const prioridadTipo: Record<string, number> = {
      misma_raiz: 1,
      misma_familia: 2,
      descripcion_similar: 3,
      misma_marca: 4,
    }

    const resultado = Array.from(candidatosMap.values()).sort((a, b) => {
      const pA = prioridadTipo[a.similitud_tipo] || 99
      const pB = prioridadTipo[b.similitud_tipo] || 99
      if (pA !== pB) return pA - pB
      return b.cajas_disponibles - a.cajas_disponibles
    })

    return NextResponse.json(resultado)
  } catch (err: any) {
    console.error('Error en /api/inventario/notas/nueva/similares-ampliado:', err)
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
