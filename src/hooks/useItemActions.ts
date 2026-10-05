import type { MoveAction } from '@/components/planner/ItemRow'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addDays, todayId } from '@/lib/dates'
import type { Item } from '@/lib/types'

/**
 * Ações de mover/concluir/subtarefa (2.6/2.7) reutilizáveis por qualquer
 * página que precise abrir o EditItemModal fora da Semana (Mês, Ano,
 * Backlog) — a Semana continua com a sua própria cópia em PlannerBoard,
 * que precisa de ordenação exata dentro do container de drag-and-drop;
 * aqui "mover" sempre manda o item pro fim da lista do dia de destino.
 */
export function useItemActions(planner: UsePlannerReturn) {
  function handleMoveItem(item: Item, action: MoveAction) {
    if (action.kind === 'delete') {
      planner.deleteItem(item.id)
      return
    }
    if (action.kind === 'backlog') {
      planner.updateItem(item.id, { dayId: undefined, period: null, migratedFrom: item.dayId })
      return
    }
    const dayId = action.kind === 'tomorrow' ? addDays(item.dayId ?? todayId(), 1) : action.dayId
    planner.updateItem(item.id, { dayId, period: item.period, order: Date.now(), migratedFrom: item.dayId })
  }

  function handleToggleDone(id: string) {
    const item = planner.items.find((it) => it.id === id)
    if (!item) return
    const children = planner.items.filter((it) => it.parentId === id)
    const hasPending = children.some((c) => !c.done)
    if (!item.done && children.length > 0 && hasPending) {
      if (!window.confirm('Esta tarefa tem subtarefas pendentes. Concluir todas mesmo assim?')) return
      planner.toggleDone(id, { cascadeToChildren: true })
      return
    }
    planner.toggleDone(id)
  }

  function handleAddSubtask(parentId: string, title: string) {
    const parent = planner.items.find((it) => it.id === parentId)
    if (!parent) return
    planner.addItem({
      type: 'task',
      title,
      context: parent.context,
      dayId: parent.dayId,
      period: parent.period,
      parentId,
    })
  }

  return { handleMoveItem, handleToggleDone, handleAddSubtask }
}
