import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  compareDayIds,
  daysInMonthCount,
  firstDayOfMonth,
  lastDayOfMonth,
  monthIdOf,
  todayId,
  weekdayOf,
} from './dates'

describe('weekdayOf', () => {
  it('matches the known weekdays from the original trip itinerary', () => {
    // Valores conferidos manualmente quando a grade de dias era uma lista fixa.
    expect(weekdayOf('2026-09-24')).toBe('qui')
    expect(weekdayOf('2026-09-25')).toBe('sex')
    expect(weekdayOf('2026-09-26')).toBe('sáb')
    expect(weekdayOf('2026-09-27')).toBe('dom')
    expect(weekdayOf('2026-10-12')).toBe('seg')
  })
})

describe('addDays', () => {
  it('adds within the same month', () => {
    expect(addDays('2026-09-24', 1)).toBe('2026-09-25')
  })

  it('crosses a month boundary', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
  })

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('subtracts with a negative delta', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
  })

  it('handles leap-year February correctly', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
  })

  it('is the exact inverse of itself', () => {
    const start = '2026-03-10'
    expect(addDays(addDays(start, 40), -40)).toBe(start)
  })
})

describe('compareDayIds', () => {
  it('orders chronologically via plain string comparison', () => {
    expect(compareDayIds('2026-09-24', '2026-09-25')).toBeLessThan(0)
    expect(compareDayIds('2026-10-01', '2026-09-30')).toBeGreaterThan(0)
    expect(compareDayIds('2026-09-24', '2026-09-24')).toBe(0)
  })
})

describe('monthIdOf / addMonths', () => {
  it('extracts the YYYY-MM prefix', () => {
    expect(monthIdOf('2026-09-24')).toBe('2026-09')
  })

  it('adds months and rolls over the year', () => {
    expect(addMonths('2026-09', 1)).toBe('2026-10')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
})

describe('daysInMonthCount / firstDayOfMonth / lastDayOfMonth', () => {
  it('counts days in regular and leap-year months', () => {
    expect(daysInMonthCount('2026-09')).toBe(30)
    expect(daysInMonthCount('2026-02')).toBe(28)
    expect(daysInMonthCount('2028-02')).toBe(29)
  })

  it('computes the first and last day ids of a month', () => {
    expect(firstDayOfMonth('2026-09')).toBe('2026-09-01')
    expect(lastDayOfMonth('2026-09')).toBe('2026-09-30')
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29')
  })
})

describe('todayId', () => {
  it('always returns a well-formed YYYY-MM-DD string', () => {
    expect(todayId()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('reflects the injected Date regardless of the host system timezone', () => {
    // meio-dia UTC cai sempre no mesmo dia em America/Sao_Paulo (UTC-3)
    const noonUtc = new Date('2026-06-15T12:00:00Z')
    expect(todayId(noonUtc)).toBe('2026-06-15')
  })

  it('converts a UTC instant late in the day back to the previous day in São Paulo', () => {
    // 01:00 UTC = 22:00 do dia anterior em America/Sao_Paulo (UTC-3)
    const earlyUtc = new Date('2026-06-15T01:00:00Z')
    expect(todayId(earlyUtc)).toBe('2026-06-14')
  })
})
