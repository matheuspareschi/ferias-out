import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { ItemGlyph } from '@/components/ItemGlyph'
import { CleanupWizard } from '@/components/mes/CleanupWizard'
import { EditItemModal, type ModalState } from '@/components/planner/EditItemModal'
import { useItemActions } from '@/hooks/useItemActions'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addMonths, daysInMonthCount, isoWeekOf, todayId, weekdayIndexOf, weekdayOf } from '@/lib/dates'
import { isPastDay } from '@/lib/days'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MesPageProps {
  planner: UsePlannerReturn
  month: string
  onMonthChange: (month: string) => void
  onOpenRetrospectiva: (month: string) => void
  /** "Clicar em um dia passado abre-o na visão Hoje" (5.1). */
  onOpenDay: (dayId: string) => void
}

function monthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Mês enxuto (5.1): só compromissos de verdade (eventos) e ★ entregas — uma
 * linha por dia, sem listar tarefa simples nenhuma (isso fica pra visão
 * Hoje/Backlog). Inclui compromissos de vários dias (endDayId) que passam
 * por este. Hábitos nunca entram aqui — já têm página própria.
 */
function itemsForDay(items: Item[], dayId: string): Item[] {
  return items
    .filter(
      (it) =>
        (it.type === 'event' || it.isDelivery) &&
        it.dayId &&
        (it.dayId === dayId || (it.endDayId && it.dayId < dayId && dayId <= it.endDayId)),
    )
    .sort((a, b) => a.order - b.order)
}

/** Dia passado com tarefa simples ainda não concluída — destaque discreto, sem listar o quê (5.1). */
function hasPendingTasks(items: Item[], dayId: string): boolean {
  return items.some((it) => it.dayId === dayId && it.type === 'task' && !it.habit && !it.done)
}

/**
 * Sem estado de conclusão no Mês (5.1): só o nome e o horário, vinculados ao
 * dia — nunca ✕, nunca caixa de marcar, nunca risco no texto, mesmo pra uma
 * data já passada. O Mês é só pra ver o que está ligado a cada dia.
 */
function MonthItemLine({ item, onOpen }: { item: Item; onOpen: () => void }) {
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
      <ItemGlyph type={item.type} done={false} migrated={Boolean(item.migratedFrom)} delivery={item.isDelivery} interactive={false} onChange={() => {}} size="sm" />
      <span className="truncate text-[11px]">{item.title}</span>
      {item.timeNote && <span className="shrink-0 font-mono text-[9px] text-ink-faint">{item.timeNote}</span>}
    </div>
  )
}

export function MesPage({ planner, month, onMonthChange, onOpenRetrospectiva, onOpenDay }: MesPageProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const [cleanupOpen, setCleanupOpen] = useState(false)
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
          const pending = isPastDay(dayId) && hasPendingTasks(planner.items, dayId)
          // Domingo abre um bloco de semana novo (5.1): traço superior mais forte + tom discreto.
          const isSunday = weekdayIndexOf(dayId) === 0
          return (
            <div
              key={dayId}
              className={cn(
                'flex gap-2 border-b border-line px-2 py-1.5 last:border-0',
                isSunday && !isToday && 'border-t-2 border-t-ink-dim/50 bg-paper-dim/40',
                isToday && 'bg-accent-soft/40',
                pending && 'border-l-2 border-l-attention',
              )}
            >
              <button
                type="button"
                onClick={() => isPastDay(dayId) && onOpenDay(dayId)}
                disabled={!isPastDay(dayId)}
                className={cn('w-12 shrink-0 text-left', isPastDay(dayId) && 'cursor-pointer hover:underline')}
                title={pending ? 'tem pendentes' : undefined}
              >
                <p className={cn('font-mono text-xs', isToday ? 'font-semibold text-accent' : pending ? 'text-attention' : 'text-ink-dim')}>
                  {dayNum}
                  {isSunday && <span className="ml-1 font-mono text-[8px] text-ink-faint">{isoWeekOf(dayId).split('-W')[1]}</span>}
                </p>
                <p className="font-mono text-[9px] uppercase text-ink-faint">{weekdayOf(dayId)}</p>
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {dayItems.length === 0 ? (
                  <span className="text-[10px] text-ink-faint">—</span>
                ) : (
                  dayItems.map((item) => (
                    <MonthItemLine key={item.id} item={item} onOpen={() => setModal({ type: 'item', item })} />
                  ))
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
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

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCleanupOpen(true)}
          className="rounded-sm border border-line px-2 py-1 text-xs text-ink-dim hover:border-line-strong hover:text-ink"
        >
          revisar itens antigos…
        </button>
        <button
          type="button"
          onClick={() => onOpenRetrospectiva(month)}
          className="rounded-sm border border-line px-2 py-1 text-xs text-ink-dim hover:border-line-strong hover:text-ink"
        >
          ver retrospectiva de {monthLabel(month)} →
        </button>
      </div>

      {cleanupOpen && <CleanupWizard planner={planner} onClose={() => setCleanupOpen(false)} />}

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
