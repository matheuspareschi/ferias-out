import { DAYS, dayLabel, formatDayShort, isPastDay, todayId } from '@/lib/days'
import { cn } from '@/lib/utils'

interface DayTrailProps {
  anchorDayId: string
  onSelect: (dayId: string) => void
}

export function DayTrail({ anchorDayId, onSelect }: DayTrailProps) {
  const today = todayId()

  return (
    <nav
      aria-label="Trilha dos 19 dias da viagem"
      className="flex gap-1.5 overflow-x-auto px-1 py-1 -mx-1"
    >
      {DAYS.map((day) => {
        const isAnchor = day.id === anchorDayId
        const past = isPastDay(day.id, today)
        const isToday = day.id === today
        const label = dayLabel(day.id)

        return (
          <button
            key={day.id}
            type="button"
            onClick={() => onSelect(day.id)}
            aria-current={isAnchor ? 'date' : undefined}
            className={cn(
              'group relative flex shrink-0 flex-col items-center gap-0.5 rounded-md border px-2 py-1 transition-colors',
              'min-w-12',
              isAnchor
                ? 'border-rust bg-rust text-paper-raised shadow-card'
                : 'border-line bg-paper-raised/60 text-ink hover:border-line-strong hover:bg-paper-raised',
              past && !isAnchor && 'opacity-50',
            )}
          >
            {isToday && (
              <span
                className={cn(
                  'absolute -top-1 -right-1 size-1.5 rounded-full',
                  isAnchor ? 'bg-gold-soft' : 'bg-gold',
                )}
                aria-hidden
              />
            )}
            <span className="font-sans text-[10px] uppercase tracking-wide opacity-80">
              {day.weekday}
            </span>
            <span className="font-mono text-sm font-medium leading-none">
              {formatDayShort(day.id)}
            </span>
            {label && (
              <span
                className={cn(
                  'text-[9px] leading-none',
                  isAnchor ? 'text-paper-raised/80' : 'text-ink-faint',
                )}
              >
                {label}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
