import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { AgendaItem } from '@/lib/types'
import { cn } from '@/lib/utils'

interface UnscheduledPillProps {
  item: AgendaItem
  disabled?: boolean
  onToggleDone: () => void
  onOpen: () => void
}

export function UnscheduledPill({ item, disabled, onToggleDone, onOpen }: UnscheduledPillProps) {
  const dndId = `agenda:${item.id}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId,
    disabled,
    data: { dndId },
  })

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
        'flex select-none touch-none items-center gap-1 rounded-full border border-line-strong bg-paper-raised px-2 py-0.5 text-[10px]',
        !disabled && 'cursor-grab active:cursor-grabbing',
        item.done && 'opacity-55 line-through',
        isDragging && 'z-30 opacity-85 shadow-lifted',
      )}
    >
      <input
        type="checkbox"
        checked={item.done}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggleDone}
        className="size-2.5 accent-rust"
      />
      <span className="max-w-32 truncate">{item.title}</span>
    </div>
  )
}
