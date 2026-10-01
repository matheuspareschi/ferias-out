import { useState } from 'react'
import { ItemBullet } from '@/components/ItemBullet'
import { todayId } from '@/lib/dates'
import { formatDayShort, isPastDay } from '@/lib/days'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PendingReviewPanelProps {
  items: Item[]
  onMigrateToday: (id: string) => void
  onMigrateDate: (id: string, dayId: string) => void
  onBackToBacklog: (id: string) => void
  onDiscard: (id: string) => void
}

const actionButtonClass =
  'rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-ink-dim transition-colors hover:border-line-strong hover:text-ink'

/**
 * Painel de revisão matinal (1.5): tarefas de dias passados, não feitas, que
 * ainda não receberam uma decisão. Fechável, mas reaparece enquanto houver
 * algo pendente — nunca deixa um item esquecido sem uma ação registrada.
 */
export function PendingReviewPanel({
  items,
  onMigrateToday,
  onMigrateDate,
  onBackToBacklog,
  onDiscard,
}: PendingReviewPanelProps) {
  const [open, setOpen] = useState(true)
  const [dateDraftFor, setDateDraftFor] = useState<string | null>(null)

  const pending = items.filter(
    (it): it is Item & { dayId: string } =>
      it.type === 'task' && !it.habit && !it.done && Boolean(it.dayId) && isPastDay(it.dayId as string),
  )

  if (pending.length === 0) return null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-sm border border-rust-dim bg-rust-soft px-2 py-1 text-xs text-rust"
      >
        {pending.length} pendente{pending.length > 1 ? 's' : ''} de dias anteriores
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-rust-dim bg-rust-soft/40 p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-semibold text-ink">Pendentes de dias anteriores</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-dim hover:text-ink">
          fechar
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {pending.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-2 rounded-sm bg-paper-raised px-2 py-1.5"
          >
            <ItemBullet type={item.type} done={false} onChange={() => {}} className="pointer-events-none" />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.title}</span>
            <span className="font-mono text-[10px] text-ink-faint">{formatDayShort(item.dayId)}</span>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" onClick={() => onMigrateToday(item.id)} className={actionButtonClass}>
                hoje
              </button>
              {dateDraftFor === item.id ? (
                <input
                  type="date"
                  autoFocus
                  defaultValue={todayId()}
                  onBlur={() => setDateDraftFor(null)}
                  onChange={(e) => {
                    if (e.target.value) {
                      onMigrateDate(item.id, e.target.value)
                      setDateDraftFor(null)
                    }
                  }}
                  className={cn(actionButtonClass, 'px-1')}
                />
              ) : (
                <button type="button" onClick={() => setDateDraftFor(item.id)} className={actionButtonClass}>
                  escolher data
                </button>
              )}
              <button type="button" onClick={() => onBackToBacklog(item.id)} className={actionButtonClass}>
                backlog
              </button>
              <button
                type="button"
                onClick={() => onDiscard(item.id)}
                className={cn(actionButtonClass, 'border-rust-dim text-rust hover:border-rust')}
              >
                descartar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
