import { render, screen } from '@testing-library/react';
import { CajasTable } from '../CajasTable';
import type { CajaListItem } from '@/modules/ordenes-b2b/types';

// Mock data
const mockItems: CajaListItem[] = [
  {
    id: 1,
    codigo_caja: 'CAJ001',
    nombre_pack: 'Pack Test',
    producto_id: 101,
    producto_sku: 'SKU001',
    producto_nombre: 'Producto Test',
    proveedor_nombre: 'Proveedor Test',
    piezas_por_caja: 12,
    tallas: 'S,M,L',
    colores: 'Rojo,Azul',
    cbm: 0.5,
    peso_bruto_kg: 10,
    costo_total_caja: 120,
    total_ordenes: 5,
    contenedores: 'CONT001,CONT002',
  },
  {
    id: 2,
    codigo_caja: 'CAJ002',
    nombre_pack: null,
    producto_id: 102,
    producto_sku: 'SKU002',
    producto_nombre: null,
    proveedor_nombre: 'Otro Proveedor',
    piezas_por_caja: 24,
    tallas: null,
    colores: null,
    cbm: 1.0,
    peso_bruto_kg: 20,
    costo_total_caja: 200,
    total_ordenes: 10,
    contenedores: null,
  },
];

describe('CajasTable', () => {
  it('renders table with data', () => {
    render(<CajasTable items={mockItems} />);

    // Check header texts
    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('Producto')).toBeInTheDocument();
    expect(screen.getByText('Proveedor')).toBeInTheDocument();
    expect(screen.getByText('Pz/Caja')).toBeInTheDocument();
    expect(screen.getByText('Tallas')).toBeInTheDocument();
    expect(screen.getByText('Colores')).toBeInTheDocument();
    expect(screen.getByText('CBM')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();

    // Check row data
    expect(screen.getByText('CAJ001')).toBeInTheDocument();
    expect(screen.getByText('SKU001')).toBeInTheDocument();
    expect(screen.getByText('(Producto Test)')).toBeInTheDocument();
    expect(screen.getByText('Proveedor Test')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // piezas
    expect(screen.getByText('S,M,L')).toBeInTheDocument(); // tallas
    expect(screen.getByText('Rojo,Azul')).toBeInTheDocument(); // colores
    expect(screen.getByText('0.5')).toBeInTheDocument(); // cbm

    expect(screen.getByText('CAJ002')).toBeInTheDocument();
    expect(screen.getByText('SKU002')).toBeInTheDocument();
    expect(screen.getByText('(null)')).not.toBeInTheDocument(); // producto_nombre is null, so no parentheses
    // Actually, the condition: {row.producto_nombre && <span>({row.producto_nombre})</span>}
    // So if producto_nombre is null, it won't render anything. So we should not see parentheses.
    expect(screen.getByText('Otro Proveedor')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // tallas null -> '—'
    expect(screen.getByText('—')).toBeInTheDocument(); // colores null -> '—'
    expect(screen.getByText('1.0')).toBeInTheDocument();

    // Check action buttons (eye icon) - each row has one eye button
    const eyeButtons = screen.getAllByRole('img', { name: /ver caja/i });
    expect(eyeButtons).toHaveLength(2);
  });

  it('shows empty message when no data', () => {
    render(<CajasTable items={[]} />);
    expect(screen.getByText('No se encontraron cajas.')).toBeInTheDocument();
  });
});