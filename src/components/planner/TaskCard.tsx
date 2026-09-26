import { useSortable } from '@dnd-kit/sortable'
import { Checkbox } from '@/components/Checkbox'
import { ACCENT_STYLES } from '@/lib/categoryStyles'
import { sortableDragStyle, usePendingDnd } from '@/lib/dnd'
import type { AccentColor } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  dndId: string
  title: string
  done: boolean
  kind: AccentColor
  badge?: string
  timeNote?: string
  disabled?: boolean
  onToggleDone: () => void
  onOpen: () => void
}

/** Card padronizado — mesma altura e layout pra qualquer tarefa, independente do tamanho P/M/G. */
export function TaskCard({
  dndId,
  title,
  done,
  kind,
  badge,
  timeNote,
  disabled,
  onToggleDone,
  onOpen,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dndId,
    disabled,
    data: { dndId },
  })
  const styles = ACCENT_STYLES[kind]
  const style = sortableDragStyle(transform, transition, isDragging)
  const isPending = usePendingDnd(dndId)

  const meta = [timeNote, badge].filter(Boolean).join(' · ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        'flex h-14 shrink-0 select-none touch-manipulation items-center gap-2 rounded-sm border border-l-4 px-2.5 shadow-card',
        !disabled && 'cursor-grab active:cursor-grabbing',
        styles.bg,
        styles.border,
        styles.stripe,
        done && 'opacity-55',
        isDragging && 'z-30 opacity-70 shadow-lifted',
        isPending && 'dnd-pending',
      )}
    >
      <Checkbox checked={done} onChange={onToggleDone} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[12.5px] font-medium leading-tight',
            styles.text,
            done && 'line-through',
          )}
        >
          {title}
        </p>
        {meta && <p className="mt-0.5 truncate font-mono text-[9.5px] text-ink-dim">{meta}</p>}
      </div>
    </div>
  )
}
