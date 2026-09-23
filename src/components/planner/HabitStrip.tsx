import { BookOpen, Flame, Footprints, PersonStanding, Search, type LucideIcon } from 'lucide-react'
import type { AgendaItem, HabitId } from '@/lib/types'
import { cn } from '@/lib/utils'

const HABIT_ORDER: HabitId[] = ['devocional', 'alongamento', 'leitura', 'exercicio', 'revisao']

const HABIT_ICON: Record<HabitId, LucideIcon> = {
  devocional: Flame,
  alongamento: PersonStanding,
  leitura: BookOpen,
  exercicio: Footprints,
  revisao: Search,
}

const HABIT_LABEL: Record<HabitId, string> = {
  devocional: 'Devocional',
  alongamento: 'Alongamento',
  leitura: 'Leitura',
  exercicio: 'Exercício',
  revisao: 'Revisão da faculdade',
}

interface HabitStripProps {
  items: AgendaItem[]
  disabled?: boolean
  onToggle: (id: string) => void
}

export function HabitStrip({ items, disabled, onToggle }: HabitStripProps) {
  const byHabit = new Map(items.filter((it) => it.habit).map((it) => [it.habit as HabitId, it]))
  const ordered = HABIT_ORDER.map((h) => byHabit.get(h)).filter((it): it is AgendaItem => Boolean(it))

  if (ordered.length === 0) return null

  return (
    <div className="flex items-center gap-1 px-2.5 pb-2 pt-2">
      {ordered.map((item) => {
        const habit = item.habit as HabitId
        const Icon = HABIT_ICON[habit]
        return (
          <button
            key={item.id}
            type="button"
            title={HABIT_LABEL[habit]}
            aria-label={HABIT_LABEL[habit]}
            aria-pressed={item.done}
            disabled={disabled}
            onClick={() => onToggle(item.id)}
            className={cn(
              'flex size-7 items-center justify-center rounded-sm border transition-colors',
              item.done
                ? 'border-gold-dim bg-gold-soft text-gold'
                : 'border-line text-ink-faint hover:border-line-strong hover:text-ink-dim',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
