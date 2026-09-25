import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PeriodSectionProps {
  id: string
  label: string
  itemIds: string[]
  disabled?: boolean
  children: ReactNode
}

export function PeriodSection({ id, label, itemIds, disabled, children }: PeriodSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled,
    data: { type: 'period', containerId: id },
  })

  return (
    <div className="flex flex-col gap-1">
      <p className="px-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-11 flex-col gap-1.5 rounded-sm p-1 transition-colors',
          isOver && !disabled && 'bg-gold-soft/40',
        )}
      >
        <SortableContext id={id} items={itemIds} strategy={verticalListSortingStrategy} disabled={disabled}>
          {children}
        </SortableContext>
      </div>
    </div>
  )
}
