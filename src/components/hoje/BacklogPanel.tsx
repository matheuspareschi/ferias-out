import { useDroppable } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { AddBacklogItemForm } from '@/components/planner/AddBacklogItemForm'
import { ItemRow, type MoveAction } from '@/components/planner/ItemRow'
import { contextLabel } from '@/lib/contexts'
import { addIsoWeeks, addMonths, isoWeekOf, isoWeekStart, monthIdOf, todayId } from '@/lib/dates'
import { itemDndId } from '@/lib/dnd'
import { itemsForScope, type BacklogScope } from '@/lib/backlogScope'
import type { Context, Item, ItemSize } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BacklogPanelProps {
  /** Lista completa — precisa pra achar o pai de uma subtarefa que ficou sozinha aqui. */
  items: Item[]
  contexts: Context[]
  onToggleDone: (id: string) => void
  onOpen: (item: Item) => void
  onAdd: (data: { title: string; context: string; size?: ItemSize; referenceWeek?: string; referenceMonth?: string }) => void
  onMoveItem: (item: Item, action: MoveAction) => void
  onRefineToWeek: (id: string, weekId: string) => void
}

function formatMonthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatWeekLabel(weekId: string): string {
  const [, m, d] = isoWeekStart(weekId).split('-')
  return `semana de ${d}/${m}`
}

/**
 * Backlog dentro da visão Hoje (2.3.1) — mesma fonte de dados da página
 * cheia do Backlog (6): qualquer item sem `dayId`. Escopo alternável entre
 * semana ISO e mês de referência; itens sem referência nenhuma aparecem
 * nos dois.
 */
export function BacklogPanel({ items, contexts, onToggleDone, onOpen, onAdd, onMoveItem, onRefineToWeek }: BacklogPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar', data: { type: 'sidebar' } })
  const [scope, setScope] = useState<BacklogScope>('semana')
  const [week, setWeek] = useState(() => isoWeekOf(todayId()))
  const [month, setMonth] = useState(() => monthIdOf(todayId()))
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  const backlogItems = itemsForScope(items, scope, week, month)
  const backlogIds = new Set(backlogItems.map((it) => it.id))

  // Topo da lista: item sem pai, ou cujo pai não está (mais) no backlog — nesse
  // caso ele aparece sozinho, com o nome do pai como prefixo (2.6).
  const topLevel = backlogItems.filter((it) => !it.parentId || !backlogIds.has(it.parentId))
  const pendingTop = topLevel.filter((it) => !it.done)
  const doneTop = topLevel.filter((it) => it.done)

  function childrenInBacklog(id: string): Item[] {
    return backlogItems.filter((it) => it.parentId === id).sort((a, b) => a.order - b.order)
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function visibleDndIds(entries: Item[]): string[] {
    const ids: string[] = []
    for (const it of entries) {
      ids.push(itemDndId(it.id))
      if (!collapsedIds.has(it.id)) ids.push(...visibleDndIds(childrenInBacklog(it.id)))
    }
    return ids
  }

  function renderRow(item: Item) {
    const children = childrenInBacklog(item.id)
    const progress = children.length > 0 ? { done: children.filter((c) => c.done).length, total: children.length } : undefined
    const parent = item.parentId ? items.find((it) => it.id === item.parentId) : undefined
    const collapsed = collapsedIds.has(item.id)
    const canRefine = !item.referenceWeek && Boolean(item.referenceMonth)
    return (
      <div key={item.id}>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <ItemRow
              item={item}
              progress={progress}
              collapsed={collapsed}
              onToggleCollapsed={progress ? () => toggleCollapsed(item.id) : undefined}
              parentTitle={parent?.title}
              sizeSuffix={item.context === 'faculdade' ? item.size : undefined}
              onToggleDone={() => onToggleDone(item.id)}
              onOpen={() => onOpen(item)}
              onMove={(action) => onMoveItem(item, action)}
            />
          </div>
          {canRefine && (
            <button
              type="button"
              onClick={() => onRefineToWeek(item.id, week)}
              className="shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] text-ink-faint hover:bg-paper-dim hover:text-ink"
              title="Refinar pra esta semana"
            >
              → semana
            </button>
          )}
        </div>
        {progress && !collapsed && <div className="flex flex-col">{children.map((c) => renderRow(c))}</div>}
      </div>
    )
  }

  const groups: { context: Context; items: Item[] }[] = []
  for (const context of contexts) {
    const group = pendingTop.filter((it) => it.context === context.id)
    if (group.length > 0) groups.push({ context, items: group })
  }
  const orphanContextIds = new Set(pendingTop.map((it) => it.context).filter((id) => !contexts.some((c) => c.id === id)))
  for (const id of orphanContextIds) {
    groups.push({ context: { id, label: id }, items: pendingTop.filter((it) => it.context === id) })
  }

  const allVisibleIds = [...visibleDndIds(pendingTop), ...visibleDndIds(doneTop)]

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div>
        <h2 className="font-serif text-base font-semibold">Backlog</h2>
        <p className="text-xs text-ink-dim">arraste um item pro dia, ou agende uma data</p>
      </div>

      <div className="flex items-center gap-1">
        {(['semana', 'mes'] as BacklogScope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={cn('rounded-sm px-2 py-1 text-xs', scope === s ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-paper-dim')}
          >
            {s === 'semana' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => (scope === 'semana' ? setWeek((w) => addIsoWeeks(w, -1)) : setMonth((m) => addMonths(m, -1)))}
          className="rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-raised hover:text-ink"
          aria-label="Período anterior"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="font-mono text-xs text-ink-dim">{scope === 'semana' ? formatWeekLabel(week) : formatMonthLabel(month)}</span>
        <button
          type="button"
          onClick={() => (scope === 'semana' ? setWeek((w) => addIsoWeeks(w, 1)) : setMonth((m) => addMonths(m, 1)))}
          className="rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-raised hover:text-ink"
          aria-label="Período seguinte"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn('flex flex-1 flex-col gap-3 rounded-sm p-1 transition-colors', isOver && 'bg-accent-soft/50')}
      >
        {pendingTop.length === 0 && <p className="p-2 font-mono text-[10px] text-ink-faint">backlog vazio</p>}
        <SortableContext id="sidebar" items={allVisibleIds}>
          {groups.map(({ context, items: groupItems }) => (
            <div key={context.id} className="flex flex-col gap-0.5">
              <p className="px-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint">{contextLabel(contexts, context.id)}</p>
              {groupItems.map((item) => renderRow(item))}
            </div>
          ))}
          {doneTop.length > 0 && <div className="flex flex-col border-t border-line pt-2">{doneTop.map((item) => renderRow(item))}</div>}
        </SortableContext>
      </div>

      <AddBacklogItemForm
        contexts={contexts}
        onAdd={(data) =>
          onAdd({
            ...data,
            referenceWeek: scope === 'semana' ? week : undefined,
            referenceMonth: scope === 'mes' ? month : undefined,
          })
        }
      />
    </div>
  )
}
