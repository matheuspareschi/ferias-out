import { useDraggable } from '@dnd-kit/core'
import { BookOpen, Flame, Footprints, PersonStanding, Search, type LucideIcon } from 'lucide-react'
import { draggableDragStyle, habitDndId } from '@/lib/dnd'
import { PERIOD_LABEL } from '@/lib/periods'
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
      {ordered.map((item) => (
        <HabitButton key={item.id} item={item} disabled={disabled} onToggle={() => onToggle(item.id)} />
      ))}
    </div>
  )
}

function HabitButton({
  item,
  disabled,
  onToggle,
}: {
  item: AgendaItem
  disabled?: boolean
  onToggle: () => void
}) {
  const habit = item.habit as HabitId
  const Icon = HABIT_ICON[habit]
  const dndId = habitDndId(item.id)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId,
    disabled,
    data: { dndId },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      title={
        item.period
          ? `${HABIT_LABEL[habit]} · ${PERIOD_LABEL[item.period]}`
          : `${HABIT_LABEL[habit]} — arraste para um período`
      }
      aria-label={HABIT_LABEL[habit]}
      disabled={disabled}
      onClick={onToggle}
      style={draggableDragStyle(transform, isDragging)}
      {...listeners}
      {...attributes}
      aria-pressed={item.done}
      className={cn(
        'relative flex size-7 select-none touch-manipulation items-center justify-center rounded-sm border transition-colors',
        !disabled && 'cursor-grab active:cursor-grabbing',
        item.done
          ? 'border-gold-dim bg-gold-soft text-gold'
          : 'border-line text-ink-faint hover:border-line-strong hover:text-ink-dim',
        disabled && 'pointer-events-none opacity-50',
        isDragging && 'z-30 opacity-85 shadow-lifted',
      )}
    >
      <Icon className="size-3.5" />
      {item.period && !item.done && (
        <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-clay" aria-hidden />
      )}
    </button>
  )
}
