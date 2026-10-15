// tests/unit/use-pan-zoom.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useRef } from 'react'
import { usePanZoom, useNativeWheel } from '@/hooks/use-pan-zoom'

function Harness({ max = 3, wheel = 'ctrl' as const }) {
  const v = usePanZoom({ max, wheel })
  const ref = useRef<HTMLDivElement | null>(null)
  useNativeWheel(ref, v.handleWheel)
  return (
    <div>
      <span data-testid="scale">{v.scale}</span>
      <span data-testid="rotate">{v.rotateDeg}</span>
      <span data-testid="pan">{`${v.pan.x},${v.pan.y}`}</span>
      <span data-testid="drag">{String(v.dragging)}</span>
      <div
        data-testid="vp"
        ref={ref}
        onPointerDown={v.onPointerDown}
        onPointerMove={v.onPointerMove}
        onPointerUp={v.onPointerUp}
        onPointerCancel={v.onPointerCancel}
      />
      <button data-testid="zin" onClick={v.zoomIn}>zin</button>
      <button data-testid="zout" onClick={v.zoomOut}>zout</button>
      <button data-testid="rot" onClick={v.rotate}>rot</button>
      <button data-testid="reset" onClick={v.reset}>reset</button>
    </div>
  )
}

const ptr = (id: number, x: number, y: number) =>
  ({ pointerId: id, clientX: x, clientY: y }) as unknown as React.PointerEvent

describe('usePanZoom', () => {
  it('zoom por botones con clamp y rotación', () => {
    render(<Harness max={1.5} />)
    const scale = screen.getByTestId('scale')
    expect(scale.textContent).toBe('1')
    fireEvent.click(screen.getByTestId('zin'))
    fireEvent.click(screen.getByTestId('zin'))
    fireEvent.click(screen.getByTestId('zin'))
    expect(scale.textContent).toBe('1.5') // clamp a max
    fireEvent.click(screen.getByTestId('zout'))
    expect(scale.textContent).toBe('1.25')
    fireEvent.click(screen.getByTestId('rot'))
    expect(screen.getByTestId('rotate').textContent).toBe('90')
  })

  it('arrastre con mouse mueve el pan (1 puntero)', () => {
    render(<Harness />)
    const vp = screen.getByTestId('vp')
    fireEvent.pointerDown(vp, ptr(1, 100, 100))
    expect(screen.getByTestId('drag').textContent).toBe('true')
    fireEvent.pointerMove(vp, ptr(1, 130, 120))
    expect(screen.getByTestId('pan').textContent).toBe('30,20')
    fireEvent.pointerUp(vp, ptr(1, 130, 120))
    expect(screen.getByTestId('drag').textContent).toBe('false')
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.getByTestId('pan').textContent).toBe('0,0')
    expect(screen.getByTestId('scale').textContent).toBe('1')
  })

  it('pinch con 2 dedos escala sin saltos', () => {
    render(<Harness />)
    const vp = screen.getByTestId('vp')
    fireEvent.pointerDown(vp, ptr(1, 100, 100))
    fireEvent.pointerDown(vp, ptr(2, 200, 100)) // dist 100
    fireEvent.pointerMove(vp, ptr(2, 250, 100)) // dist 150 -> x1.5
    expect(screen.getByTestId('scale').textContent).toBe('1.5')
    // soltar un dedo no salta el pan
    fireEvent.pointerUp(vp, ptr(2, 250, 100))
    expect(screen.getByTestId('drag').textContent).toBe('true')
    fireEvent.pointerUp(vp, ptr(1, 100, 100))
    expect(screen.getByTestId('drag').textContent).toBe('false')
  })

  it('ruedita con ctrl hace zoom (modo ctrl)', () => {
    render(<Harness wheel="ctrl" />)
    const vp = screen.getByTestId('vp')
    const before = Number(screen.getByTestId('scale').textContent)
    fireEvent.wheel(vp, { deltaY: -100, ctrlKey: true })
    expect(Number(screen.getByTestId('scale').textContent)).toBeGreaterThan(before)
  })
})
