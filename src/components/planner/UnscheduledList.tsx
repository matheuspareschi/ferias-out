import { useDroppable } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import { itemDndId, unassignedContainerId } from '@/lib/dnd'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface UnscheduledListProps {
  dayId: string
  items: Item[]
  disabled?: boolean
  renderItem: (item: Item) => ReactNode
}

export function UnscheduledList({ dayId, items, disabled, renderItem }: UnscheduledListProps) {
  const containerId = unassignedContainerId(dayId)
  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    disabled,
    data: { type: 'unassigned', dayId },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn('flex min-h-6 flex-col rounded-sm', isOver && !disabled && 'bg-accent-soft/50')}
    >
      <SortableContext id={containerId} items={items.map((it) => itemDndId(it.id))}>
        {items.length === 0 && (
          <span className="px-1 py-0.5 font-mono text-[9px] text-ink-faint">sem período</span>
        )}
        {items.map((item) => (
          <div key={item.id}>{renderItem(item)}</div>
        ))}
      </SortableContext>
    </div>
  )
}
