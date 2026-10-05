import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addDays, addMonths, daysInMonthCount, monthIdOf, todayId, weekdayIndexOf } from '@/lib/dates'
import { formatDayShort } from '@/lib/days'
import { HABIT_ICON, HABIT_LABEL, HABIT_ORDER } from '@/lib/habits'
import { monthWeeks, yearWeeks } from '@/lib/habitGrid'
import type { HabitId, Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface HabitosPageProps {
  planner: UsePlannerReturn
}

type ViewMode = 'mes' | 'ano' | 'porHabito' | 'resumo'

const VIEW_LABEL: Record<ViewMode, string> = { mes: 'Mês', ano: 'Ano', porHabito: 'Por hábito', resumo: 'Resumo' }
const sectionClass = 'flex flex-col gap-3 rounded-sm border border-line bg-paper-raised/40 p-3'

function monthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Item do hábito nesse dia, se existir — hábitos só viram Item nos dias em que o app foi aberto (2.?). */
function habitItemOn(items: Item[], habit: HabitId, dayId: string): Item | undefined {
  return items.find((it) => it.habit === habit && it.dayId === dayId)
}

export function HabitosPage({ planner }: HabitosPageProps) {
  const [view, setView] = useState<ViewMode>('mes')

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-lg font-semibold">Hábitos</h1>
        <div className="flex gap-1">
          {(Object.keys(VIEW_LABEL) as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'rounded-sm px-2 py-1 text-xs transition-colors',
                view === v ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-paper-dim hover:text-ink',
              )}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      </div>

      {view === 'mes' && <MesView items={planner.items} />}
      {view === 'ano' && <AnoView items={planner.items} />}
      {view === 'porHabito' && <PorHabitoView items={planner.items} />}
      {view === 'resumo' && <ResumoView items={planner.items} />}
    </div>
  )
}

/** Quadradinho de estado: feito / pendente (existe mas não feito) / sem dado (dia nunca aberto). */
function HabitCell({ state, title }: { state: 'done' | 'pending' | 'nodata'; title?: string }) {
  return (
    <div
      title={title}
      className={cn(
        'size-3 rounded-[2px]',
        state === 'done' && 'bg-done',
        state === 'pending' && 'border border-line',
        state === 'nodata' && 'bg-transparent',
      )}
    />
  )
}

