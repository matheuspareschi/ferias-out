import { addDays, compareDayIds, todayId, weekdayOf } from './dates'
import type { Day } from './types'

export { todayId } from './dates'

export const WEEKDAY_LONG: Record<string, string> = {
  dom: 'domingo',
  seg: 'segunda',
  ter: 'terça',
  qua: 'quarta',
  qui: 'quinta',
  sex: 'sexta',
  sáb: 'sábado',
}

/**
 * Rótulos especiais de dias específicos — datados da viagem original
 * (24/09–12/10/2026). Fora dessas datas, `dayLabel` simplesmente não acha
 * nada, o que já é o comportamento certo pra um calendário sem fim.
 */
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

export function dayOf(dayId: string): Day {
  return { id: dayId, weekday: weekdayOf(dayId) }
}

export function formatDayShort(dayId: string): string {
  const [, month, day] = dayId.split('-')
  return `${day}/${month}`
}

export function isPastDay(dayId: string, referenceId: string = todayId()): boolean {
  return compareDayIds(dayId, referenceId) < 0
}

export function isToday(dayId: string, referenceId: string = todayId()): boolean {
  return dayId === referenceId
}

export function isFutureDay(dayId: string, referenceId: string = todayId()): boolean {
  return compareDayIds(dayId, referenceId) > 0
}

/** Ancora inicial: sempre hoje — o calendário não tem início nem fim fixos. */
export function defaultAnchorDayId(): string {
  return todayId()
}

/**
 * Janela de dias ao redor de um centro, inclusive — usada tanto pelo
 * PlannerBoard (3 dias) quanto pela DayTrail (uma faixa maior). Sempre
 * retorna `before + 1 + after` dias; não há mais limite de início/fim.
 */
export function daysAround(centerId: string, before: number, after: number): Day[] {
  const days: Day[] = []
  for (let i = -before; i <= after; i++) {
    days.push(dayOf(addDays(centerId, i)))
  }
  return days
}
