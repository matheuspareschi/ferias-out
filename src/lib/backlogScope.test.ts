import { describe, expect, it } from 'vitest'
import { itemsForScope } from './backlogScope'
import type { Item } from './types'

function item(overrides: Partial<Item>): Item {
  return { id: 'x', type: 'task', title: 't', context: 'pessoal', order: 0, done: false, ...overrides }
}

describe('itemsForScope', () => {
  const items: Item[] = [
    item({ id: 'week-match', referenceWeek: '2026-W39' }),
    item({ id: 'week-other', referenceWeek: '2026-W40' }),
    item({ id: 'month-match', referenceMonth: '2026-09' }),
    item({ id: 'month-other', referenceMonth: '2026-10' }),
    item({ id: 'unscoped' }),
    item({ id: 'scheduled', dayId: '2026-09-24', referenceMonth: '2026-09' }),
  ]

  it('semana scope: only the matching week + unscoped items, never scheduled ones', () => {
    const result = itemsForScope(items, 'semana', '2026-W39', '2026-09').map((it) => it.id)
    expect(result.sort()).toEqual(['unscoped', 'week-match'])
  })

  it('mes scope: only the matching month + unscoped items', () => {
    const result = itemsForScope(items, 'mes', '2026-W39', '2026-09').map((it) => it.id)
    expect(result.sort()).toEqual(['month-match', 'unscoped'])
  })

  it('never includes items that already have a dayId, regardless of scope', () => {
    expect(itemsForScope(items, 'mes', '2026-W39', '2026-09').some((it) => it.id === 'scheduled')).toBe(false)
  })
})
