// hooks/use-pan-zoom.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UsePanZoomOptions {
  /** Zoom mínimo. @default 0.5 */
  min?: number
  /** Zoom máximo. @default 3 */
  max?: number
  /** Paso de los botones. @default 0.25 */
  step?: number
  /**
   * 'ctrl': solo Ctrl/Cmd+ruedita hace zoom (la rueda normal scrollea).
   * 'always': cualquier ruedita hace zoom (contenedores sin scroll).
   * @default 'ctrl'
   */
  wheel?: 'ctrl' | 'always'
}

/**
 * Pan + zoom unificado para visores de notas (mouse y táctil).
 * - 1 puntero (mouse o 1 dedo): arrastra para mover.
 * - 2 dedos: pinch para zoom.
 * - Rueda: vía `handleWheel` + `useNativeWheel` (listener no-pasivo).
 * - Aplica `touch-action: none` en el viewport para que el táctil no pelee con el scroll.
 */
export function usePanZoom({ min = 0.5, max = 3, step = 0.25, wheel = 'ctrl' }: UsePanZoomOptions = {}) {
  const [scale, setScale] = useState(1)
  const [rotateDeg, setRotateDeg] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<null | {
    startDist: number
    startScale: number
    startMidX: number
    startMidY: number
    startPanX: number
    startPanY: number
  }>(null)

  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max])

  const zoomIn = useCallback(() => setScale((s) => clamp(s + step)), [clamp, step])
  const zoomOut = useCallback(() => setScale((s) => clamp(s - step)), [clamp, step])
  const rotate = useCallback(() => setRotateDeg((d) => (d + 90) % 360), [])
  const reset = useCallback(() => {
    setScale(1)
    setRotateDeg(0)
    setPan({ x: 0, y: 0 })
  }, [])

  const zoomBy = useCallback((factor: number) => setScale((s) => clamp(s * factor)), [clamp])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      pinch.current = {
        startDist: dist,
        startScale: scale,
        startMidX: (a.x + b.x) / 2,
        startMidY: (a.y + b.y) / 2,
        startPanX: pan.x,
        startPanY: pan.y,
      }
    }
    setDragging(true)
  }, [scale, pan])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, next)
    const p = pinch.current
    if (p && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      setScale(clamp((p.startScale * dist) / p.startDist))
      setPan({ x: p.startPanX + (midX - p.startMidX), y: p.startPanY + (midY - p.startMidY) })
      return
    }
    if (pointers.current.size === 1) {
      setPan((old) => ({ x: old.x + (next.x - prev.x), y: old.y + (next.y - prev.y) }))
    }
  }, [clamp])

  const endPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    pinch.current = null
    // Re-anclar el dedo restante para evitar saltos al pasar de 2 a 1 punteros
    if (pointers.current.size === 1) {
      const remaining = [...pointers.current.keys()][0]
      pointers.current.set(remaining, { x: e.clientX, y: e.clientY })
    } else if (pointers.current.size === 0) {
      setDragging(false)
    }
  }, [])

  const onPointerUp = endPointer
  const onPointerCancel = endPointer

  // Rueda como callback nativo (estable): combinar con useNativeWheel
  const handleWheel = useCallback((e: WheelEvent) => {
    const wantsZoom = wheel === 'always' || e.ctrlKey || e.metaKey
    if (!wantsZoom) return
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      setScale((s) => clamp(s * Math.exp(-e.deltaY * 0.0015)))
    } else {
      setScale((s) => clamp(s + (e.deltaY < 0 ? step / 2.5 : -step / 2.5)))
    }
  }, [wheel, clamp, step])

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotateDeg}deg)`

  return {
    scale,
    rotateDeg,
    pan,
    dragging,
    transform,
    zoomIn,
    zoomOut,
    rotate,
    reset,
    zoomBy,
    handleWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }
}

/**
 * Conecta `handleWheel` con listener nativo no-pasivo (permite preventDefault
 * en Ctrl+ruedita sin warnings). El `ref` lo crea el componente.
 */
export function useNativeWheel(
  ref: React.RefObject<HTMLDivElement | null>,
  onWheel: (e: WheelEvent) => void,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref, onWheel])
}
