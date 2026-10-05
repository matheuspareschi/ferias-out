import { validateDateInput } from './dates'
import type { Item } from './types'

/**
 * Verdadeiro se o item aparece em algum lugar navegável do app: um dia
 * válido, o backlog da semana/mês de referência (Backlog, e Hoje quando é
 * o período atual), ou "sem período" (Backlog e a página do próprio
 * projeto/contexto). A única forma de um item ficar invisível é um `dayId`
 * malformado ou fora do alcance — nenhuma outra combinação de campos
 * esconde um item (1.5). Pura.
 */
export function isItemVisible(item: Item): boolean {
  if (item.dayId) return validateDateInput(item.dayId) !== null
  return true
}

/**
 * Recuperação (1.4/1.5): devolve pra "sem período" todo item cujo `dayId`
 * não é uma data de calendário real/válida (ex. ano "0002" de um bug já
 * corrigido no seletor de data) — garante `isItemVisible` pra qualquer item
 * depois de passar por aqui. Idempotente; devolve a mesma referência de
 * `items` se nada precisar mudar. Pura.
 */
export function recoverInvalidDates(items: Item[]): { items: Item[]; recoveredCount: number } {
  let recoveredCount = 0
  const result = items.map((it) => {
    if (it.dayId && !validateDateInput(it.dayId)) {
      recoveredCount++
      return { ...it, dayId: undefined, period: null }
    }
    return it
  })
  return recoveredCount === 0 ? { items, recoveredCount: 0 } : { items: result, recoveredCount }
}
