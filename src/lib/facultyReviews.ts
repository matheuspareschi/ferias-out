import { addDays, todayId } from './dates'
import type { Discipline, Item, Unit } from './types'

let seq = 0
function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

/** `[SIGLA+número]`, ex. "HC3" — usado no título de aula/revisão de uma Unidade. */
export function unitSigla(units: Unit[], disciplines: Discipline[], unitId: string): string {
  const unit = units.find((u) => u.id === unitId)
  if (!unit) return ''
  const discipline = disciplines.find((d) => d.id === unit.disciplineId)
  return `${discipline?.sigla ?? 'UN'}${unit.number}`
}

const REVIEW_OFFSETS: { index: 1 | 2 | 3; days: number }[] = [
  { index: 1, days: 1 },
  { index: 2, days: 7 },
  { index: 3, days: 30 },
]

/**
 * Regra de revisão automática (3.2): ao marcar a aula de uma unidade como
 * feita, cria as 3 revisões (+1/+7/+30 dias a partir de `today`, assumido
 * como o dia em que a aula foi ticada) que ainda não existem — idempotente
 * por `unitId` + `reviewIndex`, nunca duplica. Ao desmarcar, remove as
 * revisões ainda não feitas (as já feitas ficam, viram histórico). Pura.
 */
export function syncUnitReviews(
  items: Item[],
  units: Unit[],
  disciplines: Discipline[],
  unitId: string,
  aulaDone: boolean,
  today: string = todayId(),
): Item[] {
  if (!aulaDone) {
    return items.filter((it) => !(it.unitId === unitId && it.unitRole === 'revisao' && !it.done))
  }
  const existing = items.filter((it) => it.unitId === unitId && it.unitRole === 'revisao')
  const sigla = unitSigla(units, disciplines, unitId)
  const created: Item[] = []
  for (const { index, days } of REVIEW_OFFSETS) {
    if (existing.some((it) => it.reviewIndex === index)) continue
    created.push({
      id: nextId('revisao'),
      type: 'task',
      title: `[${sigla}] Revisão ${index}/3`,
      context: 'faculdade',
      dayId: addDays(today, days),
      period: null,
      order: 0,
      done: false,
      unitId,
      unitRole: 'revisao',
      reviewIndex: index,
    })
  }
  return created.length > 0 ? [...items, ...created] : items
}
