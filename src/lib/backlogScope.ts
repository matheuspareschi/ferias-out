import type { Item } from './types'

/** Escopo de referência do backlog (2.3.1/6): semana ISO ou mês. */
export type BacklogScope = 'semana' | 'mes'

/**
 * Itens de backlog (sem `dayId`) com referência exata pro período ativo —
 * nunca inclui itens "sem período" (esses só aparecem na página Backlog,
 * seção própria) nem itens de período passado (esses vão pro grupo "de
 * períodos anteriores"). Pura.
 */
export function itemsForScope(items: Item[], scope: BacklogScope, weekId: string, monthId: string): Item[] {
  return items.filter((it) => {
    if (it.dayId) return false
    return scope === 'semana' ? it.referenceWeek === weekId : it.referenceMonth === monthId
  })
}

/**
 * Itens de backlog (sem `dayId`) cuja semana/mês de referência já passou em
 * relação ao período ativo — "de períodos anteriores" (2.3.1), nunca movidos
 * automaticamente. Comparação lexical em "YYYY-Www"/"YYYY-MM" basta.
 */
export function itemsBeforeScope(items: Item[], scope: BacklogScope, weekId: string, monthId: string): Item[] {
  return items.filter((it) => {
    if (it.dayId) return false
    return scope === 'semana' ? Boolean(it.referenceWeek) && it.referenceWeek! < weekId : Boolean(it.referenceMonth) && it.referenceMonth! < monthId
  })
}

/** Itens de backlog sem nenhuma referência de período — "sem período" (seção 6). Pura. */
export function unscopedItems(items: Item[]): Item[] {
  return items.filter((it) => !it.dayId && !it.referenceWeek && !it.referenceMonth)
}
