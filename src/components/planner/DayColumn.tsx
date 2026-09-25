import { Plus } from 'lucide-react'
import { CATEGORY_ACCENT } from '@/lib/categoryStyles'
import { WEEKDAY_LONG, dayLabel, formatDayShort, isPastDay } from '@/lib/days'
import { agendaDndId, backlogAllocDndId, periodContainerId } from '@/lib/dnd'
import { PERIOD_LABEL, PERIOD_ORDER } from '@/lib/periods'
import type { AgendaItem, BacklogItem, DayCategoryId, PeriodId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { DayCategoryTag } from './DayCategoryTag'
import { HabitStrip } from './HabitStrip'
import { PeriodSection } from './PeriodSection'
import { TaskCard } from './TaskCard'
import { UnscheduledList } from './UnscheduledList'

interface DayColumnProps {
  dayId: string
  weekday: string
  isAnchor: boolean
  agendaItems: AgendaItem[]
  allocatedBacklogItems: BacklogItem[]
  category: DayCategoryId | null
  onSetCategory: (dayId: string, category: DayCategoryId | null) => void
  onToggleDone: (id: string) => void
  onOpenAgenda: (item: AgendaItem) => void
  onOpenBacklog: (item: BacklogItem) => void
  onAddAgenda: (dayId: string) => void
}

type PeriodEntry =
  | { kind: 'agenda'; item: AgendaItem; order: number }
  | { kind: 'backlog'; item: BacklogItem; order: number }

export function DayColumn({
  dayId,
  weekday,
  isAnchor,
  agendaItems,
  allocatedBacklogItems,
  category,
  onSetCategory,
  onToggleDone,
  onOpenAgenda,
  onOpenBacklog,
  onAddAgenda,
}: DayColumnProps) {
  const readOnly = isPastDay(dayId)
  const habitItems = agendaItems.filter((it) => it.habit)
  const otherItems = agendaItems.filter((it) => !it.habit)
  const unassigned = otherItems.filter((it) => !it.period)
  const label = dayLabel(dayId)

  function periodEntries(period: PeriodId): PeriodEntry[] {
    const entries: PeriodEntry[] = []
    for (const it of agendaItems) {
      if (it.period === period) entries.push({ kind: 'agenda', item: it, order: it.order })
    }
    for (const it of allocatedBacklogItems) {
      if (it.allocation?.period === period) entries.push({ kind: 'backlog', item: it, order: it.allocation.order })
    }
    return entries.sort((a, b) => a.order - b.order)
  }

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
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-serif text-sm font-semibold capitalize leading-tight">
              {WEEKDAY_LONG[weekday] ?? weekday}
            </p>
            <DayCategoryTag
              value={category}
              disabled={readOnly}
              onChange={(v) => onSetCategory(dayId, v)}
            />
          </div>
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
            aria-label="Adicionar tarefa"
            title="Adicionar tarefa"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      <HabitStrip items={habitItems} disabled={readOnly} onToggle={onToggleDone} />

      <div className="px-2 pt-2">
        <UnscheduledList
          dayId={dayId}
          items={unassigned}
          disabled={readOnly}
          onToggleDone={onToggleDone}
          onOpen={onOpenAgenda}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 pt-2">
        <div className="flex flex-col gap-3">
          {PERIOD_ORDER.map((period) => {
            const entries = periodEntries(period)
            return (
              <PeriodSection
                key={period}
                id={periodContainerId(dayId, period)}
                label={PERIOD_LABEL[period]}
                itemIds={entries.map((e) =>
                  e.kind === 'agenda' ? agendaDndId(e.item.id) : backlogAllocDndId(e.item.id),
                )}
                disabled={readOnly}
              >
                {entries.map((entry) =>
                  entry.kind === 'agenda' ? (
                    <TaskCard
                      key={entry.item.id}
                      dndId={agendaDndId(entry.item.id)}
                      title={entry.item.title}
                      done={entry.item.done}
                      kind={entry.item.color ?? 'clay'}
                      timeNote={entry.item.timeNote}
                      disabled={readOnly}
                      onToggleDone={() => onToggleDone(entry.item.id)}
                      onOpen={() => onOpenAgenda(entry.item)}
                    />
                  ) : (
                    <TaskCard
                      key={entry.item.id}
                      dndId={backlogAllocDndId(entry.item.id)}
                      title={entry.item.title}
                      done={entry.item.done}
                      kind={CATEGORY_ACCENT[entry.item.category]}
                      badge={entry.item.size}
                      disabled={readOnly}
                      onToggleDone={() => onToggleDone(entry.item.id)}
                      onOpen={() => onOpenBacklog(entry.item)}
                    />
                  ),
                )}
              </PeriodSection>
            )
          })}
        </div>
      </div>
    </div>
  )
}
