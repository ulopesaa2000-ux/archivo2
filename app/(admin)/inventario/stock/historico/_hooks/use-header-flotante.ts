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
    const sl = scroller.scrollLeft
    header.style.transform = `translateX(${-sl}px)`
    // Compensar el translateX negativo en las celdas sticky left-* del header flotante
    const stickyThs = header.querySelectorAll<HTMLElement>('thead th.sticky')
    stickyThs.forEach((th) => {
      th.style.transform = `translateX(${sl}px)`
      th.style.position = 'relative'
    })
  }, [])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const tabla = scroller.querySelector('table')

    const medir = () => {
      const tablaEl = tabla ?? scroller.querySelector('table')
      if (!tablaEl) return
      const anchoTabla = Math.max(tablaEl.scrollWidth, tablaEl.offsetWidth)
      const anchoFinal = Math.max(anchoTabla, scroller.clientWidth)
      setAncho(anchoFinal)

      // Alto del header flotante: se compensa con margen negativo para que no
      // empuje al <thead> real (que queda invisible) y quede un hueco vacío.
      const headerEl = headerRef.current
      if (headerEl) {
        setAlto(headerEl.offsetHeight)

        // Sincronizar el ancho total de la tabla flotante con la tabla de datos
        const headerTabla = headerEl.querySelector('table')
        if (headerTabla && anchoTabla > 0) {
          headerTabla.style.width = `${anchoTabla}px`
          headerTabla.style.minWidth = `${anchoTabla}px`
        }

        // Sincronizar el ancho exacto de cada th (para que cuadre pixel a pixel con el cuerpo)
        const thsReal = tablaEl.querySelectorAll<HTMLTableCellElement>('thead th')
        const thsFlotante = headerEl.querySelectorAll<HTMLTableCellElement>('thead th')
        if (thsReal.length > 0 && thsReal.length === thsFlotante.length) {
          thsReal.forEach((thReal, i) => {
            const w = thReal.getBoundingClientRect().width
            const thF = thsFlotante[i]
            if (thF && w > 0) {
              const wPx = `${w}px`
              thF.style.width = wPx
              thF.style.minWidth = wPx
              thF.style.maxWidth = wPx
              thF.style.boxSizing = 'border-box'
            }
          })
        }
      }
      sincronizar()
    }

    medir()
    const frameId = requestAnimationFrame(medir)
    const ro = new ResizeObserver(medir)
    if (tabla) ro.observe(tabla)
    ro.observe(scroller)
    window.addEventListener('resize', medir)
    return () => {
      cancelAnimationFrame(frameId)
      ro.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [sincronizar])

  return { scrollRef, headerRef, ancho, alto, onScroll: sincronizar }
}
