import { describe, expect, it } from 'vitest'
import { monthWeeks, yearWeeks } from './habitGrid'

describe('yearWeeks', () => {
  it('covers every day of the year exactly once', () => {
    const weeks = yearWeeks(2026)
    const days = weeks.flat().filter((d): d is string => d !== null)
    expect(days[0]).toBe('2026-01-01')
    expect(days[days.length - 1]).toBe('2026-12-31')
    expect(new Set(days).size).toBe(days.length)
    expect(days).toHaveLength(365)
  })

  it('every week has 7 slots, starting on Sunday', () => {
    const weeks = yearWeeks(2026)
    for (const week of weeks) {
      expect(week).toHaveLength(7)
    }
    // Jan 1 2026 is a Thursday — the first 4 slots of week 0 are padding (Sun..Wed).
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null])
    expect(weeks[0][4]).toBe('2026-01-01')
  })

  it('pads null for days outside the year on both ends', () => {
    const weeks = yearWeeks(2026)
    const lastWeek = weeks[weeks.length - 1]
    expect(lastWeek.some((d) => d === null || d === '2026-12-31')).toBe(true)
  })
})

describe('monthWeeks', () => {
  it('covers every day of the month exactly once, with calendar padding', () => {
    const weeks = monthWeeks('2026-10')
    const days = weeks.flat().filter((d): d is string => d !== null)
    expect(days).toHaveLength(31)
    expect(days[0]).toBe('2026-10-01')
    expect(days[days.length - 1]).toBe('2026-10-31')
    // Oct 1 2026 is a Thursday — 4 leading nulls in the first week (Sun..Wed).
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null])
    expect(weeks[0][4]).toBe('2026-10-01')
  })

  it('every week has 7 slots', () => {
    for (const week of monthWeeks('2026-02')) {
      expect(week).toHaveLength(7)
    }
  })
})