function MesView({ items }: { items: Item[] }) {
  const [month, setMonth] = useState(monthIdOf(todayId()))
  const dayCount = daysInMonthCount(month)
  const days = Array.from({ length: dayCount }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
  const today = todayId()

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês anterior">
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="font-mono text-xs text-ink-dim">{monthLabel(month)}</span>
        <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês seguinte">
          <ChevronRight className="size-3.5" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-28" />
              {days.map((d) => (
                <th key={d} className={cn('w-4 pb-1 font-mono text-[9px] font-normal text-ink-faint', d === today && 'text-accent')}>
                  {d.slice(-2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HABIT_ORDER.map((habit) => {
              const Icon = HABIT_ICON[habit]
              return (
                <tr key={habit}>
                  <td className="whitespace-nowrap py-0.5 pr-2 text-ink-dim">
                    <span className="flex items-center gap-1">
                      <Icon className="size-3" /> {HABIT_LABEL[habit]}
                    </span>
                  </td>
                  {days.map((d) => {
                    const item = habitItemOn(items, habit, d)
                    return (
                      <td key={d} className="px-0.5 py-0.5">
                        <HabitCell state={item ? (item.done ? 'done' : 'pending') : 'nodata'} title={d} />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function HabitPicker({ value, onChange, includeAll }: { value: HabitId | 'todos'; onChange: (v: HabitId | 'todos') => void; includeAll?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {includeAll && (
        <button
          type="button"
          onClick={() => onChange('todos')}
          className={cn('rounded-sm px-2 py-1 text-xs', value === 'todos' ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-paper-dim')}
        >
          todos
        </button>
      )}
      {HABIT_ORDER.map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onChange(h)}
          className={cn('rounded-sm px-2 py-1 text-xs', value === h ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-paper-dim')}
        >
          {HABIT_LABEL[h]}
        </button>
      ))}
    </div>
  )
}

/** -1 = sem dado, 0 = nenhum feito, 1..5 = quantos hábitos feitos naquele dia. */
function intensityForDay(items: Item[], dayId: string, habit: HabitId | 'todos'): number {
  if (habit !== 'todos') {
    const item = habitItemOn(items, habit, dayId)
    return item ? (item.done ? 1 : 0) : -1
  }
  const dayHabits = items.filter((it) => it.dayId === dayId && it.habit)
  if (dayHabits.length === 0) return -1
  return dayHabits.filter((it) => it.done).length
}

function intensityClass(intensity: number, max: number): string {
  if (intensity < 0) return 'bg-transparent border border-line/60'
  if (intensity === 0) return 'border border-line'
  const ratio = intensity / max
  if (ratio >= 1) return 'bg-done'
  if (ratio >= 0.6) return 'bg-done/70'
  if (ratio >= 0.3) return 'bg-done/40'
  return 'bg-done/20'
}

function AnoView({ items }: { items: Item[] }) {
  const [year, setYear] = useState(Number(todayId().slice(0, 4)))
  const [habit, setHabit] = useState<HabitId | 'todos'>('todos')
  const weeks = yearWeeks(year)
  const max = habit === 'todos' ? HABIT_ORDER.length : 1

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setYear((y) => y - 1)} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Ano anterior">
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="font-mono text-xs text-ink-dim">{year}</span>
        <button type="button" onClick={() => setYear((y) => y + 1)} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Ano seguinte">
          <ChevronRight className="size-3.5" />
        </button>
      </div>
      <HabitPicker value={habit} onChange={setHabit} includeAll />
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((d, di) => (
              <div
                key={di}
                title={d ?? undefined}
                className={cn('size-2.5 rounded-[2px]', d === null ? 'opacity-0' : intensityClass(intensityForDay(items, d, habit), max))}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function PorHabitoView({ items }: { items: Item[] }) {
  const [habit, setHabit] = useState<HabitId>(HABIT_ORDER[0])
  const [year, setYear] = useState(Number(todayId().slice(0, 4)))
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setYear((y) => y - 1)} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Ano anterior">
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="font-mono text-xs text-ink-dim">{year}</span>
        <button type="button" onClick={() => setYear((y) => y + 1)} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Ano seguinte">
          <ChevronRight className="size-3.5" />
        </button>
      </div>
      <HabitPicker value={habit} onChange={(v) => v !== 'todos' && setHabit(v)} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((monthId) => (
          <div key={monthId} className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">{monthLabel(monthId)}</p>
            <div className="flex flex-col gap-0.5">
              {monthWeeks(monthId).map((week, wi) => (
                <div key={wi} className="flex gap-0.5">
                  {week.map((d, di) => (
                    <HabitCell
                      key={di}
                      title={d ?? undefined}
                      state={d === null ? 'nodata' : (() => {
                        const item = habitItemOn(items, habit, d)
                        return item ? (item.done ? 'done' : 'pending') : 'nodata'
                      })()}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ResumoView({ items }: { items: Item[] }) {
  const today = todayId()
  const weekStart = addDays(today, -weekdayIndexOf(today))
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const month = monthIdOf(today)
  const monthDays = Array.from({ length: daysInMonthCount(month) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)

  function countDone(habit: HabitId, days: string[]): number {
    return days.filter((d) => habitItemOn(items, habit, d)?.done).length
  }

  return (
    <section className={sectionClass}>
      <p className="font-mono text-[10px] text-ink-faint">
        semana de {formatDayShort(weekStart)} a {formatDayShort(weekDays[6])} · mês atual
      </p>
      <table className="border-collapse text-xs">
        <thead>
          <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
            <th className="py-1 pr-3 font-normal">Hábito</th>
            <th className="px-3 py-1 font-normal">Esta semana</th>
            <th className="px-3 py-1 font-normal">Este mês</th>
          </tr>
        </thead>
        <tbody>
          {HABIT_ORDER.map((habit) => {
            const Icon = HABIT_ICON[habit]
            return (
              <tr key={habit} className="border-b border-line/60 last:border-0">
                <td className="py-1.5 pr-3">
                  <span className="flex items-center gap-1.5 text-ink-dim">
                    <Icon className="size-3" /> {HABIT_LABEL[habit]}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-mono">{countDone(habit, weekDays)}/7</td>
                <td className="px-3 py-1.5 font-mono">
                  {countDone(habit, monthDays)}/{monthDays.length}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
