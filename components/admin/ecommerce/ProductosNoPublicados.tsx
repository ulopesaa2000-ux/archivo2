// components/admin/ecommerce/ProductosNoPublicados.tsx
'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { publicarProductoWeb } from '@/modules/ecommerce/actions'
import { Search, Package, Globe, ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductoNoPublicado {
  id: number
  sku_base: string
  nombre: string
  marca: string | null
  imagen_principal: string | null
}

interface ProductosNoPublicadosProps {
  productos: ProductoNoPublicado[]
}

const ITEMS_PER_PAGE = 15

export function ProductosNoPublicados({ productos }: ProductosNoPublicadosProps) {
  const router = useRouter()
  const [publicando, setPublicando] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const productosFiltrados = useMemo(() => {
    if (!productos) return []
    if (!busqueda.trim()) return productos
    const termino = busqueda.toLowerCase()
    return productos.filter(p => 
      (p.nombre?.toLowerCase() || '').includes(termino) ||
      (p.sku_base?.toLowerCase() || '').includes(termino) ||
      (p.marca?.toLowerCase() || '').includes(termino)
    )
  }, [productos, busqueda])

  // Paginación
  const totalPages = Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return productosFiltrados.slice(start, start + ITEMS_PER_PAGE)
  }, [productosFiltrados, currentPage])

  // Reset a página 1 cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [busqueda])

  async function handlePublicar(productoId: number) {
    setPublicando(productoId)
    try {
      await publicarProductoWeb({
        producto_id: productoId,
        activo: true,
        precio_publico: 0,
        orden_display: 0,
        slug: ''
      })
      router.refresh()
    } catch (error) {
      console.error('Error publicando:', error)
    } finally {
      setPublicando(null)
    }
  }

  if (productos.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Productos disponibles para publicar</CardTitle>
          </div>
          <Badge variant="secondary">{productos.length} productos</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, SKU o marca..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabla de productos */}
        {paginatedProducts.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Imagen</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell>
                      {producto.imagen_principal ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden">
                          <Image
                            src={producto.imagen_principal}
                            alt={producto.nombre ?? `Imagen de ${producto.sku_base}`}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{producto.nombre}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {producto.sku_base} {producto.marca && `• ${producto.marca}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handlePublicar(producto.id)}
                        disabled={publicando === producto.id}
                      >
                        {publicando === producto.id ? 'Publicando...' : 'Publicar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No se encontraron productos con los filtros aplicados.</p>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, productosFiltrados.length)} de {productosFiltrados.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number
                if (totalPages <= 5) {
                  page = i + 1
                } else if (currentPage <= 3) {
                  page = i + 1
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i
                } else {
                  page = currentPage - 2 + i
                }

                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              })}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
