import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { DEFAULT_CONTEXT_ID } from '@/lib/contexts'
import { firstDayOfMonth, lastDayOfMonth } from '@/lib/dates'
import { monthWeeks } from '@/lib/habitGrid'
import type { Item, ItemType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AnoPageProps {
  planner: UsePlannerReturn
  onOpenMonth: (month: string) => void
}

function monthShortLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Compromissos do mês (5.2): só eventos e ★ entregas — mesma regra do Mês (5.1), sem tarefa simples nem hábito. */
function commitmentsForMonth(items: Item[], monthId: string): Item[] {
  const monthStart = firstDayOfMonth(monthId)
  const monthEnd = lastDayOfMonth(monthId)
  return items
    .filter((it) => (it.type === 'event' || it.isDelivery) && it.dayId && it.dayId <= monthEnd && (it.endDayId ?? it.dayId) >= monthStart)
    .sort((a, b) => (a.dayId! < b.dayId! ? -1 : a.dayId! > b.dayId! ? 1 : a.title.localeCompare(b.title)))
}

type Marker = 'star' | 'bar' | 'dot' | null

function markerForDay(monthCommitments: Item[], dayId: string): Marker {
  const dayItems = monthCommitments.filter((it) => it.dayId === dayId || (it.endDayId && it.dayId! < dayId && dayId <= it.endDayId))
  if (dayItems.length === 0) return null
  if (dayItems.some((it) => it.isDelivery)) return 'star'
  if (dayItems.some((it) => it.endDayId && it.endDayId !== it.dayId)) return 'bar'
  return 'dot'
}

function MarkerShape({ marker }: { marker: Marker }) {
  if (!marker) return <span className="block size-1" aria-hidden />
  if (marker === 'star') return <span className="text-[8px] leading-none text-attention">★</span>
  if (marker === 'bar') return <span className="block h-0.5 w-2.5 rounded-full bg-ink-dim" aria-hidden />
  return <span className="block size-1 rounded-full bg-ink-dim" aria-hidden />
}

/** "18 · Médico" ou "10–14 · Viagem" — dia(s) recortados dentro do mês da caixa. */
function commitmentLine(item: Item, monthId: string): string {
  const monthStart = firstDayOfMonth(monthId)
  const monthEnd = lastDayOfMonth(monthId)
  const start = item.dayId! < monthStart ? monthStart : item.dayId!
  const end = item.endDayId && item.endDayId > monthEnd ? monthEnd : (item.endDayId ?? start)
  const startNum = Number(start.slice(-2))
  const endNum = Number(end.slice(-2))
  const dayLabel = endNum !== startNum ? `${startNum}–${endNum}` : `${startNum}`
  return `${dayLabel} · ${item.title}`
}

export function AnoPage({ planner, onOpenMonth }: AnoPageProps) {
  const [year, setYear] = useState(Number(new Date().getFullYear()))
  const [quickAdd, setQuickAdd] = useState<string | null>(null)
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pb-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setYear((y) => y - 1)} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Ano anterior">
          <ChevronLeft className="size-4" />
        </button>
        <h1 className="font-serif text-lg font-semibold">{year}</h1>
        <button type="button" onClick={() => setYear((y) => y + 1)} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Ano seguinte">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map((monthId) => {
          const commitments = commitmentsForMonth(planner.items, monthId)
          return (
            <div key={monthId} className="flex flex-col gap-1 rounded-sm border border-line bg-paper-raised/40 p-2">
              <button type="button" onClick={() => onOpenMonth(monthId)} className="self-start text-xs font-semibold text-ink hover:text-accent">
                {monthShortLabel(monthId)}
              </button>
              <div className="flex flex-col gap-0.5">
                {monthWeeks(monthId).map((week, wi) => (
                  <div key={wi} className="flex gap-0.5">
                    {week.map((d, di) => (
                      <button
                        key={di}
                        type="button"
                        disabled={d === null}
                        onClick={() => d && setQuickAdd(d)}
                        className={cn(
                          'flex size-6 flex-col items-center justify-center rounded-sm text-[9px]',
                          d === null ? 'invisible' : 'text-ink-dim hover:bg-paper-dim hover:text-ink',
                        )}
                      >
                        <span>{d ? Number(d.slice(-2)) : ''}</span>
                        {d && <MarkerShape marker={markerForDay(commitments, d)} />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {commitments.length > 0 && (
                <div className="flex flex-col gap-0.5 border-t border-line pt-1">
                  {commitments.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenMonth(monthId)}
                      className="truncate text-left font-mono text-[10px] text-ink-dim hover:text-accent"
                      title={item.title}
                    >
                      {commitmentLine(item, monthId)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {quickAdd && (
        <QuickAddModal
          dayId={quickAdd}
          onClose={() => setQuickAdd(null)}
          onCreate={(data) => {
            planner.addItem({ ...data, order: Date.now() })
            setQuickAdd(null)
          }}
        />
      )}
    </div>
  )
}

function QuickAddModal({
  dayId,
  onClose,
  onCreate,
}: {
  dayId: string
  onClose: () => void
  onCreate: (data: { type: ItemType; title: string; context: string; dayId: string; endDayId?: string; timeNote?: string; period: null }) => void
}) {
  const [type, setType] = useState<ItemType>('event')
  const [title, setTitle] = useState('')
  const [start, setStart] = useState(dayId)
  const [end, setEnd] = useState(dayId)
  const [timeNote, setTimeNote] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({
      type,
      title: title.trim(),
      context: DEFAULT_CONTEXT_ID,
      dayId: start,
      endDayId: end && end !== start ? end : undefined,
      timeNote: timeNote.trim() || undefined,
      period: null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose} role="presentation">
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-md border border-line bg-paper-raised p-4 shadow-lifted"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-semibold">Novo compromisso</h3>
          <button type="button" onClick={onClose} className="text-ink-dim hover:text-ink" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-1.5">
          {(['task', 'event'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'flex-1 rounded-sm border px-2 py-1.5 text-xs',
                type === t ? 'border-ink bg-ink text-paper' : 'border-line text-ink-dim hover:border-line-strong',
              )}
            >
              {t === 'task' ? 'tarefa' : 'evento'}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Título
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs text-ink-dim">
            Data inicial
            <input
              value={start}
              onChange={(e) => {
                setStart(e.target.value)
                if (end < e.target.value) setEnd(e.target.value)
              }}
              type="date"
              className="rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-ink-dim">
            Data final (opcional)
            <input
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
              type="date"
              className="rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Horário (opcional)
          <input
            value={timeNote}
            onChange={(e) => setTimeNote(e.target.value)}
            placeholder="ex.: 14:00"
            className="rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <button type="submit" className="self-end rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-accent">
          criar
        </button>
      </form>
    </div>
  )
}
