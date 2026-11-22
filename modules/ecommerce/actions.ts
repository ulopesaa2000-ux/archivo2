// modules/ecommerce/actions.ts
'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { generateSmartSeo, mergeKeywords } from '@/lib/ecommerce/seo-generator'
import {
  mergeMensajePrecioVariable,
  parseStoreConfig,
  serializeStoreConfig,
} from '@/lib/utils/storeConfig'
import { getCurrentUser } from '@/modules/auth/queries'
import { can, type PermissionAction, type PermissionModule } from '@/lib/auth/permissions'
import type { Database } from '@/lib/types/database.types'
import type {
  ConfigEcommerceUpdate,
  ProductoWebInsert,
  ProductoWebUpdate,
  DatosContacto,
  OrdenVentaUpdate,
  QuoteItem,
} from './types'

async function requireEcommercePermission(
  modulo: PermissionModule,
  accion: PermissionAction = 'puede_editar'
): Promise<void> {
  const currentUser = await getCurrentUser().catch(() => null)
  if (!currentUser || !can(currentUser, modulo, accion)) {
    throw new Error('No tienes permisos para realizar esta acción en ecommerce.')
  }
}

function revalidateStoreCatalogo(options?: { slugs?: string[]; includeBanners?: boolean }) {
  updateTag('ecommerce-catalogo')
  if (options?.includeBanners) {
    updateTag('ecommerce-banners')
  }
  revalidatePath('/ecommerce/productos-web')
  revalidatePath('/')
  revalidatePath('/inicio')
  revalidatePath('/shop')
  revalidatePath('/sitemap.xml')
  if (options?.slugs) {
    for (const rawSlug of options.slugs) {
      if (rawSlug) {
        updateTag(`producto-slug-${rawSlug.toLowerCase()}`)
        revalidatePath(`/shop/${slugify(rawSlug)}`)
      }
    }
  }
}

// CONFIGURACION GLOBAL

export async function actualizarConfigEcommerce(data: Partial<ConfigEcommerceUpdate> & Record<string, any>) {
  await requireEcommercePermission('ecommerce_config', 'puede_editar')
  const supabase = await createClient()

  // Extraer únicamente las columnas válidas existentes en la base de datos (inv-tienda.config_ecommerce)
  const {
    modo_operacion,
    modo_visibilidad_catalogo,
    mostrar_precios,
    tipo_precio_visible,
    tipo_venta,
    minimo_unidades,
    multiplo_cajas,
    texto_boton_agregar,
    texto_boton_finalizar,
    titulo_seccion_carrito,
    mensaje_precio_variable,
    tipo_orden_generada,
    modo_vista_carrito,
    requiere_aprobacion,
    permitir_checkout_invitado,
    email_notificaciones,
    mostrar_stock,
    mostrar_sku,
    mostrar_medidas_tabla,
    mostrar_variantes_agotadas,
    campos_contacto_requeridos,
    notificar_whatsapp,
    numero_whatsapp,
    dias_producto_nuevo,
    updated_by,
  } = data as any

  const updatePayload: Database['inv-tienda']['Tables']['config_ecommerce']['Update'] = {
    updated_at: new Date().toISOString(),
  }

  if (modo_operacion !== undefined) updatePayload.modo_operacion = modo_operacion
  if (modo_visibilidad_catalogo !== undefined) updatePayload.modo_visibilidad_catalogo = modo_visibilidad_catalogo
  if (modo_vista_carrito !== undefined) updatePayload.modo_vista_carrito = modo_vista_carrito
  if (mostrar_precios !== undefined) updatePayload.mostrar_precios = mostrar_precios
  if (tipo_precio_visible !== undefined) updatePayload.tipo_precio_visible = tipo_precio_visible
  if (tipo_venta !== undefined) updatePayload.tipo_venta = tipo_venta
  if (minimo_unidades !== undefined) updatePayload.minimo_unidades = minimo_unidades
  if (multiplo_cajas !== undefined) updatePayload.multiplo_cajas = multiplo_cajas
  if (texto_boton_agregar !== undefined) updatePayload.texto_boton_agregar = texto_boton_agregar
  if (texto_boton_finalizar !== undefined) updatePayload.texto_boton_finalizar = texto_boton_finalizar
  if (titulo_seccion_carrito !== undefined) updatePayload.titulo_seccion_carrito = titulo_seccion_carrito
  if (mensaje_precio_variable !== undefined) {
    const trimmedMsg = String(mensaje_precio_variable ?? '').trim()
    if (trimmedMsg.startsWith('{')) {
      // Viene desde LiveEditDrawer: preservar mensajePrecioVariable existente si no se envió explícito
      const { data: currentCfg } = await supabase
        .from('config_ecommerce')
        .select('mensaje_precio_variable')
        .eq('id', 1)
        .maybeSingle()

      try {
        const incoming = JSON.parse(trimmedMsg)
        if (currentCfg?.mensaje_precio_variable) {
          const prevParsed = JSON.parse(currentCfg.mensaje_precio_variable)
          if (!incoming.mensaje_precio_variable_texto && prevParsed?.mensaje_precio_variable_texto) {
            incoming.mensaje_precio_variable_texto = prevParsed.mensaje_precio_variable_texto
          }
          if (incoming.dias_producto_nuevo === undefined && prevParsed?.dias_producto_nuevo !== undefined) {
            incoming.dias_producto_nuevo = prevParsed.dias_producto_nuevo
          }
        }
        updatePayload.mensaje_precio_variable = JSON.stringify(incoming)
      } catch {
        updatePayload.mensaje_precio_variable = trimmedMsg
      }
    } else {
      // Viene desde ConfigForm: fusionar con el JSON visual existente sin perder textos ni contactos
      const { data: currentCfg } = await supabase
        .from('config_ecommerce')
        .select('mensaje_precio_variable')
        .eq('id', 1)
        .maybeSingle()
      let merged = mergeMensajePrecioVariable(currentCfg?.mensaje_precio_variable, trimmedMsg)
      if (dias_producto_nuevo !== undefined && Number.isFinite(Number(dias_producto_nuevo)) && Number(dias_producto_nuevo) >= 0) {
        const parsed = parseStoreConfig(merged)
        merged = serializeStoreConfig({
          ...parsed,
          diasProductoNuevo: Math.floor(Number(dias_producto_nuevo)),
        })
      }
      updatePayload.mensaje_precio_variable = merged
    }
  } else if (dias_producto_nuevo !== undefined && Number.isFinite(Number(dias_producto_nuevo)) && Number(dias_producto_nuevo) >= 0) {
    const { data: currentCfg } = await supabase
      .from('config_ecommerce')
      .select('mensaje_precio_variable')
      .eq('id', 1)
      .maybeSingle()
    const parsed = parseStoreConfig(currentCfg?.mensaje_precio_variable)
    updatePayload.mensaje_precio_variable = serializeStoreConfig({
      ...parsed,
      diasProductoNuevo: Math.floor(Number(dias_producto_nuevo)),
    })
  }
  if (tipo_orden_generada !== undefined) updatePayload.tipo_orden_generada = tipo_orden_generada
  if (requiere_aprobacion !== undefined) updatePayload.requiere_aprobacion = requiere_aprobacion
  if (permitir_checkout_invitado !== undefined) updatePayload.permitir_checkout_invitado = permitir_checkout_invitado
  if (email_notificaciones !== undefined) updatePayload.email_notificaciones = email_notificaciones || null
  if (mostrar_stock !== undefined) updatePayload.mostrar_stock = mostrar_stock
  if (mostrar_sku !== undefined) updatePayload.mostrar_sku = mostrar_sku
  if (mostrar_medidas_tabla !== undefined) updatePayload.mostrar_medidas_tabla = mostrar_medidas_tabla
  if (mostrar_variantes_agotadas !== undefined) updatePayload.mostrar_variantes_agotadas = mostrar_variantes_agotadas
  if (campos_contacto_requeridos !== undefined) updatePayload.campos_contacto_requeridos = campos_contacto_requeridos
  if (notificar_whatsapp !== undefined) updatePayload.notificar_whatsapp = notificar_whatsapp
  if (numero_whatsapp !== undefined) updatePayload.numero_whatsapp = numero_whatsapp
  if (updated_by !== undefined) updatePayload.updated_by = updated_by

  const { error } = await supabase
    .from('config_ecommerce')
    .update(updatePayload)
    .eq('id', 1)

  if (error) {
    throw new Error(`Error actualizando config: ${error.message}`)
  }

  updateTag('ecommerce-config')
  updateTag('ecommerce-catalogo')
  revalidatePath('/', 'layout')
  revalidatePath('/')
  revalidatePath('/inicio')
  revalidatePath('/contactos')
  revalidatePath('/shop')
  revalidatePath('/cotizacion')
  revalidatePath('/ecommerce/config')

  return { success: true }
}

