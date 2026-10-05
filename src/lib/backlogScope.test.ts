import { describe, expect, it } from 'vitest'
import { itemsBeforeScope, itemsForScope, unscopedItems } from './backlogScope'
import type { Item } from './types'

function item(overrides: Partial<Item>): Item {
  return { id: 'x', type: 'task', title: 't', context: 'pessoal', order: 0, done: false, ...overrides }
}

const items: Item[] = [
  item({ id: 'week-match', referenceWeek: '2026-W39' }),
  item({ id: 'week-other', referenceWeek: '2026-W40' }),
  item({ id: 'week-past', referenceWeek: '2026-W35' }),
  item({ id: 'month-match', referenceMonth: '2026-09' }),
  item({ id: 'month-other', referenceMonth: '2026-10' }),
  item({ id: 'month-past', referenceMonth: '2026-07' }),
  item({ id: 'unscoped' }),
  item({ id: 'scheduled', dayId: '2026-09-24', referenceMonth: '2026-09' }),
]

describe('itemsForScope', () => {
  it('semana scope: only the exact matching week — never unscoped, never other weeks', () => {
    const result = itemsForScope(items, 'semana', '2026-W39', '2026-09').map((it) => it.id)
    expect(result).toEqual(['week-match'])
  })

  it('mes scope: only the exact matching month — never unscoped, never other months', () => {
    const result = itemsForScope(items, 'mes', '2026-W39', '2026-09').map((it) => it.id)
    expect(result).toEqual(['month-match'])
  })

  it('never includes items that already have a dayId, regardless of scope', () => {
    expect(itemsForScope(items, 'mes', '2026-W39', '2026-09').some((it) => it.id === 'scheduled')).toBe(false)
  })
})

describe('itemsBeforeScope', () => {
  it('semana scope: only weeks strictly before the active one', () => {
    const result = itemsBeforeScope(items, 'semana', '2026-W39', '2026-09').map((it) => it.id)
    expect(result).toEqual(['week-past'])
  })

  it('mes scope: only months strictly before the active one', () => {
    const result = itemsBeforeScope(items, 'mes', '2026-W39', '2026-09').map((it) => it.id)
    expect(result).toEqual(['month-past'])
  })

  it('never includes unscoped items or items with a dayId', () => {
    const result = itemsBeforeScope(items, 'mes', '2026-W39', '2026-09').map((it) => it.id)
    expect(result).not.toContain('unscoped')
    expect(result).not.toContain('scheduled')
  })
})

describe('unscopedItems', () => {
  it('returns only items with no dayId, no referenceWeek and no referenceMonth', () => {
    expect(unscopedItems(items).map((it) => it.id)).toEqual(['unscoped'])
  })
})
