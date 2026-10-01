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

/** Sem moldura própria (v2): só o rótulo do período e uma linha fina separando do anterior. */
export function PeriodSection({ id, label, itemIds, disabled, children }: PeriodSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled,
    data: { type: 'period', containerId: id },
  })

  return (
    <div className="flex flex-col gap-1 border-t border-line pt-2 first:border-t-0 first:pt-0">
      <p className="px-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
      <div
        ref={setNodeRef}
        className={cn('flex min-h-6 flex-col rounded-sm', isOver && !disabled && 'bg-accent-soft/50')}
      >
        <SortableContext id={id} items={itemIds} strategy={verticalListSortingStrategy} disabled={disabled}>
          {children}
        </SortableContext>
      </div>
    </div>
  )
}
