// lib/utils/pdfCatalogQueue.ts
'use client'

// Cola de generación de catálogos PDF en segundo plano (vive en la pestaña del
// navegador: sobrevive al cierre del modal, pero NO a recargar/cerrar la página,
// ya que por regla del proyecto no se puede crear infraestructura de jobs en la BD).
// Los trabajos se procesan de uno en uno; cada uno notifica su avance y resultado
// con toasts persistentes (sonner) para que la solicitud nunca se pierda de vista.

import { toast } from 'sonner'
import {
  generarCatalogoPdf,
  type OpcionesGeneracionPdf,
  type ResultadoCatalogoPdf,
} from './pdfCatalogGenerator'
import type { ProductoPdfCatalog } from '@/modules/ecommerce/pdf-catalog-actions'

/** A partir de este número de productos la descarga directa se encola en segundo plano. */
export const UMBRAL_COLA_PDF = 60

export type EstadoJobPdf = 'en-cola' | 'procesando' | 'completado' | 'fallido' | 'cancelado'

export interface PdfJob {
  id: string
  titulo: string
  total: number
  layout: string
  estado: EstadoJobPdf
  progreso: number
  texto: string
  resultado?: ResultadoCatalogoPdf
  error?: string
  creadoEn: number
}

interface JobInterno extends PdfJob {
  cancelado: boolean
  productos: ProductoPdfCatalog[]
  opciones: OpcionesGeneracionPdf
}

let contadorJobs = 0
let workerActivo = false
let alertaSalidaRegistrada = false
const jobsInternos: JobInterno[] = []
const listeners = new Set<() => void>()
let snapshot: PdfJob[] = []

function publico(j: JobInterno): PdfJob {
  return {
    id: j.id,
    titulo: j.titulo,
    total: j.total,
    layout: j.layout,
    estado: j.estado,
    progreso: j.progreso,
    texto: j.texto,
    resultado: j.resultado,
    error: j.error,
    creadoEn: j.creadoEn,
  }
}

function emitir() {
  snapshot = jobsInternos.map(publico)
  for (const l of listeners) l()
}

function hayActivos(): boolean {
  return jobsInternos.some((j) => j.estado === 'en-cola' || j.estado === 'procesando')
}

function asegurarAlertaSalida() {
  if (alertaSalidaRegistrada || typeof window === 'undefined') return
  alertaSalidaRegistrada = true
  window.addEventListener('beforeunload', (e) => {
    if (hayActivos()) {
      e.preventDefault()
    }
  })
}

export function suscribirseColaPdf(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function obtenerJobsPdf(): PdfJob[] {
  return snapshot
}

/**
 * Encola un catálogo para generarse en segundo plano. Devuelve el id del trabajo.
 * Puedes cerrar el modal y seguir navegando: el toast persistente avisa al terminar.
 */
export function encolarCatalogoPdf(
  productos: ProductoPdfCatalog[],
  opciones: Omit<OpcionesGeneracionPdf, 'onProgress' | 'shouldCancel'>
): string {
  contadorJobs += 1
  const job: JobInterno = {
    id: `pdf-${Date.now()}-${contadorJobs}`,
    titulo: opciones.tituloCatalogo,
    total: productos.length,
    layout: opciones.layout,
    estado: 'en-cola',
    progreso: 0,
    texto: `En cola (${productos.length} productos)…`,
    creadoEn: Date.now(),
    cancelado: false,
    productos,
    opciones: { ...opciones },
  }
  jobsInternos.push(job)
  asegurarAlertaSalida()
  toast.loading(`Catálogo en cola: ${job.titulo} (${job.total} productos)`, {
    id: job.id,
    duration: Infinity,
    description: 'Se generará en segundo plano. Puedes seguir trabajando.',
  })
  emitir()
  arrancarWorker()
  return job.id
}

export function cancelarJobPdf(id: string): void {
  const job = jobsInternos.find((j) => j.id === id)
  if (!job) return
  if (job.estado === 'completado' || job.estado === 'fallido' || job.estado === 'cancelado') return
  job.cancelado = true
  job.texto = 'Cancelando…'
  emitir()
}

export function limpiarJobsPdfTerminados(): void {
  for (let i = jobsInternos.length - 1; i >= 0; i--) {
    const e = jobsInternos[i].estado
    if (e === 'completado' || e === 'fallido' || e === 'cancelado') {
      jobsInternos.splice(i, 1)
    }
  }
  emitir()
}

async function arrancarWorker() {
  if (workerActivo) return
  workerActivo = true
  try {
    for (;;) {
      const job = jobsInternos.find((j) => j.estado === 'en-cola')
      if (!job) break
      await procesarJob(job)
    }
  } finally {
    workerActivo = false
  }
}

async function procesarJob(job: JobInterno) {
  job.estado = 'procesando'
  job.progreso = 0
  job.texto = 'Iniciando…'
  emitir()

  try {
    const resultado = await generarCatalogoPdf(job.productos, {
      ...job.opciones,
      shouldCancel: () => job.cancelado,
      onProgress: (progreso, texto) => {
        job.progreso = progreso
        job.texto = texto
        toast.loading(`${job.titulo} — ${progreso}%`, {
          id: job.id,
          duration: Infinity,
          description: texto,
        })
        emitir()
      },
    })

    job.estado = 'completado'
    job.progreso = 100
    job.resultado = resultado
    job.texto = `Completado: ${resultado.paginas} páginas`
    if (resultado.sinFoto > 0) {
      toast.warning(`Catálogo listo con ${resultado.sinFoto} fotos faltantes`, {
        id: job.id,
        duration: 12000,
        description: `${job.titulo}: ${resultado.conFoto}/${resultado.total} fotos · ${resultado.paginas} páginas. El PDF ya se descargó.`,
      })
    } else {
      toast.success('Catálogo PDF listo', {
        id: job.id,
        duration: 10000,
        description: `${job.titulo}: ${resultado.total} productos · ${resultado.paginas} páginas. El PDF ya se descargó.`,
      })
    }
  } catch (err: any) {
    if (err?.message === 'CANCELADO_POR_USUARIO' || job.cancelado) {
      job.estado = 'cancelado'
      job.texto = 'Cancelado por el usuario'
      toast.info('Generación de catálogo cancelada', { id: job.id, duration: 6000 })
    } else {
      job.estado = 'fallido'
      job.error = err?.message || 'Error desconocido al generar el PDF.'
      job.texto = `Falló: ${job.error}`
      toast.error('No se pudo generar el catálogo', {
        id: job.id,
        duration: 12000,
        description: job.error,
      })
    }
  } finally {
    emitir()
  }
}
