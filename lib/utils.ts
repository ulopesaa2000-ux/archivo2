// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { TIMEZONE, LOCALE } from './constants'

// ── Tailwind ────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ═══════════════════════════════════════════════════════════════
// FECHAS — SIEMPRE en America/Mexico_City
// ═══════════════════════════════════════════════════════════════

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

export function formatTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

export function formatDateLong(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTimeLong(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

export function formatTimeAgo(date: string | null | undefined): string {
  if (!date) return '—'
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'hace un momento'
  if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  if (diffDays < 7) return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
  return formatDate(date)
}

export function formatForDateTimeInput(date: string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export function formatForDateInput(date: string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function inputDateTimeToUTC(localDateTime: string): string {
  const fakeUTC = new Date(localDateTime + ':00Z')
  const mxDate = new Date(fakeUTC.toLocaleString('en-US', { timeZone: TIMEZONE }))
  const utcDate = new Date(fakeUTC.toLocaleString('en-US', { timeZone: 'UTC' }))
  const offsetMs = utcDate.getTime() - mxDate.getTime()
  return new Date(fakeUTC.getTime() + offsetMs).toISOString()
}

export function nowUTC(): string {
  return new Date().toISOString()
}

export function todayMX(): string {
  return formatForDateInput(new Date().toISOString())
}

// ═══════════════════════════════════════════════════════════════
// MONEDA
// ═══════════════════════════════════════════════════════════════

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'MXN'
): string {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount)
}

// ═══════════════════════════════════════════════════════════════
// TEXTO
// ═══════════════════════════════════════════════════════════════

export function slugify(text: string): string {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '')
}

export function generateSKU(base: string, talla: string, color: string): string {
  return `${base}-${talla}-${color}`.toUpperCase()
}

export function truncate(text: string | null | undefined, maxLength: number = 50): string {
  if (!text) return '—'
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
