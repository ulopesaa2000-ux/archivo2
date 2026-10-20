// app/(admin)/inventario/stock/historico/_hooks/use-header-flotante.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Header flotante sincronizado con el scroll horizontal de la tabla.
 *
 * Por qué no sirve `position: sticky` dentro de la tabla:
 * el contenedor de la tabla tiene `overflow-x-auto` (muchas columnas) y eso hace
 * que su `overflow-y` computado sea `hidden`/`auto`, es decir, se convierte en
 * *scrolling ancestor* → el `sticky` del `<thead>` se resuelve contra ese
 * contenedor (no contra la ventana) y el encabezado se va al hacer scroll.
 *
 * Por qué no sirve `overflow-y: clip`:
 * el navegador degrada `clip` a `hidden` cuando el otro eje es `auto`
 * (comprobado en Chrome: `overflow-x: auto` + `overflow-y: clip` → computed
 * `overflow-y: hidden`), así que el problema persiste.
 *
 * Solución: el header se renderiza FUERA del contenedor con overflow (ahí el
 * `sticky` vertical sí se resuelve contra la ventana) y se desplaza en X con
 * `translateX(-scrollLeft)` para seguir al scroll horizontal de la tabla.
 */
export function useHeaderFlotante() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(0)
  const [alto, setAlto] = useState(0)

  const sincronizar = useCallback(() => {
    const scroller = scrollRef.current
    const header = headerRef.current
    if (!scroller || !header) return
    header.style.transform = `translateX(${-scroller.scrollLeft}px)`
  }, [])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const tabla = scroller.querySelector('table')

    const medir = () => {
      const tablaEl = tabla ?? scroller.querySelector('table')
      const anchoTabla = tablaEl?.scrollWidth ?? 0
      setAncho(Math.max(anchoTabla, scroller.clientWidth))
      // Alto del header flotante: se compensa con margen negativo para que no
      // empuje al <thead> real (que queda invisible) y quede un hueco vacío.
      const headerEl = headerRef.current
      if (headerEl) setAlto(headerEl.offsetHeight)
      sincronizar()
    }

    medir()
    const ro = new ResizeObserver(medir)
    if (tabla) ro.observe(tabla)
    ro.observe(scroller)
    window.addEventListener('resize', medir)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [sincronizar])

  return { scrollRef, headerRef, ancho, alto, onScroll: sincronizar }
}
