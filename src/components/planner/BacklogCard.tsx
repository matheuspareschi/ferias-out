import { useDraggable } from '@dnd-kit/core'
import { Checkbox } from '@/components/Checkbox'
import { ACCENT_STYLES, CATEGORY_ACCENT } from '@/lib/categoryStyles'
import { formatDayShort } from '@/lib/days'
import { backlogCardDndId, draggableDragStyle, usePendingDnd } from '@/lib/dnd'
import { PERIOD_LABEL } from '@/lib/periods'
import type { BacklogItem } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BacklogCardProps {
  item: BacklogItem
  onToggleDone: () => void
  onOpen: () => void
}

export function BacklogCard({ item, onToggleDone, onOpen }: BacklogCardProps) {
  const dndId = backlogCardDndId(item.id)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId,
    data: { dndId },
  })
  const styles = ACCENT_STYLES[CATEGORY_ACCENT[item.category]]
  const isPending = usePendingDnd(dndId)

  return (
    <div
      ref={setNodeRef}
      style={draggableDragStyle(transform, isDragging)}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        'flex select-none touch-manipulation cursor-grab items-start gap-2 rounded-sm border border-l-4 px-2.5 py-2 shadow-card active:cursor-grabbing',
        styles.bg,
        styles.border,
        styles.stripe,
        item.done && 'opacity-55',
        isDragging && 'z-30 opacity-85 shadow-lifted',
        isPending && 'dnd-pending',
      )}
    >
      <Checkbox checked={item.done} onChange={onToggleDone} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm leading-tight', styles.text, item.done && 'line-through')}>
          {item.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide',
              styles.text,
            )}
          >
            <span className={cn('size-1.5 rounded-full', styles.dot)} aria-hidden />
            {styles.label}
          </span>
          <span className="font-mono text-[9px] text-ink-dim">{item.size}</span>
          {item.allocation && (
            <span className="font-mono text-[9px] text-ink-faint">
              · {formatDayShort(item.allocation.dayId)} {PERIOD_LABEL[item.allocation.period]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
