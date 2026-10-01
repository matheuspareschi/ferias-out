import { NotebookPen, Plus } from 'lucide-react'
import { useState } from 'react'
import { WEEKDAY_LONG, dayLabel, formatDayShort, isPastDay } from '@/lib/days'
import { itemDndId, periodContainerId } from '@/lib/dnd'
import { PERIOD_LABEL, PERIOD_ORDER } from '@/lib/periods'
import type { DayCategoryId, DayMeta, Item, PeriodId } from '@/lib/types'
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
  /** Já filtrados pra este dia (dayId === este dia). */
  items: Item[]
  meta: DayMeta
  onSetCategory: (dayId: string, category: DayCategoryId | null) => void
  onSetNote: (dayId: string, note: string) => void
  onToggleDone: (id: string) => void
  onOpenItem: (item: Item) => void
  onAddItem: (dayId: string) => void
}

export function DayColumn({
  dayId,
  weekday,
  isAnchor,
  items,
  meta,
  onSetCategory,
  onSetNote,
  onToggleDone,
  onOpenItem,
  onAddItem,
}: DayColumnProps) {
  // Dias passados continuam editáveis — só ganham uma marcação informativa no cabeçalho.
  const isPast = isPastDay(dayId)
  const [noteOpen, setNoteOpen] = useState(false)
  const habitItems = items.filter((it) => it.habit)
  const otherItems = items.filter((it) => !it.habit)
  const unassigned = otherItems.filter((it) => !it.period)
  const label = dayLabel(dayId)

  // Um hábito com período aparece duas vezes de propósito: sempre na HabitStrip,
  // e também como card aqui dentro — por isso usa `items` (não `otherItems`).
  function periodEntries(period: PeriodId): Item[] {
    return items.filter((it) => it.period === period).sort((a, b) => a.order - b.order)
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col rounded-md border',
        isAnchor ? 'border-rust/50 bg-paper-raised/50 shadow-card' : 'border-line bg-paper-raised/15',
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-line px-2.5 py-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-serif text-sm font-semibold capitalize leading-tight">
              {WEEKDAY_LONG[weekday] ?? weekday}
            </p>
            <DayCategoryTag value={meta.category ?? null} onChange={(v) => onSetCategory(dayId, v)} />
          </div>
          <p className="font-mono text-xs text-ink-dim">
            {formatDayShort(dayId)}
            {label ? ` · ${label}` : ''}
            {isPast ? ' · passado' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            className={cn(
              'rounded-sm p-1 transition-colors hover:bg-paper-raised hover:text-ink',
              meta.note ? 'text-clay' : 'text-ink-faint',
            )}
            aria-label="Nota do dia"
            aria-pressed={noteOpen}
            title="Nota do dia"
          >
            <NotebookPen className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAddItem(dayId)}
            className="rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-raised hover:text-ink"
            aria-label="Adicionar item"
            title="Adicionar item"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      {noteOpen && (
        <div className="border-b border-line px-2.5 py-2">
          <textarea
            value={meta.note ?? ''}
            onChange={(e) => onSetNote(dayId, e.target.value)}
            placeholder="Nota livre do dia — não entra no fluxo de tarefas…"
            rows={3}
            className="w-full resize-none rounded-sm border border-line bg-paper px-2 py-1.5 font-serif text-xs italic text-ink-dim outline-none focus:border-clay-dim"
          />
        </div>
      )}

      <HabitStrip items={habitItems} onToggle={onToggleDone} />

      <div className="px-2 pt-2">
        <UnscheduledList dayId={dayId} items={unassigned} onToggleDone={onToggleDone} onOpen={onOpenItem} />
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
                itemIds={entries.map((it) => itemDndId(it.id))}
              >
                {entries.map((item) => (
                  <TaskCard
                    key={item.id}
                    dndId={itemDndId(item.id)}
                    type={item.type}
                    title={item.title}
                    done={item.done}
                    kind={item.color ?? 'clay'}
                    badge={item.size}
                    timeNote={item.timeNote}
                    migrated={Boolean(item.migratedFrom)}
                    onToggleDone={() => onToggleDone(item.id)}
                    onOpen={() => onOpenItem(item)}
                  />
                ))}
              </PeriodSection>
            )
          })}
        </div>
      </div>
    </div>
  )
}
