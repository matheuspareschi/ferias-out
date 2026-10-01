import { useDraggable } from '@dnd-kit/core'
import { ItemBullet } from '@/components/ItemBullet'
import { ACCENT_STYLES } from '@/lib/categoryStyles'
import { contextLabel } from '@/lib/contexts'
import { draggableDragStyle, itemDndId, usePendingDnd } from '@/lib/dnd'
import type { Context, Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BacklogCardProps {
  item: Item
  contexts: Context[]
  onToggleDone: () => void
  onToggleSubitem?: (subitemId: string) => void
  onOpen: () => void
}

export function BacklogCard({ item, contexts, onToggleDone, onToggleSubitem, onOpen }: BacklogCardProps) {
  const dndId = itemDndId(item.id)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId,
    data: { dndId },
  })
  const styles = ACCENT_STYLES[item.color ?? 'clay']
  const isPending = usePendingDnd(dndId)
  const subitems = item.subitems ?? []

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
      <ItemBullet
        type={item.type}
        done={item.done}
        migrated={Boolean(item.migratedFrom)}
        onChange={onToggleDone}
        className="mt-0.5"
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
            {contextLabel(contexts, item.context)}
          </span>
          {item.size && <span className="font-mono text-[9px] text-ink-dim">{item.size}</span>}
        </div>
        {subitems.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            {subitems.map((sub) => (
              <li key={sub.id} className="flex items-center gap-1.5">
                <ItemBullet
                  type="task"
                  done={sub.done}
                  onChange={() => onToggleSubitem?.(sub.id)}
                  size="sm"
                />
                <span className={cn('truncate text-[11px] text-ink-dim', sub.done && 'line-through opacity-70')}>
                  {sub.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
