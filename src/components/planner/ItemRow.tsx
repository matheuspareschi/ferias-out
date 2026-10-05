import { useSortable } from '@dnd-kit/sortable'
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ItemGlyph } from '@/components/ItemGlyph'
import { itemDndId, sortableDragStyle, usePendingDnd } from '@/lib/dnd'
import { validateDateInput } from '@/lib/dates'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

export type MoveAction =
  | { kind: 'tomorrow' }
  | { kind: 'date'; dayId: string }
  | { kind: 'week' }
  | { kind: 'month' }
  | { kind: 'backlog' }
  | { kind: 'delete' }

interface ItemRowProps {
  item: Item
  disabled?: boolean
  overdue?: boolean
  /** Mostra "Pai › " antes do título — subtarefa longe da linha do pai. */
  parentTitle?: string
  /** Tarefa-pai: progresso das subtarefas + seta de recolher/expandir. */
  progress?: { done: number; total: number }
  collapsed?: boolean
  onToggleCollapsed?: () => void
  /** Sufixo discreto — hoje só o tamanho P/M/G de aulas da Faculdade. */
  sizeSuffix?: string
  onToggleDone: () => void
  onOpen: () => void
  onMove: (action: MoveAction) => void
}

export function ItemRow({
  item,
  disabled,
  overdue,
  parentTitle,
  progress,
  collapsed,
  onToggleCollapsed,
  sizeSuffix,
  onToggleDone,
  onOpen,
  onMove,
}: ItemRowProps) {
  const dndId = itemDndId(item.id)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dndId,
    disabled,
    data: { dndId },
  })
  const isPending = usePendingDnd(dndId)
  const isSubtask = Boolean(item.parentId)
  const meta = [item.timeNote, sizeSuffix].filter(Boolean).join(' · ')

  return (
    <div
      ref={setNodeRef}
      style={sortableDragStyle(transform, transition, isDragging)}
      {...attributes}
      {...listeners}
      className={cn(
        'group/row relative -mx-1 flex touch-manipulation select-none items-start gap-1.5 rounded px-1 py-0.5',
        !disabled && 'cursor-grab active:cursor-grabbing',
        isSubtask && 'ml-4',
        'hover:bg-paper-dim/70',
        isDragging && 'z-30 bg-paper-raised shadow-lifted',
        isPending && 'dnd-pending',
      )}
    >
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleCollapsed()
          }}
          className="mt-0.5 shrink-0 text-ink-faint hover:text-ink"
          aria-label={collapsed ? 'Expandir subtarefas' : 'Recolher subtarefas'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
      )}
      <ItemGlyph
        type={item.type}
        done={item.done}
        migrated={Boolean(item.migratedFrom)}
        subtask={isSubtask}
        delivery={item.isDelivery}
        onChange={onToggleDone}
        className={cn('mt-0.5', overdue && !item.done && 'text-attention')}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        className="min-w-0 flex-1 text-left"
      >
        <span className={cn('text-[13px] leading-snug', overdue && !item.done && 'text-attention')}>
          {parentTitle && <span className="text-ink-faint">{parentTitle} › </span>}
          <span className={cn(progress && 'font-semibold', item.done && 'text-ink-faint line-through')}>
            {item.title}
          </span>
          {progress && (
            <span className="ml-1 font-mono text-[10px] font-normal text-ink-faint">
              {progress.done}/{progress.total}
            </span>
          )}
          {meta && <span className="ml-1.5 font-mono text-[10px] font-normal text-ink-faint">{meta}</span>}
        </span>
      </button>
      <RowActionMenu onMove={onMove} />
    </div>
  )
}

function RowActionMenu({ onMove }: { onMove: (action: MoveAction) => void }) {
  const [open, setOpen] = useState(false)
  const [pickingDate, setPickingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setPickingDate(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function act(action: MoveAction) {
    onMove(action)
    setOpen(false)
    setPickingDate(false)
    setDateDraft('')
    setDateError(null)
  }

  /** 1.4: só move ao confirmar, nunca a cada tecla/dígito parcial do input nativo. */
  function confirmDate() {
    const valid = validateDateInput(dateDraft)
    if (!valid) {
      setDateError('data inválida')
      return
    }
    act({ kind: 'date', dayId: valid })
  }

  return (
    <div ref={ref} className="relative shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mais ações"
        className="rounded p-0.5 text-ink-faint opacity-100 transition-opacity hover:bg-paper-dim hover:text-ink sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-sm border border-line bg-paper-raised py-1 text-xs shadow-lifted">
          <button type="button" onClick={() => act({ kind: 'tomorrow' })} className="block w-full px-2 py-1 text-left hover:bg-paper-dim">
            amanhã
          </button>
          {pickingDate ? (
            <div className="flex flex-col gap-1 px-2 py-1">
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                type="date"
                autoFocus
                value={dateDraft}
                onChange={(e) => {
                  setDateDraft(e.target.value)
                  setDateError(null)
                }}
                className="w-full rounded-sm border border-line px-1 py-0.5 text-[11px]"
              />
              {dateError && <span className="font-mono text-[9px] text-attention">{dateError}</span>}
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPickingDate(false)
                    setDateDraft('')
                    setDateError(null)
                  }}
                  className="rounded-sm px-1.5 py-0.5 text-[10px] text-ink-faint hover:text-ink"
                >
                  cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDate}
                  className="rounded-sm bg-ink px-1.5 py-0.5 text-[10px] text-paper hover:bg-accent"
                >
                  mover
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPickingDate(true)
                setDateDraft('')
                setDateError(null)
              }}
              className="block w-full px-2 py-1 text-left hover:bg-paper-dim"
            >
              outro dia…
            </button>
          )}
          <button type="button" onClick={() => act({ kind: 'week' })} className="block w-full px-2 py-1 text-left hover:bg-paper-dim">
            backlog da semana
          </button>
          <button type="button" onClick={() => act({ kind: 'month' })} className="block w-full px-2 py-1 text-left hover:bg-paper-dim">
            backlog do mês
          </button>
          <button type="button" onClick={() => act({ kind: 'backlog' })} className="block w-full px-2 py-1 text-left hover:bg-paper-dim">
            sem período
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Excluir este item?')) act({ kind: 'delete' })
            }}
            className="block w-full px-2 py-1 text-left text-attention hover:bg-attention-soft"
          >
            excluir
          </button>
        </div>
      )}
    </div>
  )
}
