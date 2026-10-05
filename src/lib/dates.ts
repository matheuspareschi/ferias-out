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

/** Segunda=1 ... domingo=7 (ISO 8601), diferente de `weekdayIndexOf` (que é 0=domingo). */
function isoWeekdayOf(dayId: string): number {
  return ((weekdayIndexOf(dayId) + 6) % 7) + 1
}

/**
 * Semana ISO 8601 do dia, como "YYYY-Www" — semana começa na segunda, e a
 * semana 1 do ano é a que contém a primeira quinta-feira (equivalente a
 * conter o dia 4 de janeiro). O "YYYY" aqui é o ano ISO, que pode diferir
 * do ano civil do dia perto da virada do ano.
 */
export function isoWeekOf(dayId: string): string {
  const { y, m, d } = parseDayId(dayId)
  const thursday = new Date(Date.UTC(y, m - 1, d) + (4 - isoWeekdayOf(dayId)) * 86_400_000)
  const isoYear = thursday.getUTCFullYear()
  const jan1 = Date.UTC(isoYear, 0, 1)
  const weekNum = Math.ceil((Math.round((thursday.getTime() - jan1) / 86_400_000) + 1) / 7)
  return `${isoYear}-W${String(weekNum).padStart(2, '0')}`
}

/** Segunda-feira (dayId) da semana ISO "YYYY-Www". */
export function isoWeekStart(weekId: string): string {
  const [yearStr, weekStr] = weekId.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  const jan4 = toDayId(year, 1, 4)
  const week1Monday = addDays(jan4, 1 - isoWeekdayOf(jan4))
  return addDays(week1Monday, (week - 1) * 7)
}

/** Domingo (dayId) da semana ISO "YYYY-Www" — inclusivo, 6 dias depois da segunda. */
export function isoWeekEnd(weekId: string): string {
  return addDays(isoWeekStart(weekId), 6)
}

/** Soma (ou subtrai) semanas inteiras a uma semana ISO. */
export function addIsoWeeks(weekId: string, delta: number): string {
  return isoWeekOf(addDays(isoWeekStart(weekId), delta * 7))
}

/**
 * Valida um "YYYY-MM-DD" vindo de um `<input type="date">` antes de gravar
 * (1.4): formato completo, data de calendário real (rejeita "2026-02-31") e
 * ano dentro de uma faixa razoável (atual − 1 a atual + 5) — sem isso, um
 * valor parcial digitado letra a letra (ex. ano "0002") nunca deveria ter
 * chegado a mover um item pra lá. Retorna o próprio dayId se válido, `null`
 * senão. Pura.
 */
export function validateDateInput(value: string, today: string = todayId()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const { y, m, d } = parseDayId(value)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  const currentYear = Number(today.slice(0, 4))
  if (y < currentYear - 1 || y > currentYear + 5) return null
  return value
}
