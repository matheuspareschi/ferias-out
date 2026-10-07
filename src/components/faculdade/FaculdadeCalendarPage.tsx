import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { ItemGlyph } from '@/components/ItemGlyph'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addMonths, todayId } from '@/lib/dates'
import { isPastDay } from '@/lib/days'
import { monthWeeks } from '@/lib/habitGrid'
import type { Item, ItemSize } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FaculdadeCalendarPageProps {
  planner: UsePlannerReturn
  month: string
  onMonthChange: (month: string) => void
}

const WEEKDAY_HEADERS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const SIZES: ItemSize[] = ['P', 'M', 'G']

function monthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatFullDate(dayId: string): string {
  const [y, m, d] = dayId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
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

/** Aula/revisão agendadas podem voltar a "sem data" — o resto (entrega, aula ao vivo, revisão contínua) não tem esse estado. */
function canUnschedule(item: Item): boolean {
  return item.unitRole === 'aula' || item.unitRole === 'revisao'
}

function FaculdadeItemLine({ item, dayId, onToggle, onUnschedule }: { item: Item; dayId: string; onToggle: () => void; onUnschedule: () => void }) {
  const overdue = isOverdue(item, dayId)
  return (
    <div className="flex w-full items-start gap-1 rounded px-0.5 leading-tight">
      <ItemGlyph
        type={item.type}
        done={item.done}
        delivery={item.isDelivery}
        review={item.unitRole === 'revisao' || item.unitRole === 'revisao_continua'}
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
      {canUnschedule(item) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onUnschedule()
          }}
          className="shrink-0 text-ink-faint hover:text-attention"
          aria-label={`Cancelar agendamento de ${item.title}`}
          title="Cancelar agendamento"
        >
          <X className="size-2.5" />
        </button>
      )}
    </div>
  )
}

function DayCell({
  dayId,
  today,
  planner,
  onOpenPicker,
}: {
  dayId: string | null
  today: string
  planner: UsePlannerReturn
  onOpenPicker: (dayId: string) => void
}) {
  if (!dayId) return <div className="min-h-24 bg-paper/50" />

  const isToday = dayId === today
  const dayItems = itemsForDay(planner.items, dayId)
  const dayNum = Number(dayId.slice(-2))
  const pending = dayItems.some((it) => isOverdue(it, dayId))

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenPicker(dayId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpenPicker(dayId)
      }}
      className={cn(
        'flex min-h-24 cursor-pointer flex-col gap-0.5 bg-paper p-1 text-left hover:bg-paper-dim/60',
        isToday && 'bg-accent-soft/40',
        pending && 'ring-1 ring-inset ring-attention/60',
      )}
    >
      <span className={cn('font-mono text-[10px]', isToday ? 'font-semibold text-accent' : 'text-ink-dim')}>{dayNum}</span>
      <div className="flex flex-col gap-0.5">
        {dayItems.map((item) => (
          <FaculdadeItemLine
            key={item.id}
            item={item}
            dayId={dayId}
            onToggle={() => planner.toggleDone(item.id)}
            onUnschedule={() => planner.updateItem(item.id, { dayId: undefined, period: undefined })}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Agendar aula num dia (clicar no quadradinho): lista as aulas ainda não
 * feitas e sem data, agrupadas por tamanho P/M/G — clicar numa agenda ela
 * pro dia escolhido, e ela some dessa lista (ganhou data).
 */
function SchedulePickerModal({ planner, dayId, onClose }: { planner: UsePlannerReturn; dayId: string; onClose: () => void }) {
  const pending = planner.items.filter((it) => it.unitRole === 'aula' && !it.dayId && !it.done)

  function schedule(item: Item) {
    planner.updateItem(item.id, { dayId, period: null })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-sm border border-line bg-paper-raised p-4 shadow-lifted"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-base font-semibold">Agendar aula — {formatFullDate(dayId)}</h2>
          <button type="button" onClick={onClose} className="shrink-0 text-ink-faint hover:text-ink" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>

        {pending.length === 0 ? (
          <p className="font-mono text-[10px] text-ink-faint">nenhuma aula pendente — todas já foram feitas ou já têm data</p>
        ) : (
          SIZES.map((size) => {
            const sizeItems = pending.filter((it) => it.size === size)
            if (sizeItems.length === 0) return null
            return (
              <div key={size} className="flex flex-col gap-1">
                <h3 className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Tamanho {size}</h3>
                <div className="flex flex-col gap-0.5">
                  {sizeItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => schedule(item)}
                      className="rounded-sm border border-line px-2 py-1.5 text-left text-xs text-ink-dim hover:border-accent hover:bg-paper-dim hover:text-ink"
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export function FaculdadeCalendarPage({ planner, month, onMonthChange }: FaculdadeCalendarPageProps) {
  const today = todayId()
  const weeks = monthWeeks(month)
  const [pickerDayId, setPickerDayId] = useState<string | null>(null)

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

      <div className="mx-auto w-full max-w-4xl rounded-sm border border-line">
        <div className="grid grid-cols-7 gap-px bg-line">
          {WEEKDAY_HEADERS.map((w) => (
            <div key={w} className="bg-paper-raised px-1 py-1 text-center font-mono text-[9px] uppercase tracking-wide text-ink-faint">
              {w}
            </div>
          ))}
          {weeks.flatMap((week, wi) =>
            week.map((dayId, di) => (
              <DayCell key={dayId ?? `pad-${wi}-${di}`} dayId={dayId} today={today} planner={planner} onOpenPicker={setPickerDayId} />
            )),
          )}
        </div>
      </div>

      <p className="text-center font-mono text-[10px] text-ink-faint">
        clique num dia pra agendar uma aula · revisões, aulas ao vivo e entregas ficam na aba Disciplinas
      </p>

      {pickerDayId && <SchedulePickerModal planner={planner} dayId={pickerDayId} onClose={() => setPickerDayId(null)} />}
    </div>
  )
}
