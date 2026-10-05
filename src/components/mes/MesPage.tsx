import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { ItemGlyph } from '@/components/ItemGlyph'
import { EditItemModal, type ModalState } from '@/components/planner/EditItemModal'
import { useItemActions } from '@/hooks/useItemActions'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addMonths, daysInMonthCount, todayId, weekdayOf } from '@/lib/dates'
import { HABIT_ICON, HABIT_ORDER } from '@/lib/habits'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MesPageProps {
  planner: UsePlannerReturn
  month: string
  onMonthChange: (month: string) => void
  onOpenRetrospectiva: (month: string) => void
}

function monthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Itens do dia — inclui compromissos de vários dias (endDayId) que passam
 * por ele. Hábitos ficam de fora: eles já têm sua própria faixa (habitItems
 * no row), igual à Semana — não entram misturados na lista de tarefas.
 */
function itemsForDay(items: Item[], dayId: string): Item[] {
  return items
    .filter((it) => !it.habit && it.dayId && (it.dayId === dayId || (it.endDayId && it.dayId < dayId && dayId <= it.endDayId)))
    .sort((a, b) => a.order - b.order)
}

function MonthItemLine({ item, onToggleDone, onOpen }: { item: Item; onToggleDone: () => void; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
      }}
      className="flex w-full cursor-pointer items-center gap-1 rounded px-0.5 text-left leading-tight hover:bg-paper-dim/60"
    >
      <ItemGlyph type={item.type} done={item.done} migrated={Boolean(item.migratedFrom)} delivery={item.isDelivery} onChange={onToggleDone} size="sm" />
      <span className={cn('truncate text-[11px]', item.done && 'text-ink-faint line-through')}>{item.title}</span>
      {item.timeNote && <span className="shrink-0 font-mono text-[9px] text-ink-faint">{item.timeNote}</span>}
    </div>
  )
}

export function MesPage({ planner, month, onMonthChange, onOpenRetrospectiva }: MesPageProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const { handleMoveItem, handleToggleDone, handleAddSubtask } = useItemActions(planner)
  const today = todayId()

  const dayCount = daysInMonthCount(month)
  const days = Array.from({ length: dayCount }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pb-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onMonthChange(addMonths(month, -1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês anterior">
          <ChevronLeft className="size-4" />
        </button>
        <h1 className="font-serif text-lg font-semibold">{monthLabel(month)}</h1>
        <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês seguinte">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex flex-col rounded-sm border border-line bg-paper-raised/40">
        {days.map((dayId) => {
          const isToday = dayId === today
          const dayItems = itemsForDay(planner.items, dayId)
          const dayNum = Number(dayId.slice(-2))
          const habitItems = HABIT_ORDER.map((h) => planner.items.find((it) => it.dayId === dayId && it.habit === h)).filter(
            (it): it is Item => Boolean(it),
          )
          return (
            <div key={dayId} className={cn('flex gap-2 border-b border-line px-2 py-1.5 last:border-0', isToday && 'bg-accent-soft/40')}>
              <div className="w-12 shrink-0">
                <p className={cn('font-mono text-xs', isToday ? 'font-semibold text-accent' : 'text-ink-dim')}>{dayNum}</p>
                <p className="font-mono text-[9px] uppercase text-ink-faint">{weekdayOf(dayId)}</p>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {dayItems.length === 0 ? (
                  <span className="text-[10px] text-ink-faint">—</span>
                ) : (
                  dayItems.map((item) => (
                    <MonthItemLine
                      key={item.id}
                      item={item}
                      onToggleDone={() => handleToggleDone(item.id)}
                      onOpen={() => setModal({ type: 'item', item })}
                    />
                  ))
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {habitItems.length > 0 && (
                  <div className="flex gap-0.5">
                    {habitItems.map((it) => {
                      const Icon = HABIT_ICON[it.habit!]
                      return <Icon key={it.id} className={cn('size-2.5', it.done ? 'text-done' : 'text-ink-faint/50')} />
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setModal({ type: 'new', dayId })}
                  className="rounded-sm p-0.5 text-ink-faint hover:bg-paper-dim hover:text-ink"
                  aria-label={`Adicionar item em ${dayId}`}
                >
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onOpenRetrospectiva(month)}
        className="self-end rounded-sm border border-line px-2 py-1 text-xs text-ink-dim hover:border-line-strong hover:text-ink"
      >
        ver retrospectiva de {monthLabel(month)} →
      </button>

      <EditItemModal
        state={modal}
        items={planner.items}
        contexts={planner.contexts}
        onClose={() => setModal(null)}
        onAddContext={planner.addContext}
        onSave={(id, data) => {
          if (id) planner.updateItem(id, data)
          else planner.addItem({ ...data, order: Date.now() })
        }}
        onDelete={planner.deleteItem}
        onMove={handleMoveItem}
        onToggleItemDone={handleToggleDone}
        onAddSubtask={handleAddSubtask}
      />
    </div>
  )
}
