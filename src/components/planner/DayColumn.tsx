import { ChevronDown, ChevronLeft, ChevronRight, NotebookPen, Plus } from 'lucide-react'
import { useState } from 'react'
import { BlurSavedTextarea } from '@/components/BlurSavedField'
import { WEEKDAY_LONG, dayLabel, formatDayShort, isPastDay, isToday as isTodayId } from '@/lib/days'
import { itemDndId, periodContainerId } from '@/lib/dnd'
import { PERIOD_LABEL, PERIOD_ORDER } from '@/lib/periods'
import type { DayCategoryId, DayMeta, Item, PeriodId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { DayCategoryTag } from './DayCategoryTag'
import { HabitStrip } from './HabitStrip'
import { ItemRow, type MoveAction } from './ItemRow'
import { PeriodSection } from './PeriodSection'
import { UnscheduledList } from './UnscheduledList'

interface DayColumnProps {
  dayId: string
  weekday: string
  /** Já filtrados pra este dia (dayId === este dia). */
  items: Item[]
  /** Lista completa (todos os dias) — pra achar pai/subtarefas que não moram neste dia, e os pendentes. */
  allItems: Item[]
  meta: DayMeta
  onSetCategory: (dayId: string, category: DayCategoryId | null) => void
  onSetNote: (dayId: string, note: string) => void
  onToggleDone: (id: string) => void
  onOpenItem: (item: Item) => void
  onAddItem: (dayId: string) => void
  onMoveItem: (item: Item, action: MoveAction) => void
  onGoPrev: () => void
  onGoNext: () => void
  onGoToday: () => void
  /** false quando já está vendo hoje — some o botão "Hoje". */
  showTodayButton: boolean
  /** Dias de DAY_LABELS que o usuário descartou na limpeza de legado (5.1) — não aparecem mais no cabeçalho. */
  dismissedDayLabels: string[]
}

export function DayColumn({
  dayId,
  weekday,
  items,
  allItems,
  meta,
  onSetCategory,
  onSetNote,
  onToggleDone,
  onOpenItem,
  onAddItem,
  onMoveItem,
  onGoPrev,
  onGoNext,
  onGoToday,
  showTodayButton,
  dismissedDayLabels,
}: DayColumnProps) {
  // Dias passados continuam editáveis — só ganham uma marcação informativa no cabeçalho.
  const isPast = isPastDay(dayId)
  const isToday = isTodayId(dayId)
  const [noteOpen, setNoteOpen] = useState(false)
  const [pendingOpen, setPendingOpen] = useState(false)
  const habitItems = items.filter((it) => it.habit)
  const otherItems = items.filter((it) => !it.habit)
  const unassigned = otherItems.filter((it) => !it.period)
  const label = dismissedDayLabels.includes(dayId) ? undefined : dayLabel(dayId)

  // Pendentes de dias ANTERIORES ao que está sendo visto (2.3) — não é mais só "ontem".
  const pendingItems = allItems
    .filter((it) => it.type === 'task' && !it.habit && !it.done && it.dayId && it.dayId < dayId)
    .sort((a, b) => (a.dayId! < b.dayId! ? -1 : 1))

  // Um hábito com período aparece duas vezes de propósito: sempre na HabitStrip,
  // e também como linha aqui dentro — por isso usa `items` (não `otherItems`).
  function periodEntries(period: PeriodId): Item[] {
    return items.filter((it) => it.period === period).sort((a, b) => a.order - b.order)
  }

  function renderItem(item: Item) {
    const children = allItems.filter((it) => it.parentId === item.id)
    const progress = children.length > 0 ? { done: children.filter((c) => c.done).length, total: children.length } : undefined
    const parent = item.parentId ? allItems.find((it) => it.id === item.parentId) : undefined
    // Pendência (destaque de atenção, 2.3/2.8): só tarefa (não hábito), não feita, de dia passado.
    const overdue = item.type === 'task' && !item.habit && !item.done && isPast
    return (
      <ItemRow
        item={item}
        overdue={overdue}
        progress={progress}
        parentTitle={parent?.title}
        sizeSuffix={item.context === 'faculdade' ? item.size : undefined}
        onToggleDone={() => onToggleDone(item.id)}
        onOpen={() => onOpenItem(item)}
        onMove={(action) => onMoveItem(item, action)}
      />
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-line px-2.5 py-2">
        <div className="flex min-w-0 items-start gap-1">
          <button
            type="button"
            onClick={onGoPrev}
            className="mt-0.5 shrink-0 rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-dim hover:text-ink"
            aria-label="Dia anterior"
            title="Dia anterior"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onGoNext}
            disabled={isToday}
            className="mt-0.5 shrink-0 rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-dim hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            aria-label="Dia seguinte"
            title="Dia seguinte"
          >
            <ChevronRight className="size-3.5" />
          </button>
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
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {showTodayButton && (
            <button
              type="button"
              onClick={onGoToday}
              className="flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
            >
              Hoje <ChevronRight className="size-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            className={cn(
              'rounded-sm p-1 transition-colors hover:bg-paper-raised hover:text-ink',
              meta.note ? 'text-accent' : 'text-ink-faint',
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

      {pendingItems.length > 0 && (
        <div className="border-b border-line px-2.5 py-1.5">
          <button
            type="button"
            onClick={() => setPendingOpen((v) => !v)}
            className="flex items-center gap-1 font-mono text-[10px] text-attention hover:underline"
          >
            <ChevronDown className={cn('size-3 transition-transform', !pendingOpen && '-rotate-90')} />
            {pendingItems.length} pendente{pendingItems.length > 1 ? 's' : ''} de dias anteriores
          </button>
          {pendingOpen && (
            <div className="mt-1 flex flex-col">
              {pendingItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  overdue
                  parentTitle={formatDayShort(item.dayId!)}
                  sizeSuffix={item.context === 'faculdade' ? item.size : undefined}
                  onToggleDone={() => onToggleDone(item.id)}
                  onOpen={() => onOpenItem(item)}
                  onMove={(action) => onMoveItem(item, action)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {noteOpen && (
        <div className="border-b border-line px-2.5 py-2">
          <BlurSavedTextarea
            value={meta.note ?? ''}
            onSave={(note) => onSetNote(dayId, note)}
            placeholder="Nota livre do dia — não entra no fluxo de tarefas…"
            rows={3}
            className="w-full resize-none rounded-sm border border-line bg-paper px-2 py-1.5 font-serif text-xs italic text-ink-dim outline-none focus:border-accent"
          />
        </div>
      )}

      <HabitStrip items={habitItems} onToggle={onToggleDone} />

      <div className="px-2 pt-2">
        <UnscheduledList dayId={dayId} items={unassigned} renderItem={renderItem} />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 pt-2">
        <div className="flex flex-col">
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
                  <div key={item.id}>{renderItem(item)}</div>
                ))}
              </PeriodSection>
            )
          })}
        </div>
      </div>
    </div>
  )
}
