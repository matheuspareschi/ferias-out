import { useDroppable } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { contextLabel } from '@/lib/contexts'
import { addMonths, monthIdOf, todayId } from '@/lib/dates'
import { itemDndId } from '@/lib/dnd'
import type { Context, Item, ItemSize } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AddBacklogItemForm } from './AddBacklogItemForm'
import { ItemRow, type MoveAction } from './ItemRow'

interface BacklogSidebarProps {
  /** Lista completa — precisa pra achar o pai de uma subtarefa que ficou sozinha aqui. */
  items: Item[]
  contexts: Context[]
  onToggleDone: (id: string) => void
  onOpen: (item: Item) => void
  onAdd: (data: { title: string; context: string; size?: ItemSize }) => void
  onMoveItem: (item: Item, action: MoveAction) => void
}

function formatMonthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function BacklogSidebar({ items, contexts, onToggleDone, onOpen, onAdd, onMoveItem }: BacklogSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar', data: { type: 'sidebar' } })
  const [month, setMonth] = useState(() => monthIdOf(todayId()))
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  // Item do backlog = sem dayId. Sem mês de referência, aparece em qualquer mês;
  // com mês de referência, só aparece quando bate com o mês visto.
  const backlogItems = items.filter((it) => !it.dayId && (!it.referenceMonth || it.referenceMonth === month))
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
    return (
      <div key={item.id}>
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
        {progress && !collapsed && <div className="flex flex-col">{children.map((c) => renderRow(c))}</div>}
      </div>
    )
  }

  const groups: { context: Context; items: Item[] }[] = []
  for (const context of contexts) {
    const group = pendingTop.filter((it) => it.context === context.id)
    if (group.length > 0) groups.push({ context, items: group })
  }
  // Itens com contexto que não existe mais na lista (ex.: apagado) — mostra mesmo assim.
  const orphanContextIds = new Set(
    pendingTop.map((it) => it.context).filter((id) => !contexts.some((c) => c.id === id)),
  )
  for (const id of orphanContextIds) {
    groups.push({ context: { id, label: id }, items: pendingTop.filter((it) => it.context === id) })
  }

  const allVisibleIds = [...visibleDndIds(pendingTop), ...visibleDndIds(doneTop)]

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-line bg-paper-dim/40 p-3 lg:w-72 lg:border-l">
      <div>
        <h2 className="font-serif text-base font-semibold">Backlog</h2>
        <p className="text-xs text-ink-dim">arraste um item para um dia da grade</p>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-raised hover:text-ink"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="font-mono text-xs text-ink-dim">{formatMonthLabel(month)}</span>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-raised hover:text-ink"
          aria-label="Mês seguinte"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-sm p-1 transition-colors lg:max-h-none lg:flex-1',
          isOver && 'bg-accent-soft/50',
        )}
      >
        {pendingTop.length === 0 && (
          <p className="p-2 font-mono text-[10px] text-ink-faint">backlog vazio</p>
        )}
        <SortableContext id="sidebar" items={allVisibleIds}>
          {groups.map(({ context, items: groupItems }) => (
            <div key={context.id} className="flex flex-col gap-0.5">
              <p className="px-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                {contextLabel(contexts, context.id)}
              </p>
              {groupItems.map((item) => renderRow(item))}
            </div>
          ))}
          {doneTop.length > 0 && (
            <div className="flex flex-col border-t border-line pt-2">{doneTop.map((item) => renderRow(item))}</div>
          )}
        </SortableContext>
      </div>

      <AddBacklogItemForm contexts={contexts} onAdd={onAdd} />
    </aside>
  )
}
