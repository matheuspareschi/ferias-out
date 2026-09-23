import type { Day } from './types'

export const DAYS: Day[] = [
  { id: '2026-09-24', weekday: 'qui' },
  { id: '2026-09-25', weekday: 'sex' },
  { id: '2026-09-26', weekday: 'sáb' },
  { id: '2026-09-27', weekday: 'dom' },
  { id: '2026-09-28', weekday: 'seg' },
  { id: '2026-09-29', weekday: 'ter' },
  { id: '2026-09-30', weekday: 'qua' },
  { id: '2026-10-01', weekday: 'qui' },
  { id: '2026-10-02', weekday: 'sex' },
  { id: '2026-10-03', weekday: 'sáb' },
  { id: '2026-10-04', weekday: 'dom' },
  { id: '2026-10-05', weekday: 'seg' },
  { id: '2026-10-06', weekday: 'ter' },
  { id: '2026-10-07', weekday: 'qua' },
  { id: '2026-10-08', weekday: 'qui' },
  { id: '2026-10-09', weekday: 'sex' },
  { id: '2026-10-10', weekday: 'sáb' },
  { id: '2026-10-11', weekday: 'dom' },
  { id: '2026-10-12', weekday: 'seg' },
]

export const DAY_IDS = DAYS.map((d) => d.id)

export const WEEKDAY_LONG: Record<string, string> = {
  dom: 'domingo',
  seg: 'segunda',
  ter: 'terça',
  qua: 'quarta',
  qui: 'quinta',
  sex: 'sexta',
  sáb: 'sábado',
}

const DAY_LABELS: Record<string, string> = {
  '2026-09-28': 'Bauru Day',
  '2026-10-03': 'dia-buffer',
  '2026-10-06': 'Retiro',
  '2026-10-07': 'Retiro',
  '2026-10-09': 'viagem a Paraty',
  '2026-10-10': 'Paraty',
  '2026-10-11': 'Paraty',
  '2026-10-12': 'volta',
}

export function dayLabel(dayId: string): string | undefined {
  return DAY_LABELS[dayId]
}

export function dayByIndex(index: number): Day | undefined {
  return DAYS[index]
}

export function dayIndex(dayId: string): number {
  return DAY_IDS.indexOf(dayId)
}

export function formatDayShort(dayId: string): string {
  const [, month, day] = dayId.split('-')
  return `${day}/${month}`
}

/** Data local de hoje no formato "YYYY-MM-DD", sem conversão de fuso. */
export function todayId(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isPastDay(dayId: string, referenceId: string = todayId()): boolean {
  return dayId < referenceId
}

/** Ancora inicial: hoje, se estiver dentro da viagem; senão o dia mais próximo. */
export function defaultAnchorDayId(): string {
  const t = todayId()
  if (DAY_IDS.includes(t)) return t
  if (t < DAY_IDS[0]) return DAY_IDS[0]
  return DAY_IDS[DAY_IDS.length - 1]
}
