import { useDroppable } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { AddBacklogItemForm } from '@/components/planner/AddBacklogItemForm'
import { ItemRow, type MoveAction } from '@/components/planner/ItemRow'
import { contextLabel } from '@/lib/contexts'
import { isoWeekOf, isoWeekStart, monthIdOf, todayId } from '@/lib/dates'
import { itemDndId } from '@/lib/dnd'
import { itemsBeforeScope, itemsForScope, type BacklogScope } from '@/lib/backlogScope'
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
 * cheia do Backlog (6), mas só mostra a semana/mês ATUAL (sem navegação:
 * aqui não dá pra ver outubro quando é novembro). Itens sem período nunca
 * aparecem sozinhos aqui — ficam só no backlog do projeto e na página
 * Backlog. O que sobrou de períodos anteriores fica num grupo recolhido
 * no fim, "De períodos anteriores", nunca movido automaticamente.
 */
export function BacklogPanel({ items, contexts, onToggleDone, onOpen, onAdd, onMoveItem, onRefineToWeek }: BacklogPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar', data: { type: 'sidebar' } })
  const [scope, setScope] = useState<BacklogScope>('semana')
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [beforeOpen, setBeforeOpen] = useState(false)
  const week = isoWeekOf(todayId())
  const month = monthIdOf(todayId())

  const currentItems = itemsForScope(items, scope, week, month)
  const beforeItems = itemsBeforeScope(items, scope, week, month)
  const allScopedIds = new Set([...currentItems, ...beforeItems].map((it) => it.id))

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function childrenOf(id: string, source: Item[]): Item[] {
    return source.filter((it) => it.parentId === id).sort((a, b) => a.order - b.order)
  }

  function visibleDndIds(entries: Item[], source: Item[]): string[] {
    const ids: string[] = []
    for (const it of entries) {
      ids.push(itemDndId(it.id))
      if (!collapsedIds.has(it.id)) ids.push(...visibleDndIds(childrenOf(it.id, source), source))
    }
    return ids
  }

  function renderRow(item: Item, source: Item[]) {
    const children = childrenOf(item.id, source)
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
        {progress && !collapsed && <div className="flex flex-col">{children.map((c) => renderRow(c, source))}</div>}
      </div>
    )
  }

  function groupByContext(source: Item[]): { context: Context; items: Item[] }[] {
    const topLevel = source.filter((it) => !it.parentId || !allScopedIds.has(it.parentId))
    const pendingTop = topLevel.filter((it) => !it.done)
    const groups: { context: Context; items: Item[] }[] = []
    for (const context of contexts) {
      const group = pendingTop.filter((it) => it.context === context.id)
      if (group.length > 0) groups.push({ context, items: group })
    }
    const orphanContextIds = new Set(pendingTop.map((it) => it.context).filter((id) => !contexts.some((c) => c.id === id)))
    for (const id of orphanContextIds) {
      groups.push({ context: { id, label: id }, items: pendingTop.filter((it) => it.context === id) })
    }
    return groups
  }

  const currentGroups = groupByContext(currentItems)
  const currentTopLevel = currentItems.filter((it) => !it.parentId || !allScopedIds.has(it.parentId))
  const pendingTop = currentTopLevel.filter((it) => !it.done)
  const doneTop = currentTopLevel.filter((it) => it.done)
  const beforeGroups = groupByContext(beforeItems)

  const allVisibleIds = [
    ...visibleDndIds(pendingTop, currentItems),
    ...visibleDndIds(doneTop, currentItems),
    ...visibleDndIds(
      beforeItems.filter((it) => !it.parentId || !allScopedIds.has(it.parentId)),
      beforeItems,
    ),
  ]

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
        <span className="ml-auto font-mono text-xs text-ink-dim">{scope === 'semana' ? formatWeekLabel(week) : formatMonthLabel(month)}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn('flex flex-1 flex-col gap-3 rounded-sm p-1 transition-colors', isOver && 'bg-accent-soft/50')}
      >
        {pendingTop.length === 0 && <p className="p-2 font-mono text-[10px] text-ink-faint">backlog vazio</p>}
        <SortableContext id="sidebar" items={allVisibleIds}>
          {currentGroups.map(({ context, items: groupItems }) => (
            <div key={context.id} className="flex flex-col gap-0.5">
              <p className="px-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint">{contextLabel(contexts, context.id)}</p>
              {groupItems.map((item) => renderRow(item, currentItems))}
            </div>
          ))}
          {doneTop.length > 0 && <div className="flex flex-col border-t border-line pt-2">{doneTop.map((item) => renderRow(item, currentItems))}</div>}

          {beforeItems.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-line pt-2">
              <button
                type="button"
                onClick={() => setBeforeOpen((v) => !v)}
                className="flex items-center gap-1 font-mono text-[10px] text-ink-faint hover:text-ink"
              >
                <ChevronDown className={cn('size-3 transition-transform', !beforeOpen && '-rotate-90')} />
                de períodos anteriores ({beforeItems.length})
              </button>
              {beforeOpen && (
                <div className="flex flex-col gap-2">
                  {beforeGroups.map(({ context, items: groupItems }) => (
                    <div key={context.id} className="flex flex-col gap-0.5">
                      <p className="px-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint">{contextLabel(contexts, context.id)}</p>
                      {groupItems.map((item) => renderRow(item, beforeItems))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
