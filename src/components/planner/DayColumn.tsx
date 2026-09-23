import { Plus } from 'lucide-react'
import { WEEKDAY_LONG, dayLabel, formatDayShort, isPastDay } from '@/lib/days'
import type { AgendaItem, BacklogItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { GridBlock } from './GridBlock'
import { TimeGrid } from './TimeGrid'
import { UnscheduledList } from './UnscheduledList'

interface DayColumnProps {
  dayId: string
  weekday: string
  isAnchor: boolean
  agendaItems: AgendaItem[]
  allocatedBacklogItems: BacklogItem[]
  onToggleDone: (id: string) => void
  onOpenAgenda: (item: AgendaItem) => void
  onOpenBacklog: (item: BacklogItem) => void
  onResizeAgenda: (id: string, duration: number) => void
  onResizeBacklog: (id: string, duration: number) => void
  onAddAgenda: (dayId: string) => void
}

export function DayColumn({
  dayId,
  weekday,
  isAnchor,
  agendaItems,
  allocatedBacklogItems,
  onToggleDone,
  onOpenAgenda,
  onOpenBacklog,
  onResizeAgenda,
  onResizeBacklog,
  onAddAgenda,
}: DayColumnProps) {
  const readOnly = isPastDay(dayId)
  const unscheduled = agendaItems.filter((it) => !it.start)
  const scheduled = agendaItems.filter((it) => it.start)
  const label = dayLabel(dayId)

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col rounded-md border',
        isAnchor ? 'border-rust/50 bg-paper-raised/50 shadow-card' : 'border-line bg-paper-raised/15',
        readOnly && 'grayscale-[0.3]',
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-line px-2.5 py-2">
        <div className="min-w-0">
          <p className="truncate font-serif text-sm font-semibold capitalize leading-tight">
            {WEEKDAY_LONG[weekday] ?? weekday}
          </p>
          <p className="font-mono text-xs text-ink-dim">
            {formatDayShort(dayId)}
            {label ? ` · ${label}` : ''}
            {readOnly ? ' · passado' : ''}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onAddAgenda(dayId)}
            className="shrink-0 rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-raised hover:text-ink"
            aria-label="Adicionar compromisso"
            title="Adicionar compromisso"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      <div className="px-2 pt-2">
        <UnscheduledList
          dayId={dayId}
          items={unscheduled}
          disabled={readOnly}
          onToggleDone={onToggleDone}
          onOpen={onOpenAgenda}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 pt-3">
        <TimeGrid dayId={dayId} disabled={readOnly}>
          {scheduled.map((item) => (
            <GridBlock
              key={item.id}
              dndId={`agenda:${item.id}`}
              title={item.title}
              start={item.start!}
              duration={item.duration}
              done={item.done}
              kind="agenda"
              disabled={readOnly}
              onToggleDone={() => onToggleDone(item.id)}
              onOpen={() => onOpenAgenda(item)}
              onResize={(d) => onResizeAgenda(item.id, d)}
            />
          ))}
          {allocatedBacklogItems.map((item) => (
            <GridBlock
              key={item.id}
              dndId={`backlog:${item.id}`}
              title={item.title}
              start={item.allocation!.start}
              duration={item.allocation!.duration}
              done={item.done}
              kind={item.category}
              badge={item.size}
              disabled={readOnly}
              onToggleDone={() => onToggleDone(item.id)}
              onOpen={() => onOpenBacklog(item)}
              onResize={(d) => onResizeBacklog(item.id, d)}
            />
          ))}
        </TimeGrid>
      </div>
    </div>
  )
}
