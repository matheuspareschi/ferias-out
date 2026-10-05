import { useState } from 'react'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { DAY_LABELS, formatDayShort } from '@/lib/days'
import { todayId } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface CleanupWizardProps {
  planner: UsePlannerReturn
  onClose: () => void
}

type ItemDecision = 'manter' | 'converter' | 'excluir'
type TagDecision = 'manter' | 'excluir'

const ITEM_OPTIONS: { value: ItemDecision; label: string }[] = [
  { value: 'manter', label: 'manter evento' },
  { value: 'converter', label: 'converter em tarefa' },
  { value: 'excluir', label: 'excluir' },
]
const TAG_OPTIONS: { value: TagDecision; label: string }[] = [
  { value: 'manter', label: 'manter' },
  { value: 'excluir', label: 'excluir' },
]

function RadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex shrink-0 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-sm border px-1.5 py-0.5 text-[10px]',
            value === opt.value ? 'border-accent bg-accent text-paper-raised' : 'border-line text-ink-dim hover:border-line-strong',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Limpeza única de legado (5.1): revisa todo item tipo evento e toda tag de
 * dia de DAY_LABELS, item por item, antes de aplicar qualquer mudança — com
 * backup obrigatório primeiro. Nada muda até "Aplicar" ser clicado; fechar
 * sem aplicar não altera nada.
 */
export function CleanupWizard({ planner, onClose }: CleanupWizardProps) {
  const eventItems = planner.items.filter((it) => it.type === 'event')
  const dayTags = Object.entries(DAY_LABELS).filter(([dayId]) => !planner.dismissedDayLabels.includes(dayId))

  const [itemDecisions, setItemDecisions] = useState<Record<string, ItemDecision>>({})
  const [tagDecisions, setTagDecisions] = useState<Record<string, TagDecision>>({})
  const [backedUp, setBackedUp] = useState(false)

  function handleBackup() {
    const json = JSON.stringify(planner.exportState(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roteiro-backup-pre-limpeza-${todayId()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackedUp(true)
  }

  function handleApply() {
    for (const item of eventItems) {
      const decision = itemDecisions[item.id] ?? 'manter'
      if (decision === 'excluir') planner.deleteItem(item.id)
      else if (decision === 'converter') planner.updateItem(item.id, { type: 'task', isDelivery: false })
    }
    for (const [dayId] of dayTags) {
      if ((tagDecisions[dayId] ?? 'manter') === 'excluir') planner.dismissDayLabel(dayId)
    }
    onClose()
  }

  const nothingToReview = eventItems.length === 0 && dayTags.length === 0

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col gap-3 overflow-hidden rounded-sm border border-line bg-paper-raised p-4 shadow-lifted"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="font-serif text-base font-semibold">Revisão de itens antigos</h2>
          <p className="text-xs text-ink-dim">
            Limpeza única (5.1): eventos e tags de dia que sobraram de versões antigas do app. Nada muda até você clicar em
            "Aplicar" — e só depois de baixar um backup.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {nothingToReview ? (
            <p className="py-6 text-center text-xs text-ink-faint">nada pra revisar — tudo já foi resolvido</p>
          ) : (
            <div className="flex flex-col gap-4">
              {eventItems.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="font-mono text-[9px] uppercase tracking-wide text-ink-faint">eventos</p>
                  {eventItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 border-b border-line/60 py-1">
                      <div className="min-w-0">
                        <p className="truncate text-xs">{item.title}</p>
                        <p className="font-mono text-[9px] text-ink-faint">{item.dayId ? formatDayShort(item.dayId) : 'sem dia'}</p>
                      </div>
                      <RadioGroup
                        options={ITEM_OPTIONS}
                        value={itemDecisions[item.id] ?? 'manter'}
                        onChange={(v) => setItemDecisions((prev) => ({ ...prev, [item.id]: v }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              {dayTags.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="font-mono text-[9px] uppercase tracking-wide text-ink-faint">tags de dia</p>
                  {dayTags.map(([dayId, label]) => (
                    <div key={dayId} className="flex items-center justify-between gap-2 border-b border-line/60 py-1">
                      <div className="min-w-0">
                        <p className="truncate text-xs">{label}</p>
                        <p className="font-mono text-[9px] text-ink-faint">{formatDayShort(dayId)}</p>
                      </div>
                      <RadioGroup
                        options={TAG_OPTIONS}
                        value={tagDecisions[dayId] ?? 'manter'}
                        onChange={(v) => setTagDecisions((prev) => ({ ...prev, [dayId]: v }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <button type="button" onClick={onClose} className="rounded-sm border border-line px-2 py-1 text-xs text-ink-dim hover:border-line-strong hover:text-ink">
            cancelar
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackup}
              className={cn(
                'rounded-sm border px-2 py-1 text-xs',
                backedUp ? 'border-done-dim text-done' : 'border-line text-ink-dim hover:border-line-strong hover:text-ink',
              )}
            >
              {backedUp ? 'backup feito ✓' : '1. fazer backup'}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!backedUp || nothingToReview}
              className="rounded-sm bg-ink px-2 py-1 text-xs text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              2. aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
