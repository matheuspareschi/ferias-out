import { useEffect, useRef } from 'react'
import { daysAround, dayLabel, formatDayShort, isPastDay, todayId } from '@/lib/days'
import { cn } from '@/lib/utils'

interface DayTrailProps {
  anchorDayId: string
  onSelect: (dayId: string) => void
}

/** Quantos dias mostrar de cada lado da âncora — calendário sem fim, então a
 * trilha é sempre uma janela centrada nela, não a lista inteira. */
const TRAIL_RADIUS = 10

export function DayTrail({ anchorDayId, onSelect }: DayTrailProps) {
  const today = todayId()
  const days = daysAround(anchorDayId, TRAIL_RADIUS, TRAIL_RADIUS)
  const anchorRef = useRef<HTMLButtonElement>(null)

  // Garante que o dia âncora fique visível (ideal: centralizado) sempre que
  // ele mudar — sem isso, ao navegar perto da borda da janela renderizada a
  // pessoa perderia a referência visual de qual dia está selecionado.
  useEffect(() => {
    anchorRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [anchorDayId])

  return (
    <nav aria-label="Trilha de dias" className="flex gap-1.5 overflow-x-auto px-1 py-1 -mx-1">
      {days.map((day) => {
        const isAnchor = day.id === anchorDayId
        const past = isPastDay(day.id, today)
        const isToday = day.id === today
        const label = dayLabel(day.id)

        return (
          <button
            key={day.id}
            ref={isAnchor ? anchorRef : undefined}
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
