import { render, screen } from '@testing-library/react';
import { OrdenesTable } from '../OrdenesTable';
import type { OrdenB2BListItem, CatalogosB2B } from '@/modules/ordenes-b2b/types';

// Mock data
const mockItems: OrdenB2BListItem[] = [
  {
    id: 1,
    folio_proveedor: 'FOL001',
    estado: 'pendiente',
    moneda: 'USD',
    tipo_cambio: 20,
    total_cajas: 10,
    total_piezas: 100,
    cbm_orden: 5,
    observaciones: 'Test orden',
    fecha_orden: '2026-04-17',
    contenedor_id: null,
    contenedor_codigo: null,
    proveedor_nombre: 'Proveedor Test',
    cliente_nombre: 'Cliente Test',
  },
  {
    id: 2,
    folio_proveedor: 'FOL002',
    estado: 'publicado',
    moneda: 'MXN',
    tipo_cambio: null,
    total_cajas: 5,
    total_piezas: 50,
    cbm_orden: 2.5,
    observaciones: '',
    fecha_orden: '2026-04-16',
    contenedor_id: 1,
    contenedor_codigo: 'CONT001',
    proveedor_nombre: 'Otro Proveedor',
    cliente_nombre: 'Otro Cliente',
  },
];

const mockCatalogos: CatalogosB2B = {
  proveedores: [{ id: 1, nombre_completo: 'Proveedor Test' }, { id: 2, nombre_completo: 'Otro Proveedor' }],
  clientesB2B: [{ id: 1, nombre_completo: 'Cliente Test' }, { id: 2, nombre_completo: 'Otro Cliente' }],
};

describe('OrdenesTable', () => {
  it('renders table with data', () => {
    render(<OrdenesTable items={mockItems} catalogos={mockCatalogos} />);

    // Check header texts
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Folio Prov.')).toBeInTheDocument();
    expect(screen.getByText('Proveedor')).toBeInTheDocument();
    expect(screen.getByText('Cajas')).toBeInTheDocument();
    expect(screen.getByText('Piezas')).toBeInTheDocument();
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();

    // Check row data
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('FOL001')).toBeInTheDocument();
    expect(screen.getByText('Proveedor Test')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // cajas
    expect(screen.getByText('100')).toBeInTheDocument(); // piezas
    expect(screen.getByText('pendiente')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('FOL002')).toBeInTheDocument();
    expect(screen.getByText('Otro Proveedor')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('publicado')).toBeInTheDocument();

    // Check action buttons (eye, pencil, trash)
    const eyeButtons = screen.getAllByRole('img', { name: /ver detalle/i });
    expect(eyeButtons).toHaveLength(2);

    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    expect(editButtons).toHaveLength(2);

    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it('shows empty message when no data', () => {
    render(<OrdenesTable items={[]} catalogos={mockCatalogos} />);
    expect(screen.getByText('No se encontraron órdenes.')).toBeInTheDocument();
  });
});