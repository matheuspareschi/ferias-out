import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ItemGlyph } from '@/components/ItemGlyph'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addMonths, todayId } from '@/lib/dates'
import { isPastDay } from '@/lib/days'
import { monthWeeks } from '@/lib/habitGrid'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FaculdadeCalendarPageProps {
  planner: UsePlannerReturn
  month: string
  onMonthChange: (month: string) => void
}

const WEEKDAY_HEADERS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function monthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Calendário da Faculdade (mudança radical: app só-faculdade por hora) — só
 * o que tem a ver com disciplina: aulas agendadas, revisões (de Unidade e a
 * contínua de Hebraico), aulas ao vivo e entregas. Grade de verdade (dom–sáb,
 * um quadradinho por dia), não lista — o pedido explícito foi "calendário mesmo".
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
    <div className="flex w-full items-start gap-1 rounded px-0.5 leading-tight">
      <ItemGlyph
        type={item.type}
        done={item.done}
        delivery={item.isDelivery}
        onChange={onToggle}
        size="sm"
        className={cn('mt-px shrink-0', overdue && 'text-attention')}
      />
      <span
        title={item.title}
        className={cn('min-w-0 flex-1 truncate text-[9px]', item.done && 'text-ink-faint line-through', overdue && !item.done && 'text-attention')}
      >
        {item.title}
      </span>
    </div>
  )
}

function DayCell({ dayId, today, planner }: { dayId: string | null; today: string; planner: UsePlannerReturn }) {
  if (!dayId) return <div className="min-h-24 bg-paper/50" />

  const isToday = dayId === today
  const dayItems = itemsForDay(planner.items, dayId)
  const dayNum = Number(dayId.slice(-2))
  const pending = dayItems.some((it) => isOverdue(it, dayId))

  return (
    <div
      className={cn(
        'flex min-h-24 flex-col gap-0.5 bg-paper p-1',
        isToday && 'bg-accent-soft/40',
        pending && 'ring-1 ring-inset ring-attention/60',
      )}
    >
      <span className={cn('font-mono text-[10px]', isToday ? 'font-semibold text-accent' : 'text-ink-dim')}>{dayNum}</span>
      <div className="flex flex-col gap-0.5">
        {dayItems.map((item) => (
          <FaculdadeItemLine key={item.id} item={item} dayId={dayId} onToggle={() => planner.toggleDone(item.id)} />
        ))}
      </div>
    </div>
  )
}

export function FaculdadeCalendarPage({ planner, month, onMonthChange }: FaculdadeCalendarPageProps) {
  const today = todayId()
  const weeks = monthWeeks(month)

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

      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-sm border border-line">
        <div className="grid grid-cols-7 gap-px bg-line">
          {WEEKDAY_HEADERS.map((w) => (
            <div key={w} className="bg-paper-raised px-1 py-1 text-center font-mono text-[9px] uppercase tracking-wide text-ink-faint">
              {w}
            </div>
          ))}
          {weeks.flatMap((week, wi) => week.map((dayId, di) => <DayCell key={dayId ?? `pad-${wi}-${di}`} dayId={dayId} today={today} planner={planner} />))}
        </div>
      </div>

      <p className="text-center font-mono text-[10px] text-ink-faint">
        agendar aulas, revisões, aulas ao vivo e entregas fica na aba Disciplinas
      </p>
    </div>
  )
}
