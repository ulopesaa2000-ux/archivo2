export const mockData = [
  {
    id: 1,
    sku: 'PROD-001',
    descripcion: 'Producto de prueba 1',
    categoria: 'Categoría A',
    marca: 'Marca X',
    precio_publico: 100.0,
    precio_oferta: 80.0,
    stock: 50,
    activo: true,
  },
  {
    id: 2,
    sku: 'PROD-002',
    descripcion: 'Producto de prueba 2',
    categoria: 'Categoría B',
    marca: 'Marca Y',
    precio_publico: 200.0,
    precio_oferta: 150.0,
    stock: 30,
    activo: true,
  },
  {
    id: 3,
    sku: 'PROD-003',
    descripcion: 'Producto de prueba 3',
    categoria: 'Categoría A',
    marca: 'Marca X',
    precio_publico: 300.0,
    precio_oferta: 250.0,
    stock: 20,
    activo: false,
  },
]

export const mockErrorResponse = {
  message: 'Error al cargar los datos',
  details: 'Error de conexión con la base de datos',
}

export const mockEmptyResponse = []
