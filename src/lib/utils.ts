import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWeekBounds(date: Date = new Date()): { start: Date; end: Date } {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 })     // Sunday
  return { start, end }
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function formatDate(date: Date | string, fmt = 'PPP'): string {
  return format(new Date(date), fmt)
}

export function formatDateISO(date: Date | string): string {
  return format(new Date(date), 'yyyy-MM-dd')
}

export function minutesToHM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function clampToRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case 'output':      return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    case 'sales':       return 'text-green-400 bg-green-400/10 border-green-400/20'
    case 'improvement': return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
    default:            return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':   return 'text-red-400 bg-red-400/10'
    case 'medium': return 'text-yellow-400 bg-yellow-400/10'
    case 'low':    return 'text-zinc-400 bg-zinc-400/10'
    default:       return 'text-zinc-400 bg-zinc-400/10'
  }
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-400'
  if (score >= 70) return 'text-yellow-400'
  if (score >= 50) return 'text-orange-400'
  return 'text-red-400'
}

export function safeJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
