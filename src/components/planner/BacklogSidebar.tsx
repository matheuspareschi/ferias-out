import { useDroppable } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { contextLabel } from '@/lib/contexts'
import { addMonths, monthIdOf, todayId } from '@/lib/dates'
import type { Context, Item, ItemSize } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AddBacklogItemForm } from './AddBacklogItemForm'
import { BacklogCard } from './BacklogCard'

interface BacklogSidebarProps {
  items: Item[]
  contexts: Context[]
  onToggleDone: (id: string) => void
  onToggleSubitem: (itemId: string, subitemId: string) => void
  onOpen: (item: Item) => void
  onAdd: (data: { title: string; context: string; size: ItemSize }) => void
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

export function BacklogSidebar({ items, contexts, onToggleDone, onToggleSubitem, onOpen, onAdd }: BacklogSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar', data: { type: 'sidebar' } })
  const [month, setMonth] = useState(() => monthIdOf(todayId()))

  // Item do backlog = sem dayId. Sem mês de referência, aparece em qualquer mês;
  // com mês de referência, só aparece quando bate com o mês visto.
  const backlogItems = items.filter((it) => !it.dayId && (!it.referenceMonth || it.referenceMonth === month))
  const pending = backlogItems.filter((it) => !it.done)
  const done = backlogItems.filter((it) => it.done)

  const groups: { context: Context; items: Item[] }[] = []
  for (const context of contexts) {
    const group = pending.filter((it) => it.context === context.id)
    if (group.length > 0) groups.push({ context, items: group })
  }
  // Itens com contexto que não existe mais na lista (ex.: apagado) — mostra mesmo assim.
  const orphanContextIds = new Set(pending.map((it) => it.context).filter((id) => !contexts.some((c) => c.id === id)))
  for (const id of orphanContextIds) {
    groups.push({ context: { id, label: id }, items: pending.filter((it) => it.context === id) })
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-line bg-paper-dim/40 p-3 lg:w-72 lg:border-l">
      <div>
        <h2 className="font-serif text-base font-semibold">Backlog</h2>
        <p className="text-xs text-ink-dim">arraste um card para um dia da grade</p>
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
          isOver && 'bg-gold-soft/40',
        )}
      >
        {pending.length === 0 && (
          <p className="p-2 font-mono text-[10px] text-ink-faint">backlog vazio</p>
        )}
        {groups.map(({ context, items: groupItems }) => (
          <div key={context.id} className="flex flex-col gap-1.5">
            <p className="px-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
              {contextLabel(contexts, context.id)}
            </p>
            {groupItems.map((item) => (
              <BacklogCard
                key={item.id}
                item={item}
                contexts={contexts}
                onToggleDone={() => onToggleDone(item.id)}
                onToggleSubitem={(subitemId) => onToggleSubitem(item.id, subitemId)}
                onOpen={() => onOpen(item)}
              />
            ))}
          </div>
        ))}
        {done.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-line pt-2">
            {done.map((item) => (
              <BacklogCard
                key={item.id}
                item={item}
                contexts={contexts}
                onToggleDone={() => onToggleDone(item.id)}
                onToggleSubitem={(subitemId) => onToggleSubitem(item.id, subitemId)}
                onOpen={() => onOpen(item)}
              />
            ))}
          </div>
        )}
      </div>

      <AddBacklogItemForm contexts={contexts} onAdd={onAdd} />
    </aside>
  )
}
