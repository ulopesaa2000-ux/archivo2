// components/store/editor/ColeccionProductoSelector.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { Search, CheckCircle2, Sparkles, Loader2, ImageOff, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  fetchTiposPrendaStore, 
  fetchProductosCandidatosColeccionAction,
  asignarProductoDestacadoColeccionAction,
  ProductoCandidatoColeccion 
} from '@/modules/ecommerce/banners'

interface ColeccionProductoSelectorProps {
  generoId: number // 1: Dama, 2: Caballero
  generoNombre: string // 'Dama' | 'Caballero'
  onSuccess: (detalle: string) => void
}

export function ColeccionProductoSelector({
  generoId,
  generoNombre,
  onSuccess,
}: ColeccionProductoSelectorProps) {
  const [isPending, startTransition] = useTransition()
  const [tiposPrenda, setTiposPrenda] = useState<{ id: number; nombre: string }[]>([])
  const [candidatos, setCandidatos] = useState<ProductoCandidatoColeccion[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [tipoPrendaId, setTipoPrendaId] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProducto, setSelectedProducto] = useState<ProductoCandidatoColeccion | null>(null)
  
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Dialog de confirmación para publicar
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  // Cargar catálogo de tipos de prenda al montar
  useEffect(() => {
    async function loadTipos() {
      const tipos = await fetchTiposPrendaStore()
      setTiposPrenda(tipos)
    }
    loadTipos()
  }, [])

  // Cargar productos candidatos
  const loadCandidatos = () => {
    setLoading(true)
    setErrorMsg(null)
    startTransition(async () => {
      try {
        const tpId = tipoPrendaId !== 'todos' ? Number(tipoPrendaId) : null
        const res = await fetchProductosCandidatosColeccionAction({
          generoId,
          tipoPrendaId: tpId,
          q: searchQuery,
        })
        setCandidatos(res)
      } catch (err: any) {
        setErrorMsg('Error cargando catálogo de productos')
      } finally {
        setLoading(false)
      }
    })
  }

  useEffect(() => {
    loadCandidatos()
  }, [generoId, tipoPrendaId])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadCandidatos()
  }

  // Al presionar "Asignar" — si no está publicado, mostrar diálogo primero
  const handleClickAsignar = () => {
    if (!selectedProducto) return
    if (!selectedProducto.esta_publicado) {
      setShowPublishDialog(true)
    } else {
      doSave(false)
    }
  }

  const doSave = async (publicarProducto: boolean) => {
    if (!selectedProducto) return
    setSaving(true)
    setErrorMsg(null)
    setShowPublishDialog(false)

    try {
      const catLink = generoId === 1 ? '/shop?genero=dama' : '/shop?genero=caballero'
      const res = await asignarProductoDestacadoColeccionAction({
        generoId,
        productoId: selectedProducto.producto_id,
        imagenUrl: selectedProducto.imagen_principal || '',
        tituloBanner: `Colección ${generoNombre}`,
        // link_destino → categoría, no al producto individual
        linkDestino: catLink,
        publicarProducto,
      })

      if (res.success) {
        onSuccess(res.detalle || `Imagen de ${selectedProducto.sku_base} asignada a Colección ${generoNombre}`)
      } else {
        setErrorMsg(res.error || 'Error al guardar producto destacado')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Diálogo de confirmación: ¿publicar producto? */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Producto no publicado
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{selectedProducto?.sku_base} — {selectedProducto?.nombre}</span>
              {' '}aún no está publicado en la tienda web.
              <br /><br />
              ¿Deseas <strong>publicarlo y asignarlo</strong> como imagen de portada de Colección {generoNombre}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPublishDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => doSave(false)}
              className="bg-zinc-700 hover:bg-zinc-800 text-white"
            >
              Solo asignar imagen
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => doSave(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Publicar y asignar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header informativo del género */}
      <div className="p-3.5 bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full text-white ${generoId === 1 ? 'bg-emerald-700' : 'bg-zinc-900'}`}>
            Colección {generoNombre}
          </span>
          <span className="text-xs text-muted-foreground dark:text-gray-300 font-medium">
            La imagen abrirá la categoría al hacer clic
          </span>
        </div>
        <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
      </div>

      {/* Controles de Filtros */}
      <form onSubmit={handleSearchSubmit} className="space-y-3">
        <div>
          <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
            Filtrar por Tipo de Prenda ({generoNombre})
          </Label>
          <Select value={tipoPrendaId} onValueChange={(val) => setTipoPrendaId(val || 'todos')}>
            <SelectTrigger className="mt-1 bg-background dark:bg-zinc-900 text-xs">
              <SelectValue placeholder="Todos los tipos de prenda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos de prenda</SelectItem>
              {tiposPrenda.map((tp) => (
                <SelectItem key={tp.id} value={String(tp.id)}>
                  {tp.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar SKU o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-background dark:bg-zinc-900 text-xs"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="text-xs">
            Buscar
          </Button>
        </div>
      </form>

      {errorMsg && (
        <div className="p-2.5 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-lg text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Rejilla Visual de Productos Candidatos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-gray-400 font-medium">
          <span>Productos con imagen ({candidatos.length})</span>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />}
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Cargando productos con fotografía...</span>
          </div>
        ) : candidatos.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-border rounded-xl p-4 bg-muted/30">
            <ImageOff className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-xs font-medium text-foreground dark:text-gray-300">
              No se encontraron productos con imagen para este filtro.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Prueba cambiando la subcategoría o eliminando el texto de búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {candidatos.map((item) => {
              const isSelected = selectedProducto?.producto_id === item.producto_id

              return (
                <div
                  key={item.producto_id}
                  onClick={() => setSelectedProducto(item)}
                  className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 group bg-card dark:bg-zinc-900 ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-md scale-[1.02]'
                      : 'border-border dark:border-zinc-800 hover:border-amber-400 hover:shadow-sm'
                  }`}
                >
                  {/* Proporción 3:4 */}
                  <div className="relative aspect-[3/4] bg-muted dark:bg-zinc-800 overflow-hidden">
                    {item.imagen_principal ? (
                      <Image
                        src={item.imagen_principal}
                        alt={item.nombre || item.sku_base || 'Fotografía de la prenda'}
                        fill
                        className="object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                        Sin Imagen
                      </div>
                    )}

                    {/* Badge tipo prenda */}
                    {item.tipo_prenda_nombre && (
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs">
                        {item.tipo_prenda_nombre}
                      </div>
                    )}

                    {/* Badge de no publicado */}
                    {!item.esta_publicado && (
                      <div className="absolute bottom-2 left-2 bg-amber-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" /> No publicado
                      </div>
                    )}

                    {/* Badge de selección */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg animate-in zoom-in">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Info del Producto */}
                  <div className="p-2.5">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block truncate">
                      {item.sku_base}
                    </span>
                    <h4 className="text-xs font-semibold text-foreground dark:text-gray-100 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {item.nombre}
                    </h4>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Botón de Aplicar / Guardar Asignación */}
      <div className="pt-3 border-t border-border">
        <Button
          type="button"
          disabled={!selectedProducto || saving}
          onClick={handleClickAsignar}
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Asignando prenda a la portada...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {selectedProducto
                  ? `Asignar ${selectedProducto.sku_base} a Portada ${generoNombre}`
                  : 'Selecciona una prenda para continuar'}
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