// PRODUCTOS WEB (ADMIN)

export async function publicarProductoWeb(data: ProductoWebInsert) {
  await requireEcommercePermission('ecommerce_catalogo', 'puede_crear')
  const supabase = await createClient()

  let slug = data.slug
  if (!slug) {
    const { data: producto } = await supabase
      .from('productos')
      .select('nombre, descripcion, sku_base, precio_ec')
      .eq('id', data.producto_id)
      .single()

    if (producto) {
      const baseText = producto.nombre || producto.descripcion || `producto-${data.producto_id}`
      slug = slugify(`${baseText}-${producto.sku_base}`)
    }
  }

  const { data: existente } = await supabase
    .from('productos_web')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existente) {
    slug = `${slug}-${Date.now()}`
  }

  const precioPublicoFinal = data.precio_publico && Number(data.precio_publico) > 0 ? Number(data.precio_publico) : 1

  const insertPayload: Database['inv-tienda']['Tables']['productos_web']['Insert'] = {
    ...data,
    precio_publico: precioPublicoFinal,
    slug,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: result, error } = await supabase
    .from('productos_web')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    throw new Error(`Error publicando producto: ${error.message}`)
  }

  revalidateStoreCatalogo({ slugs: slug ? [slug] : undefined })

  return { success: true, data: result }
}

