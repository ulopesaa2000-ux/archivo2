// Mocks para el servidor de MSW
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { mockData, mockErrorResponse, mockEmptyResponse } from './CatalogoTable.mock'

// Crear el servidor de mocks
export const server = setupServer(
  // Mock para GET de catálogo
  rest.get('*/catalogo', (req, res, ctx) => {
    return res(
      ctx.json(mockData),
      ctx.delay(100) // Simular latencia
    )
  }),

  // Mock para GET de catálogo con filtros
  rest.get('*/catalogo?*', (req, res, ctx) => {
    const { sku, categoria, marca } = req.url.searchParams

    let filteredData = mockData

    if (sku) {
      filteredData = filteredData.filter(item =>
        item.sku.toLowerCase().includes(sku.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(sku.toLowerCase())
      )
    }

    if (categoria) {
      filteredData = filteredData.filter(item =>
        item.categoria.toLowerCase().includes(categoria.toLowerCase())
      )
    }

    if (marca) {
      filteredData = filteredData.filter(item =>
        item.marca.toLowerCase().includes(marca.toLowerCase())
      )
    }

    return res(
      ctx.json(filteredData),
      ctx.delay(100)
    )
  }),

  // Mock para POST de catálogo (creación)
  rest.post('*/catalogo', (req, res, ctx) => {
    const newProduct = req.body
    const newId = Math.max(...mockData.map(item => item.id)) + 1

    const createdProduct = {
      ...newProduct,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return res(
      ctx.status(201),
      ctx.json(createdProduct),
      ctx.delay(100)
    )
  }),

  // Mock para PUT de catálogo (actualización)
  rest.put('*/catalogo/:id', (req, res, ctx) => {
    const { id } = req.params
    const updatedProduct = req.body

    const existingIndex = mockData.findIndex(item => item.id === parseInt(id))

    if (existingIndex >= 0) {
      mockData[existingIndex] = {
        ...mockData[existingIndex],
        ...updatedProduct,
        updated_at: new Date().toISOString(),
      }
    }

    return res(
      ctx.json(mockData[existingIndex]),
      ctx.delay(100)
    )
  }),

  // Mock para DELETE de catálogo
  rest.delete('*/catalogo/:id', (req, res, ctx) => {
    const { id } = req.params

    const existingIndex = mockData.findIndex(item => item.id === parseInt(id))

    if (existingIndex >= 0) {
      mockData.splice(existingIndex, 1)
    }

    return res(
      ctx.status(204),
      ctx.delay(100)
    )
  }),

  // Mock para manejar errores
  rest.get('*/catalogo/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json(mockErrorResponse),
      ctx.delay(100)
    )
  }),

  // Mock para catálogo vacío
  rest.get('*/catalogo/empty', (req, res, ctx) => {
    return res(
      ctx.json(mockEmptyResponse),
      ctx.delay(100)
    )
  }),
)
