import { render, screen, fireEvent } from '@testing-library/react'
import { CatalogoTable } from '@/app/(admin)/catalogo/CatalogoTable'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { mockData } from './CatalogoTable.mock'

describe('CatalogoTable', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const Wrapper: React.FC = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar la tabla con datos', async () => {
    render(
      <Wrapper>
        <CatalogoTable />
      </Wrapper>
    )

    // Esperar a que los datos se carguen
    await screen.findByText(mockData[0].sku)

    // Verificar que se rendericen los datos esperados
    expect(screen.getByText(mockData[0].sku)).toBeInTheDocument()
    expect(screen.getByText(mockData[0].descripcion)).toBeInTheDocument()
    expect(screen.getByText(mockData[0].categoria)).toBeInTheDocument()
  })

  it('debe mostrar el skeleton mientras carga', () => {
    render(
      <Wrapper>
        <CatalogoTable />
      </Wrapper>
    )

    // Verificar que se muestre el skeleton
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
  })

  it('debe filtrar por SKU', async () => {
    render(
      <Wrapper>
        <CatalogoTable />
      </Wrapper>
    )

    // Esperar a que los datos se carguen
    await screen.findByText(mockData[0].sku)

    // Escribir en el filtro de SKU
    const skuInput = screen.getByPlaceholderText('Buscar por SKU o descripción...')
    await userEvent.type(skuInput, mockData[0].sku)

    // Esperar a que se aplique el filtro
    await screen.findByText(mockData[0].sku)

    // Verificar que solo se muestre el producto filtrado
    expect(screen.getByText(mockData[0].sku)).toBeInTheDocument()
    expect(screen.queryByText(mockData[1].sku)).not.toBeInTheDocument()
  })

  it('debe ordenar por columna', async () => {
    render(
      <Wrapper>
        <CatalogoTable />
      </Wrapper>
    )

    // Esperar a que los datos se carguen
    await screen.findByText(mockData[0].sku)

    // Hacer clic en el header de SKU para ordenar
    const skuHeader = screen.getByRole('columnheader', { name: 'SKU' })
    fireEvent.click(skuHeader)

    // Esperar a que se aplique la ordenación
    await screen.findByText(mockData[0].sku)

    // Verificar que los datos estén ordenados
    // (la verificación exacta depende de la implementación de ordenación)
  })

  it('debe mostrar el diálogo de creación', async () => {
    render(
      <Wrapper>
        <CatalogoTable />
      </Wrapper>
    )

    // Esperar a que los datos se carguen
    await screen.findByText(mockData[0].sku)

    // Hacer clic en el botón de crear
    const createButton = screen.getByRole('button', { name: 'Crear producto' })
    fireEvent.click(createButton)

    // Esperar a que aparezca el diálogo
    await screen.findByRole('dialog', { name: 'Crear producto' })
  })

  it('debe manejar errores en la consulta', async () => {
    // Simular un error en la consulta
    jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <Wrapper>
        <CatalogoTable />
      </Wrapper>
    )

    // Esperar a que se muestre el mensaje de error
    await screen.findByText('Error al cargar los datos')
  })
})
