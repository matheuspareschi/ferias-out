import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { formatDayShort } from '@/lib/days'
import { BLOCK_STYLES } from '@/lib/categoryStyles'
import type { BacklogItem } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BacklogCardProps {
  item: BacklogItem
  onToggleDone: () => void
  onOpen: () => void
}

export function BacklogCard({ item, onToggleDone, onOpen }: BacklogCardProps) {
  const dndId = `backlog:${item.id}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId,
    data: { dndId },
  })
  const styles = BLOCK_STYLES[item.category]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? CSS.Translate.toString(transform) : undefined }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        'flex select-none touch-none cursor-grab items-start gap-2 rounded-sm border px-2.5 py-2 shadow-card active:cursor-grabbing',
        styles.bg,
        styles.border,
        item.done && 'opacity-55',
        isDragging && 'z-30 opacity-85 shadow-lifted',
      )}
    >
      <input
        type="checkbox"
        checked={item.done}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggleDone}
        className="mt-0.5 size-3.5 shrink-0 accent-rust"
      />
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
              · {formatDayShort(item.allocation.dayId)} {item.allocation.start}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
