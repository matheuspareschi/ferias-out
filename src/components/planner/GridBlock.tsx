import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ACCENT_STYLES } from '@/lib/categoryStyles'
import type { AccentColor } from '@/lib/types'
import {
  DEFAULT_DURATION,
  HOUR_HEIGHT,
  clampDuration,
  heightForDuration,
  snapMinutes,
  topForStart,
} from '@/lib/grid'
import { cn } from '@/lib/utils'

interface GridBlockProps {
  dndId: string
  title: string
  start: string
  duration: number | null
  done: boolean
  kind: AccentColor
  badge?: string
  disabled?: boolean
  onToggleDone: () => void
  onOpen: () => void
  onResize: (duration: number) => void
}

export function GridBlock({
  dndId,
  title,
  start,
  duration,
  done,
  kind,
  badge,
  disabled,
  onToggleDone,
  onOpen,
  onResize,
}: GridBlockProps) {
  const effectiveDuration = duration ?? DEFAULT_DURATION
  const [previewDuration, setPreviewDuration] = useState<number | null>(null)
  const resizingRef = useRef(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId,
    disabled,
    data: { dndId },
  })

  const top = topForStart(start)
  const height = Math.max(heightForDuration(previewDuration ?? effectiveDuration), 16)
  const styles = ACCENT_STYLES[kind]

  function handleResizeStart(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.preventDefault()
    if (disabled) return
    resizingRef.current = true
    const startY = e.clientY
    const startDuration = effectiveDuration

    function computeDuration(clientY: number) {
      const deltaMinutes = ((clientY - startY) / HOUR_HEIGHT) * 60
      return clampDuration(snapMinutes(startDuration + deltaMinutes))
    }

    function onMove(ev: PointerEvent) {
      setPreviewDuration(computeDuration(ev.clientY))
    }

    function onUp(ev: PointerEvent) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const finalDuration = computeDuration(ev.clientY)
      setPreviewDuration(null)
      resizingRef.current = false
      if (finalDuration !== startDuration) onResize(finalDuration)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const style = {
    top,
    height,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'absolute left-1 right-1 select-none touch-none overflow-hidden rounded-sm border border-l-4 px-2 py-1 text-left shadow-card',
        !disabled && 'cursor-grab active:cursor-grabbing',
        styles.bg,
        styles.border,
        styles.stripe,
        done && 'opacity-55',
        isDragging && 'z-30 opacity-85 shadow-lifted',
      )}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
    >
      <div className="flex items-start gap-1.5">
        <input
          type="checkbox"
          checked={done}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onChange={onToggleDone}
          className="mt-0.5 size-3 shrink-0 accent-rust"
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-[11px] font-medium leading-tight',
              styles.text,
              done && 'line-through',
            )}
          >
            {title}
          </p>
          <p className="font-mono text-[9px] text-ink-dim">
            {start}
            {badge ? ` · ${badge}` : ''}
          </p>
        </div>
      </div>
      {!disabled && (
        <div
          onPointerDown={handleResizeStart}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
          aria-hidden
        />
      )}
    </div>
  )
}
