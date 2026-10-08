// components/store/favoritos/FavoritosList.tsx
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Trash2, LogIn } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { fetchProductosFavoritos } from '@/modules/ecommerce/queries'
import type { ProductoWebPublico } from '@/modules/ecommerce/types'

interface FavoritosListProps {
  isLogged: boolean
  userName?: string | null
}

export function FavoritosList({ isLogged, userName }: FavoritosListProps) {
  const { ids, isHydrated, removeFavorite, clearFavorites } = useFavorites()
  const { addItem } = useQuoteCart()
  const [productos, setProductos] = useState<ProductoWebPublico[]>([])
  const [loadedKey, setLoadedKey] = useState('')
  const idsKey = ids.join(',')
  const isLoading = isHydrated && ids.length > 0 && loadedKey !== idsKey

  useEffect(() => {
    if (!isHydrated || ids.length === 0 || loadedKey === idsKey) return
    const key = idsKey
    let cancelled = false
    fetchProductosFavoritos(ids)
      .then((data) => {
        if (cancelled) return
        setProductos(data)
        setLoadedKey(key)
      })
      .catch(() => {
        if (cancelled) return
        setProductos([])
        setLoadedKey(key)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey resume la lista; evita refetch por identidad de arreglo
  }, [idsKey, isHydrated, loadedKey])

  const handleAddToQuote = (producto: ProductoWebPublico) => {
    addItem({
      productoId: producto.producto_id,
      varianteId: producto.id,
      nombre: producto.nombre,
      marca: producto.marca || '',
      sku: producto.sku_base,
      slug: producto.slug,
      talla: '',
      color: '',
      cantidad: 1,
      precioUnitario: producto.precio_publico ?? undefined,
      piezasPorCaja: undefined,
      imagen: producto.imagen_principal || undefined,
    })
    window.dispatchEvent(new Event('inv_open_cart_drawer'))
  }

  if (!isHydrated || isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  const visibles = ids.length === 0 ? [] : productos.filter((p) => ids.includes(p.id))

  if (ids.length === 0) {
    return (
      <div className="text-center py-16 px-6 border border-dashed border-border rounded-2xl">
        <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h2 className="font-serif text-xl font-bold text-foreground mb-2">Aún no tienes favoritos</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Pulsa el corazón ❤️ en cualquier producto y aparecerá aquí, incluso sin iniciar sesión.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 px-6 rounded-xl text-sm font-semibold transition-colors"
        >
          Explorar catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isLogged ? (
            <>Hola <strong className="text-foreground">{userName ?? 'usuario'}</strong>, tienes <strong className="text-foreground">{ids.length}</strong> favorito(s), guardados en tu cuenta y en este navegador.</>
          ) : (
            <>Tienes <strong className="text-foreground">{ids.length}</strong> favorito(s) guardados <strong className="text-foreground">en este navegador</strong>. <Link href="/login" className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1"><LogIn className="h-3.5 w-3.5" /> Inicia sesión</Link> para guardarlos permanentes en tu cuenta.</>
          )}
        </p>
        <button
          type="button"
          onClick={clearFavorites}
          className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline shrink-0"
        >
          Vaciar lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibles.map((producto) => (
          <div key={producto.id} className="flex gap-4 rounded-xl border border-border bg-card p-4 hover:border-emerald-500/30 transition-colors">
            <Link href={`/shop/${producto.slug}`} className="relative w-20 h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
              {producto.imagen_principal ? (
                <Image src={producto.imagen_principal} alt={producto.nombre} fill className="object-cover" sizes="80px" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">Sin imagen</span>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/shop/${producto.slug}`} className="font-semibold text-sm text-foreground hover:text-emerald-700 line-clamp-2">
                {producto.nombre}
              </Link>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{producto.sku_base}</p>
              {producto.precio_publico ? (
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  ${producto.precio_publico.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              ) : null}
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => handleAddToQuote(producto)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Cotizar
                </button>
                <button
                  type="button"
                  onClick={() => removeFavorite(producto.id)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-600 hover:border-red-300 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visibles.length < ids.length && (
        <p className="text-[11px] text-muted-foreground text-center">
          {ids.length - visibles.length} favorito(s) ya no están publicados y no se muestran.
        </p>
      )}
    </div>
  )
}
