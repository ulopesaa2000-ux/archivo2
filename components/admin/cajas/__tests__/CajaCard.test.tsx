import { memo } from 'react';
import { beforeEach, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/modules/catalogo/actions', () => ({
  createColorAction: vi.fn(async () => ({ success: true, id: 999 })),
  createTallaAction: vi.fn(async () => ({ success: true, id: 999 })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

import { CajaCard, buildEditState, standardizeColorName, standardizeTallaName } from '../CajaCard';
import type { SharedCajaData } from '@/modules/cajas/types';

const cajaBase: SharedCajaData = {
  id: 1,
  codigo_caja: 'AND260030-PACKUNICO-0001',
  nombre_pack: 'PACK UNICO',
  producto_sku: 'AND260030',
  piezas_por_caja: 36,
  cbm: 0.0792,
  peso_bruto_kg: 16,
  peso_neto: 15,
  largo_cm: 50,
  ancho_cm: 48,
  alto_cm: 33,
  costo_total_caja: 100,
  tallas: 'CH|M|G|EG',
  colores: 'BLACK|PURPURA',
  cantidad_cajas: 67,
  contenidoMap: {
    tallas: ['CH', 'M', 'G', 'EG'],
    colores: ['BLACK', 'PURPURA'],
    matriz: {
      BLACK: { CH: 4, M: 4, G: 4, EG: 4 },
      PURPURA: { CH: 1, M: 1, G: 1, EG: 1 },
    },
    totalPiezas: 20,
  },
};

describe('CajaCard (modo visual)', () => {
  it('renderiza KPIs sin entrar a edicion', () => {
    render(<CajaCard caja={cajaBase} canEdit={false} canDelete={false} />);
    expect(screen.getByText(/AND260030-PACKUNICO-0001/)).toBeInTheDocument();
    expect(screen.getByText('PACK UNICO')).toBeInTheDocument();
    expect(screen.getByText('Cantidad cajas')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Código caja')).not.toBeInTheDocument();
  });

  it('esta memoizado (no re-renderiza con props iguales)', () => {
    // memo expone $$typeof Symbol(react.memo)
    expect((CajaCard as unknown as { $$typeof: symbol }).$$typeof).toBe(memo(() => null).$$typeof);
  });
});

describe('CajaCard (modo edicion)', () => {
  it('reconstruye el estado al entrar a editar', () => {
    render(<CajaCard caja={cajaBase} />);
    fireEvent.click(screen.getByTitle('Editar configuración'));
    expect(screen.getByPlaceholderText('Código caja')).toHaveValue('AND260030-PACKUNICO-0001');
    expect(screen.getByPlaceholderText('Nombre pack')).toHaveValue('PACK UNICO');
  });

  it('descartar sale del modo edicion', () => {
    render(<CajaCard caja={cajaBase} />);
    fireEvent.click(screen.getByTitle('Editar configuración'));
    expect(screen.getByPlaceholderText('Código caja')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Descartar cambios'));
    expect(screen.queryByPlaceholderText('Código caja')).not.toBeInTheDocument();
  });
});

describe('buildEditState (puro)', () => {
  it('deriva tallas/filas con ids temporales negativos', () => {
    const s = buildEditState(cajaBase, [], []);
    expect(s.editTallas.map((t) => t.nombre)).toEqual(['CH', 'M', 'G', 'EG']);
    expect(s.editFilas.map((f) => f.colorNombre)).toEqual(['NEGRO', 'MORADO']);
    for (const f of s.editFilas) {
      expect(f.colorId).toBeLessThan(0);
    }
    for (const t of s.editTallas) {
      expect(t.id).toBeLessThan(0);
    }
    // Sin colisiones con ids reales positivos
    expect(s.editData.codigo_caja).toBe('AND260030-PACKUNICO-0001');
  });

  it('respeta ids reales del catalogo cuando matchean', () => {
    const s = buildEditState(cajaBase, [], [{ id: 5, nombre: 'NEGRO', codigo: 'NEG' }]);
    expect(s.editFilas[0].colorId).toBe(5);
    expect(s.editFilas[1].colorId).toBeLessThan(0);
  });

  it('caja sin contenido da estado vacio', () => {
    const s = buildEditState({ ...cajaBase, contenidoMap: null, tallas: null, colores: null }, [], []);
    expect(s.editTallas).toEqual([]);
    expect(s.editFilas).toEqual([]);
  });
});

describe('wrappers de compatibilidad (fuente unica lib/)', () => {
  it('standardizeColorName conserva salidas historicas', () => {
    expect(standardizeColorName('BLACK', []).nombreEsp).toBe('NEGRO');
    expect(standardizeColorName('CHOCOLATE', []).nombreEsp).toBe('CHOCOLATE');
    expect(standardizeColorName('黑色', []).nombreEsp).toBe('NEGRO');
    expect(standardizeColorName('PURPURA', []).nombreEsp).toBe('MORADO');
    expect(standardizeColorName('', []).nombreEsp).toBe('SIN COLOR');
    expect(standardizeColorName('BLACK', [{ id: 1, nombre: 'NEGRO', codigo: 'NEG' }]).isNewColor).toBe(false);
    expect(standardizeColorName('PATROL', [{ id: 1, nombre: 'NEGRO', codigo: 'NEG' }]).isNewColor).toBe(true);
  });

  it('standardizeTallaName conserva salidas historicas', () => {
    expect(standardizeTallaName('S')).toBe('CH');
    expect(standardizeTallaName('L')).toBe('G');
    expect(standardizeTallaName('XL')).toBe('EG');
    expect(standardizeTallaName('S/M')).toBe('CH-M');
    expect(standardizeTallaName('CH')).toBe('CH');
    expect(standardizeTallaName('')).toBe('');
  });
});
