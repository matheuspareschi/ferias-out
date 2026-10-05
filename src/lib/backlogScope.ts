import type { Item } from './types'

/** Escopo de referência do backlog (2.3.1/6): semana ISO ou mês. */
export type BacklogScope = 'semana' | 'mes'

/**
 * Itens de backlog (sem `dayId`) relevantes pro escopo ativo. Itens sem
 * nenhuma referência (nem semana, nem mês) ficam em "sem período" (seção 6)
 * — aparecem em qualquer escopo, já que não se comprometeram com um
 * período específico. Pura.
 */
export function itemsForScope(items: Item[], scope: BacklogScope, weekId: string, monthId: string): Item[] {
  return items.filter((it) => {
    if (it.dayId) return false
    if (!it.referenceWeek && !it.referenceMonth) return true
    return scope === 'semana' ? it.referenceWeek === weekId : it.referenceMonth === monthId
  })
}
