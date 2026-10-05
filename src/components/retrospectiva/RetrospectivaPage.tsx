import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BlurSavedTextarea } from '@/components/BlurSavedField'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addMonths } from '@/lib/dates'

interface RetrospectivaPageProps {
  planner: UsePlannerReturn
  month: string
  onMonthChange: (month: string) => void
}

function monthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const fieldClass =
  'min-h-24 w-full resize-y rounded-sm border border-line bg-paper px-2 py-1.5 font-serif text-sm italic text-ink-dim outline-none focus:border-accent'

export function RetrospectivaPage({ planner, month, onMonthChange }: RetrospectivaPageProps) {
  const retro = planner.retrospectives[month] ?? { from: '', alive: '', wantToAppear: '' }

  const monthItems = planner.items.filter((it) => it.dayId?.startsWith(month))
  const habitsDone = monthItems.filter((it) => it.habit && it.done).length
  const tasksDone = monthItems.filter((it) => it.type === 'task' && !it.habit && it.done).length
  const tasksMigrated = monthItems.filter((it) => Boolean(it.migratedFrom)).length

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pb-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onMonthChange(addMonths(month, -1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês anterior">
          <ChevronLeft className="size-4" />
        </button>
        <h1 className="font-serif text-lg font-semibold">Retrospectiva — {monthLabel(month)}</h1>
        <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês seguinte">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex gap-4 rounded-sm border border-line bg-paper-raised/40 p-3 font-mono text-xs text-ink-dim">
        <span>hábitos cumpridos: <strong className="text-ink">{habitsDone}</strong></span>
        <span>tarefas feitas: <strong className="text-ink">{tasksDone}</strong></span>
        <span>tarefas migradas: <strong className="text-ink">{tasksMigrated}</strong></span>
      </div>

      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        De onde venho?
        <BlurSavedTextarea value={retro.from} onSave={(text) => planner.setRetrospective(month, { from: text })} className={fieldClass} />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        O que está vivo agora?
        <BlurSavedTextarea value={retro.alive} onSave={(text) => planner.setRetrospective(month, { alive: text })} className={fieldClass} />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        O que quero que apareça?
        <BlurSavedTextarea
          value={retro.wantToAppear}
          onSave={(text) => planner.setRetrospective(month, { wantToAppear: text })}
          className={fieldClass}
        />
      </label>
    </div>
  )
}
