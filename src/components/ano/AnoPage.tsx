import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { DEFAULT_CONTEXT_ID } from '@/lib/contexts'
import { firstDayOfMonth, lastDayOfMonth } from '@/lib/dates'
import { isPastDay } from '@/lib/days'
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

/**
 * Compromissos lançados nesta visão (5.2) — só itens com `origem: 'ano'`.
 * Eventos criados no dia/Mês, vindos do Google e entregas da Faculdade não
 * entram aqui, mesmo que caiam neste mês.
 */
function commitmentsForMonth(items: Item[], monthId: string): Item[] {
  const monthStart = firstDayOfMonth(monthId)
  const monthEnd = lastDayOfMonth(monthId)
  return items
    .filter((it) => it.origem === 'ano' && it.dayId && it.dayId <= monthEnd && (it.endDayId ?? it.dayId) >= monthStart)
    .sort((a, b) => (a.dayId! < b.dayId! ? -1 : a.dayId! > b.dayId! ? 1 : a.title.localeCompare(b.title)))
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
  const [modalState, setModalState] = useState<{ item?: Item; initialDayId: string } | null>(null)
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
            <div key={monthId} className="flex flex-col gap-1.5 rounded-sm border border-line bg-paper-raised/40 p-2">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => onOpenMonth(monthId)} className="text-xs font-semibold text-ink hover:text-accent">
                  {monthShortLabel(monthId)}
                </button>
                <button
                  type="button"
                  onClick={() => setModalState({ initialDayId: firstDayOfMonth(monthId) })}
                  className="rounded-sm p-0.5 text-ink-faint hover:bg-paper-dim hover:text-ink"
                  aria-label={`Lançar compromisso em ${monthShortLabel(monthId)}`}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              {commitments.length === 0 ? (
                <span className="font-mono text-[10px] text-ink-faint">—</span>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {commitments.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setModalState({ item, initialDayId: item.dayId! })}
                      className={cn(
                        'truncate text-left font-mono text-[11px] text-ink-dim hover:text-accent',
                        isPastDay(item.dayId!) && 'opacity-50',
                      )}
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

      {modalState && (
        <AnoItemModal
          item={modalState.item}
          initialDayId={modalState.initialDayId}
          onClose={() => setModalState(null)}
          onSave={(data) => {
            if (modalState.item) planner.updateItem(modalState.item.id, data)
            else planner.addItem({ ...data, order: Date.now(), origem: 'ano' })
            setModalState(null)
          }}
          onDelete={
            modalState.item
              ? () => {
                  planner.deleteItem(modalState.item!.id)
                  setModalState(null)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function AnoItemModal({
  item,
  initialDayId,
  onClose,
  onSave,
  onDelete,
}: {
  item?: Item
  initialDayId: string
  onClose: () => void
  onSave: (data: { type: ItemType; title: string; context: string; dayId: string; endDayId?: string; timeNote?: string; period: null }) => void
  onDelete?: () => void
}) {
  const [type, setType] = useState<ItemType>(item?.type ?? 'event')
  const [title, setTitle] = useState(item?.title ?? '')
  const [start, setStart] = useState(item?.dayId ?? initialDayId)
  const [end, setEnd] = useState(item?.endDayId ?? item?.dayId ?? initialDayId)
  const [timeNote, setTimeNote] = useState(item?.timeNote ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      type,
      title: title.trim(),
      context: item?.context ?? DEFAULT_CONTEXT_ID,
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
          <h3 className="font-serif text-base font-semibold">{item ? 'Editar compromisso' : 'Novo compromisso'}</h3>
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

        <div className="flex items-center justify-between">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Excluir este compromisso?')) onDelete()
              }}
              className="rounded-sm px-2 py-1.5 text-xs text-attention hover:bg-attention-soft"
            >
              excluir
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-accent">
            {item ? 'salvar' : 'criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
