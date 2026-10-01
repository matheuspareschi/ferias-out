import { useSortable } from '@dnd-kit/sortable'
import { ItemBullet } from '@/components/ItemBullet'
import { ACCENT_STYLES } from '@/lib/categoryStyles'
import { itemDndId, sortableDragStyle, usePendingDnd } from '@/lib/dnd'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface UnscheduledPillProps {
  item: Item
  disabled?: boolean
  onToggleDone: () => void
  onOpen: () => void
}

export function UnscheduledPill({ item, disabled, onToggleDone, onOpen }: UnscheduledPillProps) {
  const dndId = itemDndId(item.id)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dndId,
    disabled,
    data: { dndId },
  })
  const styles = ACCENT_STYLES[item.color ?? 'clay']
  const isPending = usePendingDnd(dndId)

  return (
    <div
      ref={setNodeRef}
      style={sortableDragStyle(transform, transition, isDragging)}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        'flex select-none touch-manipulation items-center gap-1 rounded-sm border border-l-[3px] px-2 py-0.5 text-[10px]',
        styles.bg,
        styles.border,
        styles.stripe,
        !disabled && 'cursor-grab active:cursor-grabbing',
        item.done && 'opacity-55 line-through',
        isDragging && 'z-30 opacity-85 shadow-lifted',
        isPending && 'dnd-pending',
      )}
    >
      <ItemBullet
        type={item.type}
        done={item.done}
        migrated={Boolean(item.migratedFrom)}
        onChange={onToggleDone}
        size="sm"
      />
      <span className="max-w-32 truncate">{item.title}</span>
    </div>
  )
}
