// modules/dashboard/utils.ts
import { TIMEZONE } from '@/lib/constants'
import type { DashboardPeriod, DateRangeUTC } from './types'

/**
 * Obtiene el rango de fechas en UTC correspondiente a un período
 * calculado bajo la zona horaria oficial del sistema ('America/Mexico_City').
 */
export function getPeriodDateRange(periodo: DashboardPeriod): DateRangeUTC {
  const now = new Date()

  // Formateador en zona horaria CDMX
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })

  // Obtener fecha actual en componentes locales de CDMX
  const parts = formatter.formatToParts(now)
  const partMap: Record<string, number> = {}
  parts.forEach((p) => {
    if (p.type !== 'literal') {
      partMap[p.type] = parseInt(p.value, 10)
    }
  })

  const year = partMap.year
  const month = partMap.month - 1 // 0-indexed
  const day = partMap.day

  if (periodo === 'semana') {
    // Calcular día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado) en fecha local
    const localDate = new Date(year, month, day)
    const dayOfWeek = localDate.getDay()
    // Distancia al Lunes (si es Domingo 0 -> -6, si es Lunes 1 -> 0, etc.)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(year, month, day + diffToMonday, 0, 0, 0, 0)
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999)

    // Convertir de tiempo CDMX (offset -06:00) a UTC
    const inicioUTC = new Date(monday.getTime() + 6 * 3600 * 1000).toISOString()
    const finUTC = new Date(sunday.getTime() + 6 * 3600 * 1000).toISOString()

    return {
      inicio: inicioUTC,
      fin: finUTC,
      etiqueta: 'Esta semana (Lun - Dom)',
    }
  }

  if (periodo === 'mes') {
    const firstDay = new Date(year, month, 1, 0, 0, 0, 0)
    const nextMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)

    const inicioUTC = new Date(firstDay.getTime() + 6 * 3600 * 1000).toISOString()
    const finUTC = new Date(nextMonth.getTime() + 6 * 3600 * 1000).toISOString()

    return {
      inicio: inicioUTC,
      fin: finUTC,
      etiqueta: 'Este mes',
    }
  }

  return {
    inicio: null,
    fin: null,
    etiqueta: 'Histórico global',
  }
}
