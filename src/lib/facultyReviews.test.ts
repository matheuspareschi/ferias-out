import { describe, expect, it } from 'vitest'
import { syncUnitReviews, unitSigla } from './facultyReviews'
import type { Discipline, Item, Unit } from './types'

const disciplines: Discipline[] = [{ id: 'hc', sigla: 'HC', name: 'História da Igreja' }]
const units: Unit[] = [{ id: 'unit-1', disciplineId: 'hc', number: 3, size: 'M', pages: 10 }]

function aulaItem(done: boolean): Item {
  return {
    id: 'aula-1',
    type: 'task',
    title: '[HC3] Aula',
    context: 'faculdade',
    order: 0,
    done,
    unitId: 'unit-1',
    unitRole: 'aula',
  }
}

describe('unitSigla', () => {
  it('builds sigla + número a partir da disciplina', () => {
    expect(unitSigla(units, disciplines, 'unit-1')).toBe('HC3')
  })

  it('cai pra UN+número quando a unidade/disciplina não existe', () => {
    expect(unitSigla(units, disciplines, 'nope')).toBe('')
  })
})

describe('syncUnitReviews', () => {
  it('cria as 3 revisões em +1/+7/+30 dias a partir da data informada, ao marcar a aula como feita', () => {
    const items = [aulaItem(true)]
    const result = syncUnitReviews(items, units, disciplines, 'unit-1', true, '2026-10-01')
    const reviews = result.filter((it) => it.unitRole === 'revisao').sort((a, b) => (a.reviewIndex ?? 0) - (b.reviewIndex ?? 0))
    expect(reviews).toHaveLength(3)
    expect(reviews.map((r) => r.dayId)).toEqual(['2026-10-02', '2026-10-08', '2026-10-31'])
    expect(reviews.map((r) => r.title)).toEqual(['[HC3] Revisão 1/3', '[HC3] Revisão 2/3', '[HC3] Revisão 3/3'])
    expect(reviews.every((r) => r.context === 'faculdade' && r.unitId === 'unit-1' && !r.done)).toBe(true)
  })

  it('é idempotente: não duplica revisões já existentes pra um reviewIndex', () => {
    const items = [aulaItem(true)]
    const once = syncUnitReviews(items, units, disciplines, 'unit-1', true, '2026-10-01')
    const twice = syncUnitReviews(once, units, disciplines, 'unit-1', true, '2026-10-01')
    expect(twice.filter((it) => it.unitRole === 'revisao')).toHaveLength(3)
  })

  it('remove as revisões ainda não feitas ao desmarcar a aula, mas mantém as já feitas', () => {
    const items = [aulaItem(false)]
    const withReviews = syncUnitReviews(items, units, disciplines, 'unit-1', true, '2026-10-01')
    const reviews = withReviews.filter((it) => it.unitRole === 'revisao')
    const withOneDone = withReviews.map((it) => (it.id === reviews[0].id ? { ...it, done: true } : it))

    const afterUncheck = syncUnitReviews(withOneDone, units, disciplines, 'unit-1', false)
    const remaining = afterUncheck.filter((it) => it.unitRole === 'revisao')
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(reviews[0].id)
    expect(remaining[0].done).toBe(true)
  })

  it('não mexe nos outros itens', () => {
    const other: Item = { id: 'other-1', type: 'task', title: 'Lavar o carro', context: 'pessoal', order: 0, done: false }
    const result = syncUnitReviews([aulaItem(true), other], units, disciplines, 'unit-1', true, '2026-10-01')
    expect(result.find((it) => it.id === 'other-1')).toEqual(other)
  })
})
