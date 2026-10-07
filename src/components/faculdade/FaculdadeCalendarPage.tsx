import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ItemGlyph } from '@/components/ItemGlyph'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addMonths, daysInMonthCount, isoWeekOf, todayId, weekdayIndexOf, weekdayOf } from '@/lib/dates'
import { isPastDay } from '@/lib/days'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FaculdadeCalendarPageProps {
  planner: UsePlannerReturn
  month: string
  onMonthChange: (month: string) => void
}

function monthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Calendário da Faculdade (mudança radical: app só-faculdade por hora) — só
 * o que tem a ver com disciplina: aulas agendadas, revisões (de Unidade e a
 * contínua de Hebraico), aulas ao vivo e entregas. Compacto igual ao Mês
 * geral (linhas baixas, largura contida, vários itens por linha).
 */
function itemsForDay(items: Item[], dayId: string): Item[] {
  return items.filter((it) => it.context === 'faculdade' && it.dayId === dayId).sort((a, b) => a.order - b.order)
}

/** Aula/revisão de dia passado ainda não feita — mesmo destaque de atenção usado no resto do app. */
function isOverdue(item: Item, dayId: string): boolean {
  return item.type === 'task' && !item.done && isPastDay(dayId)
}

function FaculdadeItemLine({ item, dayId, onToggle }: { item: Item; dayId: string; onToggle: () => void }) {
  const overdue = isOverdue(item, dayId)
  return (
    <div className="flex max-w-[12rem] shrink-0 items-center gap-1 rounded px-0.5 leading-tight">
      <ItemGlyph
        type={item.type}
        done={item.done}
        delivery={item.isDelivery}
        onChange={onToggle}
        size="sm"
        className={overdue ? 'text-attention' : undefined}
      />
      <span className={cn('truncate text-[10px]', item.done && 'text-ink-faint line-through', overdue && !item.done && 'text-attention')}>
        {item.title}
      </span>
      {item.timeNote && <span className="shrink-0 font-mono text-[9px] text-ink-faint">{item.timeNote}</span>}
    </div>
  )
}

export function FaculdadeCalendarPage({ planner, month, onMonthChange }: FaculdadeCalendarPageProps) {
  const today = todayId()
  const dayCount = daysInMonthCount(month)
  const days = Array.from({ length: dayCount }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pb-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onMonthChange(addMonths(month, -1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês anterior">
          <ChevronLeft className="size-4" />
        </button>
        <h1 className="font-serif text-lg font-semibold">Calendário — {monthLabel(month)}</h1>
        <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês seguinte">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col rounded-sm border border-line bg-paper-raised/40">
        {days.map((dayId) => {
          const isToday = dayId === today
          const dayItems = itemsForDay(planner.items, dayId)
          const dayNum = Number(dayId.slice(-2))
          const pending = dayItems.some((it) => isOverdue(it, dayId))
          const isSunday = weekdayIndexOf(dayId) === 0
          return (
            <div
              key={dayId}
              className={cn(
                'flex items-center gap-2 border-b border-line px-2 py-0.5 last:border-0',
                isSunday && !isToday && 'border-t-2 border-t-ink-dim/50 bg-paper-dim/40',
                isToday && 'bg-accent-soft/40',
                pending && 'border-l-2 border-l-attention',
              )}
            >
              <div className="flex w-10 shrink-0 items-baseline gap-1">
                <span className={cn('font-mono text-[11px]', isToday ? 'font-semibold text-accent' : pending ? 'text-attention' : 'text-ink-dim')}>
                  {dayNum}
                </span>
                <span className="font-mono text-[8px] uppercase text-ink-faint">{weekdayOf(dayId)}</span>
                {isSunday && <span className="font-mono text-[8px] text-ink-faint">{isoWeekOf(dayId).split('-W')[1]}</span>}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 py-0.5">
                {dayItems.length === 0 ? (
                  <span className="text-[10px] text-ink-faint">—</span>
                ) : (
                  dayItems.map((item) => (
                    <FaculdadeItemLine key={item.id} item={item} dayId={dayId} onToggle={() => planner.toggleDone(item.id)} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center font-mono text-[10px] text-ink-faint">
        agendar aulas, revisões, aulas ao vivo e entregas fica na aba Disciplinas
      </p>
    </div>
  )
}