export async function togglePublicarProductoWebAction(
  productoId: number,
  actualmentePublicado: boolean,
  productoWebId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    const supabase = await createClient()

    if (productoWebId) {
      const { error } = await (supabase as any)
        .from('productos_web')
        .update({
          activo: !actualmentePublicado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productoWebId)

      if (error) return { success: false, error: error.message }
    } else {
      const { data: prod } = await (supabase as any)
        .from('productos')
        .select('nombre, descripcion, sku_base, precio_ec')
        .eq('id', productoId)
        .single()

      const precioPublico = prod?.precio_ec && Number(prod.precio_ec) > 0 ? Number(prod.precio_ec) : 1
      const baseText = prod?.nombre || prod?.descripcion || `producto-${productoId}`
      const baseSlug = slugify(`${baseText}-${prod?.sku_base || ''}`) || `producto-${productoId}`
      let slug = baseSlug

      const { data: existente } = await (supabase as any)
        .from('productos_web')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (existente) {
        slug = `${baseSlug}-${Date.now()}`
      }

      const { error } = await (supabase as any)
        .from('productos_web')
        .insert({
          producto_id: productoId,
          slug,
          precio_publico: precioPublico,
          activo: true,
          en_oferta: false,
          destacado: false,
          nuevo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) return { success: false, error: error.message }
    }

    revalidateStoreCatalogo()
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al cambiar publicación.' }
  }
}

export async function toggleDestacadoProductoWebAction(
  productoId: number,
  actualmenteDestacado: boolean,
  productoWebId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    const supabase = await createClient()
    const nuevoDestacado = !actualmenteDestacado

    // 1. Sincronizar en inv-tienda.productos
    await (supabase as any)
      .from('productos')
      .update({ destacado: nuevoDestacado })
      .eq('id', productoId)

    // 2. Sincronizar en inv-tienda.productos_web
    if (productoWebId) {
      const { error } = await (supabase as any)
        .from('productos_web')
        .update({
          destacado: nuevoDestacado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productoWebId)

      if (error) return { success: false, error: error.message }
    } else {
      const { data: prod } = await (supabase as any)
        .from('productos')
        .select('nombre, descripcion, sku_base, precio_ec')
        .eq('id', productoId)
        .single()

      const precioPublico = prod?.precio_ec && Number(prod.precio_ec) > 0 ? Number(prod.precio_ec) : 1
      const baseText = prod?.nombre || prod?.descripcion || `producto-${productoId}`
      const baseSlug = slugify(`${baseText}-${prod?.sku_base || ''}`) || `producto-${productoId}`
      let slug = baseSlug

      const { data: existente } = await (supabase as any)
        .from('productos_web')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (existente) {
        slug = `${baseSlug}-${Date.now()}`
      }

      const { error } = await (supabase as any)
        .from('productos_web')
        .insert({
          producto_id: productoId,
          slug,
          precio_publico: precioPublico,
          activo: false,
          en_oferta: false,
          destacado: nuevoDestacado,
          nuevo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) return { success: false, error: error.message }
    }

    revalidateStoreCatalogo({ includeBanners: true })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al cambiar destacado.' }
  }
}

export async function toggleNuevoProductoWebAction(
  productoId: number,
  actualmenteNuevo: boolean,
  productoWebId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    const supabase = await createClient()
    const nuevoValor = !actualmenteNuevo

    if (productoWebId) {
      const { error } = await (supabase as any)
        .from('productos_web')
        .update({
          nuevo: nuevoValor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productoWebId)

      if (error) return { success: false, error: error.message }
    } else {
      const { data: prod } = await (supabase as any)
        .from('productos')
        .select('nombre, descripcion, sku_base, precio_ec')
        .eq('id', productoId)
        .single()

      const precioPublico = prod?.precio_ec && Number(prod.precio_ec) > 0 ? Number(prod.precio_ec) : 1
      const baseText = prod?.nombre || prod?.descripcion || `producto-${productoId}`
      const baseSlug = slugify(`${baseText}-${prod?.sku_base || ''}`) || `producto-${productoId}`
      let slug = baseSlug

      const { data: existente } = await (supabase as any)
        .from('productos_web')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (existente) {
        slug = `${baseSlug}-${Date.now()}`
      }

      const { error } = await (supabase as any)
        .from('productos_web')
        .insert({
          producto_id: productoId,
          slug,
          precio_publico: precioPublico,
          activo: false,
          en_oferta: false,
          destacado: false,
          nuevo: nuevoValor,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) return { success: false, error: error.message }
    }

    revalidateStoreCatalogo()
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al cambiar nuevo.' }
  }
}

export async function toggleOfertaProductoWebAction(
  productoId: number,
  actualmenteEnOferta: boolean,
  productoWebId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    const supabase = await createClient()
    const nuevoValor = !actualmenteEnOferta

    // Activar exige precio_oferta válido y menor al público (regla estricta)
    if (nuevoValor) {
      if (!productoWebId) {
        return {
          success: false,
          error: 'Fija primero precio público y de oferta (≥ $1) en el modal de precios.',
        }
      }
      const { data: row } = await (supabase as any)
        .from('productos_web')
        .select('id, precio_publico, precio_oferta')
        .eq('id', productoWebId)
        .maybeSingle()

      const pub = Number(row?.precio_publico ?? 0)
      const of = Number(row?.precio_oferta ?? 0)
      if (!Number.isFinite(of) || of < 1) {
        return { success: false, error: 'Fija un precio de oferta ≥ $1 para activar oferta.' }
      }
      if (!Number.isFinite(pub) || pub < 1 || of >= pub) {
        return { success: false, error: 'La oferta debe ser ≥ $1 y menor al precio público.' }
      }
    }

    if (productoWebId) {
      const { error } = await (supabase as any)
        .from('productos_web')
        .update({
          en_oferta: nuevoValor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productoWebId)

      if (error) return { success: false, error: error.message }
    } else {
      // Solo se permite quitar (ya está en false); activar sin registro se hace vía modal de precios
      if (nuevoValor) {
        return { success: false, error: 'Fija primero precio público y de oferta (≥ $1).' }
      }
      return { success: true }
    }

    revalidateStoreCatalogo()
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al cambiar oferta.' }
  }
}

export type FlagsMasivoInput = {
  destacado?: boolean | null
  nuevo?: boolean | null
  en_oferta?: boolean | null
}

/**
 * Acción Masiva: asignar o quitar flags especiales (destacado / nuevo / en_oferta).
 * null/undefined = sin cambio. Crea registro en productos_web si no existe
 * (precio_publico = precio_ec ?? 1, activo=false para no publicar solo).
 * Si en_oferta=true exige precioOferta >= 1 y menor al público (estricto).
 */
export async function actualizarFlagsMasivoAction(
  productoIds: number[],
  flags: FlagsMasivoInput,
  precioOferta?: number | null
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    if (!productoIds || productoIds.length === 0) {
      return { success: false, count: 0, error: 'No hay productos seleccionados.' }
    }
    const quiereOferta = flags.en_oferta === true
    const quiereQuitarOferta = flags.en_oferta === false
    const quiereDestacado = flags.destacado !== undefined && flags.destacado !== null
    const quiereNuevo = flags.nuevo !== undefined && flags.nuevo !== null

    if (!quiereOferta && !quiereQuitarOferta && !quiereDestacado && !quiereNuevo) {
      return { success: false, count: 0, error: 'Elige al menos un flag para actualizar.' }
    }

    let numOferta: number | null = null
    if (quiereOferta) {
      numOferta = precioOferta != null ? Number(precioOferta) : NaN
      if (!Number.isFinite(numOferta) || numOferta < 1) {
        return { success: false, count: 0, error: 'Para activar oferta fija un precio de oferta ≥ $1.' }
      }
    }

    const supabase = await createClient()

    const { data: existentes } = await (supabase as any)
      .from('productos_web')
      .select('id, producto_id, precio_publico, precio_oferta')
      .in('producto_id', productoIds)

    const existentesMap = new Map<number, { id: number; precio_publico: number; precio_oferta: number | null }>()
    for (const row of ((existentes || []) as any[])) {
      existentesMap.set(row.producto_id, {
        id: row.id,
        precio_publico: Number(row.precio_publico ?? 0),
        precio_oferta: row.precio_oferta != null ? Number(row.precio_oferta) : null,
      })
    }

    // 1. Actualizar los que ya tienen registro
    const updates: Promise<any>[] = []
    const nowIso = new Date().toISOString()
    for (const row of existentesMap.values()) {
      const patch: Record<string, any> = { updated_at: nowIso }
      if (quiereDestacado) patch.destacado = flags.destacado
      if (quiereNuevo) patch.nuevo = flags.nuevo
      if (quiereQuitarOferta) patch.en_oferta = false
      if (quiereOferta) {
        const pub = Number(row.precio_publico ?? 0)
        if (!Number.isFinite(pub) || pub < 1 || (numOferta as number) >= pub) {
          return {
            success: false,
            count: 0,
            error: `La oferta ($${(numOferta as number).toLocaleString('es-MX')}) debe ser ≥ $1 y menor al precio público. Revisa precios primero.`,
          }
        }
        patch.precio_oferta = numOferta
        patch.en_oferta = true
      }
      updates.push((supabase as any).from('productos_web').update(patch).eq('id', row.id))
    }
    if (updates.length > 0) {
      const results = await Promise.all(updates)
      const firstError = results.find((r) => r?.error)?.error
      if (firstError) return { success: false, count: 0, error: firstError.message }
    }

    // 2. Crear registro para nunca publicados (activo=false, precio 1 si no hay precio_ec)
    const idsInsertar = productoIds.filter((pid) => !existentesMap.has(pid))
    if (idsInsertar.length > 0) {
      const { data: prods } = await (supabase as any)
        .from('productos')
        .select('id, nombre, descripcion, sku_base, precio_ec')
        .in('id', idsInsertar)

      const inserts = ((prods || []) as any[]).map((p: any) => {
        const precioPublico = p.precio_ec && Number(p.precio_ec) > 0 ? Number(p.precio_ec) : 1
        if (quiereOferta && (numOferta as number) >= precioPublico) {
          throw new Error(
            `La oferta ($${(numOferta as number).toLocaleString('es-MX')}) debe ser menor al precio público ($${precioPublico.toLocaleString('es-MX')}). Sube el precio público primero.`
          )
        }
        const baseText = p.nombre || p.descripcion || `producto-${p.id}`
        const baseSlug = slugify(`${baseText}-${p.sku_base}`) || `producto-${p.id}`
        const slug = `${baseSlug}-${Date.now().toString(36).substring(4)}`
        return {
          producto_id: p.id,
          slug,
          precio_publico: precioPublico,
          precio_oferta: quiereOferta ? numOferta : null,
          activo: false,
          en_oferta: quiereOferta ? true : false,
          destacado: quiereDestacado ? (flags.destacado as boolean) : false,
          nuevo: quiereNuevo ? (flags.nuevo as boolean) : true,
          created_at: nowIso,
          updated_at: nowIso,
        }
      })

      if (inserts.length > 0) {
        const { error } = await (supabase as any).from('productos_web').insert(inserts)
        if (error) return { success: false, count: 0, error: error.message }
      }
    }

    revalidateStoreCatalogo({ includeBanners: true })
    return { success: true, count: productoIds.length }
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Error al actualizar flags.' }
  }
}

/**
 * Quita el flag `nuevo = false` en lote en `productos_web`:
 * - Si `todos = true`: limpia todos los registros que actualmente tienen `nuevo = true`.
 * - Si `todos = false`: limpia los que tienen `nuevo = true` y `created_at` anterior a `dias` días (default 90).
 */
export async function quitarNuevoMasivoPorAntiguedadAction(params: {
  todos: boolean
  dias?: number
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    const dias = Number.isFinite(Number(params.dias)) ? Math.floor(Number(params.dias)) : 90
    if (!params.todos && dias < 0) {
      return { success: false, count: 0, error: 'Ingresa un número de días válido (0 o mayor).' }
    }

    const supabase = await createClient()
    const nowIso = new Date().toISOString()

    let query = (supabase as any)
      .from('productos_web')
      .update({ nuevo: false, updated_at: nowIso })
      .eq('nuevo', true)

    if (!params.todos) {
      const fechaCorteIso = new Date(Date.now() - dias * 86_400_000).toISOString()
      query = query.lt('created_at', fechaCorteIso)
    }

    const { data, error } = await query.select('id')
    if (error) {
      return { success: false, count: 0, error: error.message }
    }

    revalidateStoreCatalogo({ includeBanners: true })
    return { success: true, count: (data || []).length }
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Error al limpiar etiqueta Nuevo.' }
  }
}


/**
 * Accion Masiva: Publicar lote de productos seleccionados
 */
export async function publicarProductosMasivoAction(
  productoIds: number[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    if (!productoIds || productoIds.length === 0) {
      return { success: false, count: 0, error: 'No hay productos seleccionados.' }
    }

    const supabase = await createClient()

    // 1. Obtener productos_web existentes para estos productoIds
    const { data: existentes } = await (supabase as any)
      .from('productos_web')
      .select('id, producto_id')
      .in('producto_id', productoIds)

    const existentesMap = (existentes || []).reduce((acc: Record<number, number>, row: any) => {
      acc[row.producto_id] = row.id
      return acc
    }, {})

    // 2. Para los que ya existen en productos_web, actualizar activo = true
    const idsActualizar = (existentes || []).map((row: any) => row.id)
    if (idsActualizar.length > 0) {
      await (supabase as any)
        .from('productos_web')
        .update({ activo: true, updated_at: new Date().toISOString() })
        .in('id', idsActualizar)
    }

    // 3. Para los que no existen, obtener sus nombres/skus/precio_ec e insertar
    const idsInsertar = productoIds.filter((pid) => !existentesMap[pid])
    if (idsInsertar.length > 0) {
      const { data: prods } = await (supabase as any)
        .from('productos')
        .select('id, nombre, descripcion, sku_base, precio_ec')
        .in('id', idsInsertar)

      const inserts = (prods || []).map((p: any) => {
        const precioPublico = p.precio_ec && Number(p.precio_ec) > 0 ? Number(p.precio_ec) : 1
        const baseText = p.nombre || p.descripcion || `producto-${p.id}`
        const baseSlug = slugify(`${baseText}-${p.sku_base}`) || `producto-${p.id}`
        const slug = `${baseSlug}-${Date.now().toString(36).substring(4)}`

        return {
          producto_id: p.id,
          slug,
          precio_publico: precioPublico,
          activo: true,
          en_oferta: false,
          destacado: false,
          nuevo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      })

      if (inserts.length > 0) {
        await (supabase as any).from('productos_web').insert(inserts)
      }
    }

    revalidateStoreCatalogo()
    return { success: true, count: productoIds.length }
  } catch (err: any) {
    console.error('Excepción publicarProductosMasivoAction:', err)
    return { success: false, count: 0, error: err?.message || 'Error en publicación masiva.' }
  }
}

/**
 * Accion Masiva: Despublicar / Pausar lote de productos seleccionados
 */
export async function despublicarProductosMasivoAction(
  productoIds: number[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    if (!productoIds || productoIds.length === 0) {
      return { success: false, count: 0, error: 'No hay productos seleccionados.' }
    }

    const supabase = await createClient()

    // Actualizar activo = false en productos_web donde producto_id esté en el lote
    const { error } = await (supabase as any)
      .from('productos_web')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .in('producto_id', productoIds)

    if (error) {
      return { success: false, count: 0, error: error.message }
    }

    revalidateStoreCatalogo()
    return { success: true, count: productoIds.length }
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Error al despublicar masivo.' }
  }
}

/**
 * Accion Masiva: Actualizar precios en lote para productos seleccionados
 */
export async function actualizarPreciosMasivoAction(
  productoIds: number[],
  precioPublico: number,
  precioOferta?: number | null,
  enOferta?: boolean
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    if (!productoIds || productoIds.length === 0) {
      return { success: false, count: 0, error: 'No hay productos seleccionados.' }
    }

    const supabase = await createClient()

    // 1. Obtener productos_web existentes
    const { data: existentes } = await (supabase as any)
      .from('productos_web')
      .select('id, producto_id')
      .in('producto_id', productoIds)

    const existentesMap = (existentes || []).reduce((acc: Record<number, number>, row: any) => {
      acc[row.producto_id] = row.id
      return acc
    }, {})

    // 2. Para los que ya existen, actualizar precio_publico, precio_oferta, en_oferta
    const idsActualizar = (existentes || []).map((row: any) => row.id)
    if (idsActualizar.length > 0) {
      await (supabase as any)
        .from('productos_web')
        .update({
          precio_publico: precioPublico,
          precio_oferta: precioOferta ?? null,
          en_oferta: enOferta ?? false,
          updated_at: new Date().toISOString(),
        })
        .in('id', idsActualizar)
    }

    // 3. Para los que no existen, crear registro con precios fijados
    const idsInsertar = productoIds.filter((pid) => !existentesMap[pid])
    if (idsInsertar.length > 0) {
      const { data: prods } = await (supabase as any)
        .from('productos')
        .select('id, nombre, sku_base')
        .in('id', idsInsertar)

      const inserts = (prods || []).map((p: any) => ({
        producto_id: p.id,
        slug: slugify(`${p.nombre}-${p.sku_base}-${Date.now().toString(36).substring(4)}`),
        precio_publico: precioPublico,
        precio_oferta: precioOferta ?? null,
        en_oferta: enOferta ?? false,
        activo: false, // Se guarda precio pero queda borrador hasta que se publique
        destacado: false,
        nuevo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      if (inserts.length > 0) {
        await (supabase as any).from('productos_web').insert(inserts)
      }
    }

    revalidateStoreCatalogo()
    return { success: true, count: productoIds.length }
  } catch (err: any) {
    console.error('Excepción actualizarPreciosMasivoAction:', err)
    return { success: false, count: 0, error: err?.message || 'Error al actualizar precios masivos.' }
  }
}

export async function actualizarProductoWeb(id: number, data: ProductoWebUpdate) {
  await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
  const supabase = await createClient()

  if (data.slug) {
    const { data: existente } = await supabase
      .from('productos_web')
      .select('id')
      .eq('slug', data.slug)
      .neq('id', id)
      .maybeSingle()

    if (existente) {
      throw new Error('El slug ya existe para otro producto')
    }
  }

  const { data: updatedRow, error } = await supabase
    .from('productos_web')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) {
    throw new Error(`Error actualizando producto: ${error.message}`)
  }

  revalidateStoreCatalogo({
    slugs: updatedRow?.slug ? [updatedRow.slug] : undefined,
    includeBanners: data.destacado !== undefined,
  })

  return { success: true }
}

export async function despublicarProductoWeb(id: number) {
  await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
  const supabase = await createClient()

  const { data: updatedRow, error } = await supabase
    .from('productos_web')
    .update({
      activo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) {
    throw new Error(`Error despublicando producto: ${error.message}`)
  }

  revalidateStoreCatalogo({
    slugs: updatedRow?.slug ? [updatedRow.slug] : undefined,
  })

  return { success: true }
}

// ORDENES / COTIZACIONES

async function verificarPermisoOrdenes(
  accion: 'puede_editar' | 'puede_eliminar' = 'puede_editar'
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { getCurrentUser } = await import('@/modules/auth/queries')
  const { can } = await import('@/lib/auth/permissions')
  const currentUser = await getCurrentUser().catch(() => null)
  if (!currentUser || !can(currentUser, 'ecommerce_ordenes', accion)) {
    return { ok: false, error: 'Sin permiso para administrar órdenes de venta.' }
  }
  return { ok: true }
}

export async function actualizarEstadoOrden(
  id: number,
  nuevoEstado: string,
  notas?: string
) {
  // Cancelar = borrado lógico: exige puede_eliminar; el resto, puede_editar
  const permiso = await verificarPermisoOrdenes(nuevoEstado === 'cancelado' ? 'puede_eliminar' : 'puede_editar')
  if (!permiso.ok) return { success: false as const, error: permiso.error }

  const supabase = await createClient()

  // Evitar aprobar/procesar/despachar una orden con total $0 sin cotizar primero
  if (['aprobada', 'en_proceso', 'enviado', 'entregado', 'facturada'].includes(nuevoEstado)) {
    const { data: ordenActual } = await supabase
      .from('ordenes_venta')
      .select('total')
      .eq('id', id)
      .single()

    if (!ordenActual || Number(ordenActual.total ?? 0) <= 0) {
      return {
        success: false as const,
        error: 'No se puede aprobar, procesar ni despachar una orden con total $0 sin cotizar sus precios primero.',
      }
    }
  }

  const updates: OrdenVentaUpdate = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  }

  if (nuevoEstado === 'enviado') {
    updates.fecha_envio = new Date().toISOString()
  }

  if (nuevoEstado === 'entregado') {
    updates.fecha_entrega = new Date().toISOString()
  }

  const { error } = await supabase
    .from('ordenes_venta')
    .update(updates)
    .eq('id', id)

  if (error) {
    throw new Error(`Error actualizando estado: ${error.message}`)
  }

  revalidatePath('/(admin)/ecommerce/ordenes-venta')
  revalidatePath(`/(admin)/ecommerce/ordenes-venta/${id}`)

  return { success: true }
}

export async function actualizarNumeroRastreo(id: number, numeroRastreo: string) {
  const permiso = await verificarPermisoOrdenes()
  if (!permiso.ok) return { success: false as const, error: permiso.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('ordenes_venta')
    .update({
      numero_rastreo: numeroRastreo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Error actualizando rastreo: ${error.message}`)
  }

  revalidatePath(`/(admin)/ecommerce/ordenes-venta/${id}`)

  return { success: true }
}

// EDICIÓN DE PARTIDAS (editor de cotización en /ecommerce/ordenes-venta/[id])

async function recalcularTotalesOrden(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ordenId: number
): Promise<{ success: boolean; error?: string }> {
  const { data: items, error: itemsError } = await supabase
    .from('orden_items')
    .select('subtotal')
    .eq('orden_id', ordenId)

  if (itemsError) {
    return { success: false, error: `Error recalculando: ${itemsError.message}` }
  }

  const subtotal = (items ?? []).reduce((sum: number, i: any) => sum + Number(i.subtotal || 0), 0)

  const { data: orden, error: ordenError } = await supabase
    .from('ordenes_venta')
    .select('envio, impuestos')
    .eq('id', ordenId)
    .single()

  if (ordenError || !orden) {
    return { success: false, error: 'Orden no encontrada al recalcular.' }
  }

  const total = subtotal + Number((orden as any).envio || 0) + Number((orden as any).impuestos || 0)

  const { error: updateError } = await supabase
    .from('ordenes_venta')
    .update({
      subtotal,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ordenId)

  if (updateError) {
    return { success: false, error: `Error guardando totales: ${updateError.message}` }
  }

  return { success: true }
}

export async function actualizarItemOrden(
  ordenId: number,
  itemId: number,
  cantidad: number,
  precioUnitario: number,
  pzPorCaja?: number | null
): Promise<{ success: boolean; error?: string }> {
  const permiso = await verificarPermisoOrdenes()
  if (!permiso.ok) return { success: false, error: permiso.error }

  const cant = Math.floor(Number(cantidad))
  const precio = Number(precioUnitario)
  const factor = pzPorCaja === null || pzPorCaja === undefined ? null : Math.floor(Number(pzPorCaja))
  if (!Number.isInteger(ordenId) || !Number.isInteger(itemId)) {
    return { success: false, error: 'Orden o partida inválida.' }
  }
  if (!Number.isInteger(cant) || cant < 1) {
    return { success: false, error: 'La cantidad (pz) debe ser un entero mayor a 0.' }
  }
  if (!Number.isFinite(precio) || precio < 0) {
    return { success: false, error: 'El precio debe ser un número mayor o igual a 0.' }
  }
  if (factor !== null && (!Number.isInteger(factor) || factor < 1)) {
    return { success: false, error: 'El pz por caja debe ser un entero mayor a 0.' }
  }

  const supabase = await createClient()

  const { data: item, error: itemError } = await supabase
    .from('orden_items')
    .select('id')
    .eq('id', itemId)
    .eq('orden_id', ordenId)
    .maybeSingle()

  if (itemError || !item) {
    return { success: false, error: 'La partida no pertenece a esta orden.' }
  }

  const { error } = await supabase
    .from('orden_items')
    .update({
      cantidad: cant,
      precio_unitario: precio,
      subtotal: cant * precio,
      pz_por_caja: factor,
    })
    .eq('id', itemId)

  if (error) {
    return { success: false, error: `Error guardando partida: ${error.message}` }
  }

  const recalc = await recalcularTotalesOrden(supabase, ordenId)
  if (!recalc.success) return recalc

  revalidatePath(`/(admin)/ecommerce/ordenes-venta/${ordenId}`)
  revalidatePath('/mis-pedidos')
  return { success: true }
}

export async function eliminarItemOrden(
  ordenId: number,
  itemId: number
): Promise<{ success: boolean; error?: string }> {
  const permiso = await verificarPermisoOrdenes()
  if (!permiso.ok) return { success: false, error: permiso.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('orden_items')
    .delete()
    .eq('id', itemId)
    .eq('orden_id', ordenId)

  if (error) {
    return { success: false, error: `Error eliminando partida: ${error.message}` }
  }

  const recalc = await recalcularTotalesOrden(supabase, ordenId)
  if (!recalc.success) return recalc

  revalidatePath(`/(admin)/ecommerce/ordenes-venta/${ordenId}`)
  revalidatePath('/mis-pedidos')
  return { success: true }
}

// COTIZACION -> ORDEN B2B

export async function convertirCotizacionAOrdenB2B(
  cotizacionId: number,
  preciosFinales?: Record<number, number>
) {
  const permiso = await verificarPermisoOrdenes()
  if (!permiso.ok) throw new Error(permiso.error)

  const supabase = await createClient()

  const { data: cotizacion, error: cotError } = await supabase
    .from('ordenes_venta')
    .select('*')
    .eq('id', cotizacionId)
    .eq('estado', 'pendiente')
    .single()

  if (cotError || !cotizacion) {
    throw new Error('Cotizacion no encontrada o no esta pendiente')
  }

  const { data: items, error: itemsError } = await supabase
    .from('orden_items')
    .select('*')
    .eq('orden_id', cotizacionId)

  if (itemsError) {
    throw new Error('Error obteniendo items')
  }

  const esEntero = (v: unknown): v is number => Number.isInteger(v)
  const variantIds = (items ?? []).map((item) => item.variante_id).filter(esEntero)
  const webIds = (items ?? []).map((item) => (item as any).producto_web_id).filter(esEntero)

  const { data: variantes, error: variantesError } = variantIds.length > 0
    ? await supabase
        .from('variantes_producto')
        .select('id, producto_id')
        .in('id', variantIds)
    : { data: [], error: null }

  if (variantesError) {
    throw new Error('Error obteniendo variantes para conversion B2B')
  }

  const productoIdByVariante = new Map(
    (variantes ?? []).map((variante) => [variante.id, variante.producto_id])
  )

  // Items sin variante real (referencia web): resolver producto vía publicación
  const productoIdByWeb = new Map<number, number>()
  if (webIds.length > 0) {
    const { data: webs } = await (supabase.from('productos_web') as any)
      .select('id, producto_id')
      .in('id', [...new Set(webIds)])
    for (const w of (webs ?? []) as any[]) {
      productoIdByWeb.set(w.id, w.producto_id)
    }
  }

  const { data: ordenB2B, error: ordenError } = await supabase
    .from('ordenes_b2b')
    .insert({
      cliente_b2b_id: null,
      estado: 'Borrador',
      fecha_orden: new Date().toISOString(),
      moneda: 'USD',
      observaciones: `Convertido desde cotizacion #${cotizacion.numero_orden}. Contacto: ${cotizacion.nombre_cliente ?? 'N/A'} / ${cotizacion.email_cliente ?? 'N/A'} / ${cotizacion.telefono_cliente ?? 'N/A'}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (ordenError || !ordenB2B) {
    throw new Error('Error creando orden B2B')
  }

  let totalPiezas = 0
  const itemsB2B: Database['inv-tienda']['Tables']['ordenes_b2b_detalles']['Insert'][] = (items ?? []).map((item) => {
    const precioFinal = (item.variante_id != null ? preciosFinales?.[item.variante_id] : undefined) || item.precio_unitario
    const subtotalItem = item.cantidad * precioFinal
    const productoId =
      (item.variante_id != null ? productoIdByVariante.get(item.variante_id) : undefined) ??
      ((item as any).producto_web_id != null ? productoIdByWeb.get((item as any).producto_web_id) : undefined)

    if (!productoId) {
      throw new Error(`No se encontro producto para la partida ${item.id}`)
    }

    totalPiezas += item.cantidad

    return {
      orden_id: ordenB2B.id,
      producto_id: productoId,
      cantidad_solicitada: item.cantidad,
      piezas_pedidas: item.cantidad,
      precio_unitario: precioFinal,
      importe_total: subtotalItem,
    }
  })

  const { error: itemsB2BError } = await supabase
    .from('ordenes_b2b_detalles')
    .insert(itemsB2B)

  if (itemsB2BError) {
    throw new Error('Error creando items de orden B2B')
  }

  await supabase
    .from('ordenes_b2b')
    .update({
      total_piezas: totalPiezas,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ordenB2B.id)

  await supabase
    .from('ordenes_venta')
    .update({
      estado: 'convertida',
      updated_at: new Date().toISOString(),
    })
    .eq('id', cotizacionId)

  revalidatePath('/(admin)/ecommerce/ordenes-venta')
  revalidatePath('/(admin)/ordenes-b2b')

  return {
    success: true,
    ordenB2BId: ordenB2B.id,
  }
}

// CREAR COTIZACION DESDE STORE

const checkoutItemSchema = z.object({
  productoId: z.number().int().positive(),
  productoWebId: z.number().int().positive(),
  varianteId: z.number().int().positive().nullable(),
  esSurtido: z.boolean().optional(),
  nombre: z.string().trim().min(1).max(200),
  cantidad: z.number().int().min(1, 'La cantidad debe ser un entero mayor o igual a 1'),
  unidad: z.enum(['pieza', 'caja']).optional(),
  precioOfrecido: z.number().positive().max(10_000_000).optional(),
})

const checkoutContactSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre requerido').max(150),
  email: z.string().trim().email('Email inválido').max(160),
  telefono: z.string().trim().min(8, 'Teléfono requerido').max(40),
  empresa: z.string().trim().max(150).optional(),
  direccion: z.string().trim().max(300).optional(),
  ciudad: z.string().trim().max(120).optional(),
  estado: z.string().trim().max(120).optional(),
  notas: z.string().trim().max(2000).optional(),
})

const checkoutRateBuckets = new Map<string, number[]>()
const checkoutIdempotencyCache = new Map<
  string,
  { expiresAt: number; result: { success: true; ordenId: number; numeroOrden: string } }
>()

function checkCheckoutRateLimit(key: string): boolean {
  const now = Date.now()
  const windowMs = 5 * 60 * 1000
  const recent = (checkoutRateBuckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= 10) {
    checkoutRateBuckets.set(key, recent)
    return false
  }
  recent.push(now)
  checkoutRateBuckets.set(key, recent)
  return true
}

export async function crearCotizacion(
  items: QuoteItem[],
  datosContacto: DatosContacto,
  idempotencyKey?: string
) {
  const cleanIdempotency =
    typeof idempotencyKey === 'string' && idempotencyKey.trim().length >= 8
      ? idempotencyKey.trim().slice(0, 80)
      : null

  if (cleanIdempotency) {
    const cached = checkoutIdempotencyCache.get(cleanIdempotency)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result
    }
  }

  const parsedItems = z.array(checkoutItemSchema).min(1, 'Agrega al menos un producto').max(100).safeParse(items)
  if (!parsedItems.success) {
    throw new Error(parsedItems.error.issues[0]?.message || 'Ítems de cotización inválidos.')
  }

  const parsedContacto = checkoutContactSchema.safeParse(datosContacto)
  if (!parsedContacto.success) {
    throw new Error(parsedContacto.error.issues[0]?.message || 'Datos de contacto inválidos.')
  }

  const reqHeaders = await headers().catch(() => null)
  const ip =
    reqHeaders?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    reqHeaders?.get('x-real-ip')?.trim() ||
    'unknown'
  const emailKey = parsedContacto.data.email.toLowerCase()
  if (!checkCheckoutRateLimit(`ip:${ip}`) || !checkCheckoutRateLimit(`email:${emailKey}`)) {
    throw new Error('Has enviado demasiadas solicitudes recientemente. Intenta de nuevo en unos minutos.')
  }

  const { fetchConfigEcommerce } = await import('./queries')
  const configEcommerce = await fetchConfigEcommerce()
  const modoGlobal = (configEcommerce?.modo_operacion ?? 'ecommerce') as 'catalogo' | 'ecommerce' | 'hibrido'
  const minimoUnidades = Math.max(1, Number(configEcommerce?.minimo_unidades ?? 1))

  for (const item of parsedItems.data) {
    if (item.cantidad < minimoUnidades) {
      throw new Error(`"${item.nombre}" requiere un mínimo de ${minimoUnidades} unidades.`)
    }
  }

  const supabase = await createClient()

  // Vincular al usuario en sesión (cliente con cuenta); invitados quedan NULL
  const currentUser = await getCurrentUser().catch(() => null)

  // Resolver y validar estrictamente contra BD (ignorar precios/config enviados desde cliente)
  const { resolverItemsCotizacion } = await import('@/lib/utils/cotizacion-resolver')

  const idsWeb = Array.from(new Set(parsedItems.data.map((i) => i.productoWebId)))
  const idsVariante = Array.from(
    new Set(
      parsedItems.data
        .map((i) => i.varianteId)
        .filter((v): v is number => typeof v === 'number' && v > 0)
    )
  )

  const [{ data: websData, error: websErr }, { data: variantesData, error: varErr }] = await Promise.all([
    (supabase.from('productos_web') as any)
      .select('id, producto_id, activo, precio_publico, precio_oferta, en_oferta, modo_override, productos!inner(sku_base, pz_en_caja, activo)')
      .in('id', idsWeb)
      .eq('activo', true),
    idsVariante.length > 0
      ? supabase.from('variantes_producto').select('id, producto_id, activo').in('id', idsVariante)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (websErr || varErr) {
    throw new Error('Error al validar los productos del carrito en el servidor.')
  }

  const websMap = new Map<number, import('@/lib/utils/cotizacion-resolver').ProductoWebAutoritativo>()
  for (const w of (websData ?? []) as any[]) {
    if (w.productos?.activo === false) continue
    const pz =
      Number.isInteger(w.productos?.pz_en_caja) && w.productos.pz_en_caja > 0
        ? Number(w.productos.pz_en_caja)
        : null
    websMap.set(Number(w.id), {
      id: Number(w.id),
      producto_id: Number(w.producto_id),
      activo: Boolean(w.activo),
      precio_publico: Number(w.precio_publico ?? 0),
      precio_oferta: w.precio_oferta !== null && w.precio_oferta !== undefined ? Number(w.precio_oferta) : null,
      en_oferta: Boolean(w.en_oferta),
      modo_override: w.modo_override ?? null,
      pz_en_caja: pz,
      sku_base: String(w.productos?.sku_base || `WEB-${w.id}`),
    })
  }

  const variantesMap = new Map<number, { producto_id: number; activo: boolean }>()
  for (const v of (variantesData ?? []) as any[]) {
    variantesMap.set(Number(v.id), {
      producto_id: Number(v.producto_id),
      activo: v.activo !== false,
    })
  }

  const resueltos = resolverItemsCotizacion(parsedItems.data, variantesMap, websMap, modoGlobal)

  // Validar múltiplo de caja si aplica en configuración
  if (configEcommerce?.multiplo_cajas) {
    parsedItems.data.forEach((item, idx) => {
      const pz = resueltos[idx].pzPorCaja
      if (item.unidad === 'caja' && pz && pz > 1 && item.cantidad % pz !== 0) {
        throw new Error(`"${item.nombre}" debe solicitarse en múltiplos de ${pz} piezas por caja.`)
      }
    })
  }

  const subtotal = resueltos.reduce((sum, r) => sum + r.subtotal, 0)
  const hasCatalogoSinPrecio = resueltos.some((r) => r.esCatalogoSinPrecio)
  const hasSurtido = resueltos.some((r) => r.esSurtido)

  // En híbrido, catálogo o con surtido siempre nace 'pendiente'; fuera de ellos depende exclusivamente de BD
  const requiereAprobacion =
    modoGlobal === 'hibrido' ||
    modoGlobal === 'catalogo' ||
    hasCatalogoSinPrecio ||
    hasSurtido ||
    (configEcommerce?.requiere_aprobacion ?? true)

  const notasExtras = resueltos
    .map((r) => r.notaPropuesta)
    .filter((n): n is string => Boolean(n))
  if (hasCatalogoSinPrecio) {
    notasExtras.unshift('[REQUIERE COTIZACIÓN]')
  }

  const notasFinales = [parsedContacto.data.notas, ...notasExtras]
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000) || null

  const timestamp = Date.now().toString(36).toUpperCase()
  const numeroOrden = `COT-${timestamp}`

  const { data: orden, error } = await supabase
    .from('ordenes_venta')
    .insert({
      numero_orden: numeroOrden,
      usuario_id: currentUser?.id ?? null,
      email_cliente: parsedContacto.data.email,
      nombre_cliente: parsedContacto.data.nombre,
      telefono_cliente: parsedContacto.data.telefono,
      direccion_envio: parsedContacto.data.direccion
        ? {
            direccion: parsedContacto.data.direccion,
            ciudad: parsedContacto.data.ciudad,
            estado: parsedContacto.data.estado,
          }
        : null,
      subtotal,
      envio: 0,
      impuestos: 0,
      total: subtotal,
      estado: requiereAprobacion ? 'pendiente' : 'aprobada',
      notas_cliente: notasFinales,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !orden) {
    throw new Error(`Error creando cotizacion: ${error?.message}`)
  }

  const ordenItems: Database['inv-tienda']['Tables']['orden_items']['Insert'][] = parsedItems.data.map(
    (item, index) => ({
      orden_id: orden.id,
      variante_id: resueltos[index].varianteId,
      producto_web_id: resueltos[index].productoWebId,
      cantidad: item.cantidad,
      precio_unitario: resueltos[index].precioUnitario,
      subtotal: resueltos[index].subtotal,
      pz_por_caja: resueltos[index].pzPorCaja,
    })
  )

  const { error: itemsInsertError } = await supabase
    .from('orden_items')
    .insert(ordenItems)

  if (itemsInsertError) {
    await supabase.from('ordenes_venta').delete().eq('id', orden.id)
    throw new Error(`Error creando items de cotizacion: ${itemsInsertError.message}`)
  }

  revalidatePath('/(admin)/ecommerce/ordenes-venta')

  const successResult = {
    success: true as const,
    ordenId: orden.id,
    numeroOrden: orden.numero_orden,
  }

  if (cleanIdempotency) {
    checkoutIdempotencyCache.set(cleanIdempotency, {
      expiresAt: Date.now() + 5 * 60 * 1000,
      result: successResult,
    })
  }

  return successResult
}

// ═══════════════════════════════════════════════════════════════
// EDICIÓN RÁPIDA SEO + EXTRAS WEB (DESDE TABLA /productos-web)
// ═══════════════════════════════════════════════════════════════

const seoRapidoSchema = z.object({
  productoId: z.number().int().positive(),
  productoWebId: z.number().int().positive().nullable(),
  titulo_seo: z.string().max(120).nullable().optional(),
  descripcion_seo: z.string().max(320).nullable().optional(),
  keywords: z.string().max(500).nullable().optional(),
  unidad_venta: z.enum(['pieza', 'caja', 'ambas']),
  modo_override: z.enum(['default', 'catalogo', 'ecommerce']),
  orden_display: z.number().int().min(0).max(99999),
})

function cleanNullableStr(val?: string | null): string | null {
  if (val === undefined || val === null) return null
  const trimmed = val.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function buildUniqueSlugForProducto(
  supabase: any,
  prod: { id: number; nombre?: string | null; descripcion?: string | null; sku_base?: string | null }
): Promise<string> {
  const baseText = prod.nombre || prod.descripcion || `producto-${prod.id}`
  const baseSlug = slugify(`${baseText}-${prod.sku_base || ''}`) || `producto-${prod.id}`
  const { data: existente } = await supabase
    .from('productos_web')
    .select('id')
    .eq('slug', baseSlug)
    .maybeSingle()

  return existente ? `${baseSlug}-${Date.now().toString(36).slice(-4)}` : baseSlug
}

export async function actualizarSeoRapidoProductoWebAction(input: {
  productoId: number
  productoWebId: number | null
  titulo_seo: string | null
  descripcion_seo: string | null
  keywords: string | null
  unidad_venta: 'pieza' | 'caja' | 'ambas'
  modo_override: 'default' | 'catalogo' | 'ecommerce'
  orden_display: number
}): Promise<{ success: boolean; productoWebId?: number; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    const parsed = seoRapidoSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const supabase = await createClient()
    const {
      productoId,
      productoWebId,
      titulo_seo,
      descripcion_seo,
      keywords,
      unidad_venta,
      modo_override,
      orden_display,
    } = parsed.data

    const cleanTitulo = cleanNullableStr(titulo_seo)
    const cleanDesc = cleanNullableStr(descripcion_seo)
    const cleanKeywords = cleanNullableStr(keywords)
    const nowIso = new Date().toISOString()

    // Verificar si ya existe registro web (por id o por producto_id)
    let targetWebId = productoWebId
    let existingSlug: string | null = null

    if (targetWebId) {
      const { data: row } = await (supabase as any)
        .from('productos_web')
        .select('id, slug')
        .eq('id', targetWebId)
        .maybeSingle()
      if (row) existingSlug = row.slug
      else targetWebId = null
    }

    if (!targetWebId) {
      const { data: byProd } = await (supabase as any)
        .from('productos_web')
        .select('id, slug')
        .eq('producto_id', productoId)
        .maybeSingle()
      if (byProd) {
        targetWebId = byProd.id
        existingSlug = byProd.slug
      }
    }

    if (targetWebId) {
      const { error } = await (supabase as any)
        .from('productos_web')
        .update({
          titulo_seo: cleanTitulo,
          descripcion_seo: cleanDesc,
          keywords: cleanKeywords,
          unidad_venta,
          modo_override,
          orden_display,
          updated_at: nowIso,
        })
        .eq('id', targetWebId)

      if (error) return { success: false, error: error.message }

      revalidateStoreCatalogo({ slugs: existingSlug ? [existingSlug] : undefined })
      return { success: true, productoWebId: targetWebId }
    }

    // Si no tiene registro web aún, crear en borrador (pausado)
    const { data: prod, error: prodErr } = await (supabase as any)
      .from('productos')
      .select('id, nombre, descripcion, sku_base, precio_ec')
      .eq('id', productoId)
      .single()

    if (prodErr || !prod) {
      return { success: false, error: 'Producto no encontrado.' }
    }

    const precioPublico = prod.precio_ec && Number(prod.precio_ec) > 0 ? Number(prod.precio_ec) : 1
    const slug = await buildUniqueSlugForProducto(supabase as any, prod)

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from('productos_web')
      .insert({
        producto_id: productoId,
        slug,
        precio_publico: precioPublico,
        activo: false,
        en_oferta: false,
        destacado: false,
        nuevo: false,
        titulo_seo: cleanTitulo,
        descripcion_seo: cleanDesc,
        keywords: cleanKeywords,
        unidad_venta,
        modo_override,
        orden_display,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id')
      .single()

    if (insertErr) return { success: false, error: insertErr.message }

    revalidateStoreCatalogo({ slugs: [slug] })
    return { success: true, productoWebId: inserted?.id }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al guardar SEO rápido.' }
  }
}

export async function generarSeoMasivoAction(input: {
  productoIds: number[]
  soloVacios?: boolean
  extraKeywords?: string | null
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    await requireEcommercePermission('ecommerce_catalogo', 'puede_editar')
    const uniqueIds = Array.from(new Set(input.productoIds.filter((id) => Number.isInteger(id) && id > 0)))
    if (uniqueIds.length === 0) {
      return { success: false, count: 0, error: 'No hay productos seleccionados.' }
    }

    const soloVacios = input.soloVacios ?? true
    const extraKw = cleanNullableStr(input.extraKeywords)
    const supabase = await createClient()
    const nowIso = new Date().toISOString()

    // Consultar en chunks <= 150
    const allProds: any[] = []
    for (let i = 0; i < uniqueIds.length; i += 150) {
      const chunk = uniqueIds.slice(i, i + 150)
      const { data, error } = await (supabase as any)
        .from('productos')
        .select(`
          id,
          sku_base,
          nombre,
          descripcion,
          composicion,
          precio_ec,
          cat_marcas!left(nombre),
          cat_tipo_prenda!left(nombre),
          cat_generos!left(nombre),
          productos_web!left(
            id,
            slug,
            titulo_seo,
            descripcion_seo,
            keywords
          )
        `)
        .in('id', chunk)

      if (error) return { success: false, count: 0, error: error.message }
      if (data) allProds.push(...data)
    }

    const slugsToRevalidate: string[] = []
    const inserts: any[] = []
    const updates: Array<{ id: number; payload: Record<string, any> }> = []

    for (const prod of allProds) {
      const pw = Array.isArray(prod.productos_web) ? prod.productos_web[0] : prod.productos_web
      const smart = generateSmartSeo({
        sku_base: prod.sku_base,
        nombre: prod.nombre,
        descripcion: prod.descripcion,
        composicion: prod.composicion,
        marca_nombre: prod.cat_marcas?.nombre ?? null,
        tipo_prenda_nombre: prod.cat_tipo_prenda?.nombre ?? null,
        genero_nombre: prod.cat_generos?.nombre ?? null,
      })

      const curTitulo = cleanNullableStr(pw?.titulo_seo)
      const curDesc = cleanNullableStr(pw?.descripcion_seo)
      const curKw = cleanNullableStr(pw?.keywords)

      const nextTitulo = soloVacios ? (curTitulo ?? smart.titulo_seo) : smart.titulo_seo
      const nextDesc = soloVacios ? (curDesc ?? smart.descripcion_seo) : smart.descripcion_seo
      const baseKw = soloVacios ? (curKw ?? smart.keywords) : smart.keywords
      const nextKw = extraKw ? mergeKeywords(baseKw, extraKw) : baseKw

      if (pw?.id) {
        if (nextTitulo !== curTitulo || nextDesc !== curDesc || nextKw !== curKw) {
          updates.push({
            id: pw.id,
            payload: {
              titulo_seo: nextTitulo,
              descripcion_seo: nextDesc,
              keywords: nextKw,
              updated_at: nowIso,
            },
          })
          if (pw.slug) slugsToRevalidate.push(pw.slug)
        }
      } else {
        const precioPublico = prod.precio_ec && Number(prod.precio_ec) > 0 ? Number(prod.precio_ec) : 1
        const baseText = prod.nombre || prod.descripcion || `producto-${prod.id}`
        const slug = `${slugify(`${baseText}-${prod.sku_base || ''}`) || `producto-${prod.id}`}-${Date.now().toString(36).slice(-4)}`
        slugsToRevalidate.push(slug)
        inserts.push({
          producto_id: prod.id,
          slug,
          precio_publico: precioPublico,
          activo: false,
          en_oferta: false,
          destacado: false,
          nuevo: false,
          titulo_seo: nextTitulo,
          descripcion_seo: nextDesc,
          keywords: nextKw,
          created_at: nowIso,
          updated_at: nowIso,
        })
      }
    }

    // Ejecutar updates en lotes paralelos de 20
    for (let i = 0; i < updates.length; i += 20) {
      const batch = updates.slice(i, i + 20)
      await Promise.all(
        batch.map((u) =>
          (supabase as any).from('productos_web').update(u.payload).eq('id', u.id)
        )
      )
    }

    if (inserts.length > 0) {
      const { error: insErr } = await (supabase as any).from('productos_web').insert(inserts)
      if (insErr) return { success: false, count: updates.length, error: insErr.message }
    }

    revalidateStoreCatalogo({ slugs: slugsToRevalidate.slice(0, 50) })
    return { success: true, count: updates.length + inserts.length }
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Error al generar SEO masivo.' }
  }
}
