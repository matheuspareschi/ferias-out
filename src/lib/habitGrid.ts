import { addDays, daysInMonthCount, firstDayOfMonth, toDayId, weekdayIndexOf } from './dates'

/**
 * Semanas (domingo–sábado) cobrindo o ano inteiro, estilo grade do GitHub —
 * cada semana é uma coluna de 7 dias; dias fora do ano (preenchendo a
 * primeira/última semana) entram como `null`. Pura.
 */
export function yearWeeks(year: number): (string | null)[][] {
  const jan1 = toDayId(year, 1, 1)
  const dec31 = toDayId(year, 12, 31)
  const start = addDays(jan1, -weekdayIndexOf(jan1))
  const endPad = 6 - weekdayIndexOf(dec31)
  const end = addDays(dec31, endPad)

  const weeks: (string | null)[][] = []
  let cursor = start
  while (cursor <= end) {
    const week: (string | null)[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor.slice(0, 4) === String(year) ? cursor : null)
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }
  return weeks
}

/**
 * Semanas (domingo–sábado) de um mês "YYYY-MM", calendário de verdade
 * (células vazias antes do dia 1 e depois do último dia). Pura.
 */
export function monthWeeks(monthId: string): (string | null)[][] {
  const first = firstDayOfMonth(monthId)
  const count = daysInMonthCount(monthId)
  const start = addDays(first, -weekdayIndexOf(first))

  const weeks: (string | null)[][] = []
  let cursor = start
  let dayNum = 1 - weekdayIndexOf(first)
  while (dayNum <= count) {
    const week: (string | null)[] = []
    for (let i = 0; i < 7; i++) {
      week.push(dayNum >= 1 && dayNum <= count ? cursor : null)
      cursor = addDays(cursor, 1)
      dayNum++
    }
    weeks.push(week)
  }
  return weeks
}
