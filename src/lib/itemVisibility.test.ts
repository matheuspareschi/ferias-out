import { describe, expect, it } from 'vitest'
import { isItemVisible, recoverInvalidDates } from './itemVisibility'
import type { Item } from './types'

function item(overrides: Partial<Item>): Item {
  return { id: 'x', type: 'task', title: 't', context: 'pessoal', order: 0, done: false, ...overrides }
}

describe('isItemVisible', () => {
  it('is true for an item on a valid day', () => {
    expect(isItemVisible(item({ dayId: '2026-11-20' }))).toBe(true)
  })

  it('is true for a week-scoped, month-scoped, or fully unscoped ("sem período") item', () => {
    expect(isItemVisible(item({ referenceWeek: '2026-W47' }))).toBe(true)
    expect(isItemVisible(item({ referenceMonth: '2026-11' }))).toBe(true)
    expect(isItemVisible(item({}))).toBe(true)
  })

  it('is false for an item whose dayId is malformed or out of a sane range', () => {
    expect(isItemVisible(item({ dayId: '0002-01-15' }))).toBe(false)
    expect(isItemVisible(item({ dayId: '2026-02-31' }))).toBe(false)
    expect(isItemVisible(item({ dayId: 'not-a-date' }))).toBe(false)
  })
})

describe('recoverInvalidDates', () => {
  it('guarantees every item is visible afterwards, across a mix of valid, invalid and unscoped items', () => {
    const items: Item[] = [
      item({ id: 'a', dayId: '2026-11-20' }),
      item({ id: 'b', dayId: '0002-01-15' }),
      item({ id: 'c', dayId: '2026-02-31' }),
      item({ id: 'd', referenceWeek: '2026-W47' }),
      item({ id: 'e', referenceMonth: '2026-11' }),
      item({ id: 'f' }),
      item({ id: 'g', dayId: '2032-01-01' }),
    ]
    const { items: recovered } = recoverInvalidDates(items)
    expect(recovered.every(isItemVisible)).toBe(true)
  })

  it('clears dayId and period on recovered items, returning them to "sem período"', () => {
    const { items: recovered, recoveredCount } = recoverInvalidDates([
      item({ id: 'bad', dayId: '0002-01-15', period: 'manha' }),
    ])
    expect(recoveredCount).toBe(1)
    expect(recovered[0].dayId).toBeUndefined()
    expect(recovered[0].period).toBeNull()
  })

  it('never touches items that are already visible, and reports recoveredCount 0 when nothing changes', () => {
    const items: Item[] = [item({ id: 'ok', dayId: '2026-11-20' }), item({ id: 'unscoped' })]
    const { items: recovered, recoveredCount } = recoverInvalidDates(items)
    expect(recoveredCount).toBe(0)
    expect(recovered).toBe(items)
  })

  it('is idempotent — running it twice changes nothing further', () => {
    const items: Item[] = [item({ id: 'bad', dayId: 'garbage' })]
    const once = recoverInvalidDates(items).items
    const twice = recoverInvalidDates(once)
    expect(twice.recoveredCount).toBe(0)
    expect(twice.items.every(isItemVisible)).toBe(true)
  })
})
