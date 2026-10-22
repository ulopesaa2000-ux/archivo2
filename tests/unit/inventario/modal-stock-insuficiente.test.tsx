// tests/unit/inventario/modal-stock-insuficiente.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModalStockInsuficiente } from '@/components/admin/inventario/ModalStockInsuficiente'
import type { FaltanteStock } from '@/modules/inventario/types'

const faltantes: FaltanteStock[] = [
  {
    producto_id: 7601,
    producto_sku: 'QQ27/03MW',
    producto_nombre: 'ROMPEVIENTOS LICRA TRANSPIRABLE PARA DAMA',
    caja_id: null,
    caja_codigo: null,
    renglones: 2,
    solicitado_cajas: 7,
    solicitado_piezas: 0,
    disponible_cajas: 6,
    disponible_piezas: 0,
    faltan_cajas: 1,
    faltan_piezas: 0,
  },
]

describe('ModalStockInsuficiente', () => {
  it('muestra el SKU, el total agregado, el disponible y el faltante', () => {
    render(
      <ModalStockInsuficiente
        open
        onOpenChange={() => {}}
        faltantes={faltantes}
        bodegaOrigenNombre="COCINA"
        modo="confirmar"
      />
    )

    expect(screen.getByText(/Stock insuficiente en 1 producto/i)).toBeTruthy()
    expect(screen.getByText('QQ27/03MW')).toBeTruthy()
    expect(screen.getByText('COCINA')).toBeTruthy()

    // 7 solicitado · 6 disponible · 1 falta
    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText('6')).toBeTruthy()
    expect(screen.getByText('−1')).toBeTruthy()

    // Avisa que el SKU está repartido en varios renglones
    expect(screen.getByText('Renglones')).toBeTruthy()
    expect(screen.getByText(/suman todas sus filas/i)).toBeTruthy()
  })

  it('ofrece ajustar al disponible y avisa al padre', () => {
    const onAjustar = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <ModalStockInsuficiente
        open
        onOpenChange={onOpenChange}
        faltantes={faltantes}
        bodegaOrigenNombre="COCINA"
        modo="confirmar"
        onAjustar={onAjustar}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Ajustar a disponible/i }))
    expect(onAjustar).toHaveBeenCalledTimes(1)
  })

  it('en modo borrador permite guardar igual', () => {
    const onGuardarBorrador = vi.fn()

    render(
      <ModalStockInsuficiente
        open
        onOpenChange={() => {}}
        faltantes={faltantes}
        modo="borrador"
        onGuardarBorrador={onGuardarBorrador}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador igual/i }))
    expect(onGuardarBorrador).toHaveBeenCalledTimes(1)
  })

  it('no renderiza nada sin faltantes', () => {
    const { container } = render(
      <ModalStockInsuficiente open onOpenChange={() => {}} faltantes={[]} />
    )
    expect(container.innerHTML).toBe('')
  })
})
