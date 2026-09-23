import { useDroppable } from '@dnd-kit/core'
import type { AgendaItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { UnscheduledPill } from './UnscheduledPill'

interface UnscheduledListProps {
  dayId: string
  items: AgendaItem[]
  disabled?: boolean
  onToggleDone: (id: string) => void
  onOpen: (item: AgendaItem) => void
}

export function UnscheduledList({ dayId, items, disabled, onToggleDone, onOpen }: UnscheduledListProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `unscheduled:${dayId}`,
    disabled,
    data: { type: 'unscheduled', dayId },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-7 flex-wrap gap-1 rounded-sm border border-dashed border-transparent p-1 transition-colors',
        isOver && !disabled && 'border-line-strong bg-gold-soft/40',
      )}
    >
      {items.length === 0 && (
        <span className="px-1 py-0.5 font-mono text-[9px] text-ink-faint">sem horário</span>
      )}
      {items.map((item) => (
        <UnscheduledPill
          key={item.id}
          item={item}
          disabled={disabled}
          onToggleDone={() => onToggleDone(item.id)}
          onOpen={() => onOpen(item)}
        />
      ))}
    </div>
  )
}
