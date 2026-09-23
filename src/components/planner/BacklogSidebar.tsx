import { useDroppable } from '@dnd-kit/core'
import type { BacklogCategory, BacklogItem, BacklogSize } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AddBacklogItemForm } from './AddBacklogItemForm'
import { BacklogCard } from './BacklogCard'

interface BacklogSidebarProps {
  items: BacklogItem[]
  onToggleDone: (id: string) => void
  onOpen: (item: BacklogItem) => void
  onAdd: (data: { title: string; category: BacklogCategory; size: BacklogSize }) => void
}

export function BacklogSidebar({ items, onToggleDone, onOpen, onAdd }: BacklogSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar', data: { type: 'sidebar' } })
  const pending = items.filter((it) => !it.done)
  const done = items.filter((it) => it.done)

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-line bg-paper-dim/40 p-3 lg:w-72 lg:border-l">
      <div>
        <h2 className="font-serif text-base font-semibold">Backlog</h2>
        <p className="text-xs text-ink-dim">arraste um card para um dia da grade</p>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto rounded-sm p-1 transition-colors lg:max-h-none lg:flex-1',
          isOver && 'bg-gold-soft/40',
        )}
      >
        {pending.length === 0 && (
          <p className="p-2 font-mono text-[10px] text-ink-faint">backlog vazio</p>
        )}
        {pending.map((item) => (
          <BacklogCard
            key={item.id}
            item={item}
            onToggleDone={() => onToggleDone(item.id)}
            onOpen={() => onOpen(item)}
          />
        ))}
        {done.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-line pt-2">
            {done.map((item) => (
              <BacklogCard
                key={item.id}
                item={item}
                onToggleDone={() => onToggleDone(item.id)}
                onOpen={() => onOpen(item)}
              />
            ))}
          </div>
        )}
      </div>

      <AddBacklogItemForm onAdd={onAdd} />
    </aside>
  )
}
