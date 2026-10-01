import { useSortable } from '@dnd-kit/sortable'
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ItemGlyph } from '@/components/ItemGlyph'
import { itemDndId, sortableDragStyle, usePendingDnd } from '@/lib/dnd'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

export type MoveAction = { kind: 'tomorrow' } | { kind: 'date'; dayId: string } | { kind: 'backlog' } | { kind: 'delete' }

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
            <input
              type="date"
              autoFocus
              onChange={(e) => {
                if (e.target.value) act({ kind: 'date', dayId: e.target.value })
              }}
              onBlur={() => setPickingDate(false)}
              className="mx-2 my-1 w-[calc(100%-1rem)] rounded-sm border border-line px-1 py-0.5 text-[11px]"
            />
          ) : (
            <button type="button" onClick={() => setPickingDate(true)} className="block w-full px-2 py-1 text-left hover:bg-paper-dim">
              outro dia…
            </button>
          )}
          <button type="button" onClick={() => act({ kind: 'backlog' })} className="block w-full px-2 py-1 text-left hover:bg-paper-dim">
            voltar ao backlog
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
