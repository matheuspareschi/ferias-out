import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { GRID_END_HOUR, GRID_START_HOUR, GRID_TOTAL_HEIGHT, HOUR_HEIGHT } from '@/lib/grid'
import { cn } from '@/lib/utils'

interface TimeGridProps {
  dayId: string
  disabled?: boolean
  children: ReactNode
}

export function TimeGrid({ dayId, disabled, children }: TimeGridProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `grid:${dayId}`,
    disabled,
    data: { type: 'grid', dayId },
  })

  const hours = Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
    (_, i) => GRID_START_HOUR + i,
  )

  return (
    <div
      ref={setNodeRef}
      className={cn('relative rounded-sm transition-colors', isOver && !disabled && 'bg-gold-soft/40')}
      style={{ height: GRID_TOTAL_HEIGHT }}
    >
      {hours.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 border-t border-line/70"
          style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT }}
        >
          <span className="absolute -top-2 left-0.5 bg-paper px-0.5 font-mono text-[9px] text-ink-faint">
            {String(h).padStart(2, '0')}h
          </span>
        </div>
      ))}
      {children}
    </div>
  )
}
