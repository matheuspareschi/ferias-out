/**
 * Aritmética de calendário pura — sempre no fuso America/Sao_Paulo. `dayId` é
 * uma data-calendário "YYYY-MM-DD" (sem hora, sem fuso embutido); toda a
 * aritmética usa `Date.UTC` como truque de implementação pra nunca depender
 * do fuso do dispositivo nem de deslocamentos de horário de verão — o Brasil
 * aboliu o horário de verão em 2019, mas mesmo assim evitamos `new Date(y,m,d)`
 * local, que herdaria o fuso de quem estiver rodando o app.
 */

export const TIMEZONE = 'America/Sao_Paulo'

const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

const todayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data de hoje em America/Sao_Paulo, como "YYYY-MM-DD" — independe do fuso do dispositivo. */
export function todayId(now: Date = new Date()): string {
  return todayFormatter.format(now)
}

export function parseDayId(dayId: string): { y: number; m: number; d: number } {
  const [y, m, d] = dayId.split('-').map(Number)
  return { y, m, d }
}

export function toDayId(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Soma (ou subtrai, com delta negativo) dias civis a um dayId. */
export function addDays(dayId: string, delta: number): string {
  const { y, m, d } = parseDayId(dayId)
  const dt = new Date(Date.UTC(y, m - 1, d) + delta * 86_400_000)
  return toDayId(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/** 0 = domingo ... 6 = sábado. */
export function weekdayIndexOf(dayId: string): number {
  const { y, m, d } = parseDayId(dayId)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function weekdayOf(dayId: string): string {
  return WEEKDAY_SHORT[weekdayIndexOf(dayId)]
}

/** Comparação lexical basta: o formato "YYYY-MM-DD" já ordena corretamente como string. */
export function compareDayIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function monthIdOf(dayId: string): string {
  return dayId.slice(0, 7)
}

export function addMonths(monthId: string, delta: number): string {
  const [y, m] = monthId.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

/** Quantidade de dias no mês "YYYY-MM" (dia 0 do mês seguinte, em UTC). */
export function daysInMonthCount(monthId: string): number {
  const [y, m] = monthId.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function firstDayOfMonth(monthId: string): string {
  return `${monthId}-01`
}

export function lastDayOfMonth(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  return toDayId(y, m, daysInMonthCount(monthId))
}
