import { CalendarPlus, CalendarRange, Inbox, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ItemGlyph } from '@/components/ItemGlyph'
import { PERIOD_LABEL, PERIOD_ORDER } from '@/lib/periods'
import type { Context, Item, ItemSize, ItemType, PeriodId } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { MoveAction } from './ItemRow'

export type ModalState = { type: 'item'; item: Item } | { type: 'new'; dayId: string } | null

export interface ItemFormData {
  type: ItemType
  title: string
  context: string
  size?: ItemSize
  dayId?: string
  period: PeriodId | null
  timeNote?: string
}

interface EditItemModalProps {
  state: ModalState
  /** Lista completa — pra achar as subtarefas do item em edição. */
  items: Item[]
  contexts: Context[]
  onClose: () => void
  onSave: (id: string | null, data: ItemFormData) => void
  onDelete: (id: string) => void
  onAddContext: (label: string) => string
  onMove: (item: Item, action: MoveAction) => void
  onToggleItemDone: (id: string) => void
  onAddSubtask: (parentId: string, title: string) => void
}

const inputClass =
  'rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-accent'
const NEW_CONTEXT_VALUE = '__new__'

export function EditItemModal({
  state,
  items,
  contexts,
  onClose,
  onSave,
  onDelete,
  onAddContext,
  onMove,
  onToggleItemDone,
  onAddSubtask,
}: EditItemModalProps) {
  if (!state) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-md border border-line bg-paper-raised p-4 shadow-lifted"
        onClick={(e) => e.stopPropagation()}
      >
        <ItemForm
          key={state.type === 'item' ? state.item.id : `new-${state.dayId}`}
          item={state.type === 'item' ? state.item : null}
          dayId={state.type === 'item' ? state.item.dayId : state.dayId}
          items={items}
          contexts={contexts}
          onSave={onSave}
          onDelete={onDelete}
          onAddContext={onAddContext}
          onMove={onMove}
          onToggleItemDone={onToggleItemDone}
          onAddSubtask={onAddSubtask}
          onClose={onClose}
        />
      </div>
    </div>
  )
}

function PeriodPicker({
  value,
  onChange,
  allowNone = true,
}: {
  value: PeriodId | null
  onChange: (period: PeriodId | null) => void
  allowNone?: boolean
}) {
  return (
    <div className="flex gap-1.5">
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            'rounded-sm border px-2 py-1 text-xs',
            value === null ? 'border-ink bg-ink text-paper' : 'border-line text-ink-dim hover:border-line-strong',
          )}
        >
          sem período
        </button>
      )}
      {PERIOD_ORDER.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'flex-1 rounded-sm border px-2 py-1 text-xs capitalize',
            value === p ? 'border-ink bg-ink text-paper' : 'border-line text-ink-dim hover:border-line-strong',
          )}
        >
          {PERIOD_LABEL[p]}
        </button>
      ))}
    </div>
  )
}

function ItemForm({
  item,
  dayId,
  items,
  contexts,
  onSave,
  onDelete,
  onAddContext,
  onMove,
  onToggleItemDone,
  onAddSubtask,
  onClose,
}: {
  item: Item | null
  dayId: string | undefined
  items: Item[]
  contexts: Context[]
  onSave: EditItemModalProps['onSave']
  onDelete: EditItemModalProps['onDelete']
  onAddContext: EditItemModalProps['onAddContext']
  onMove: EditItemModalProps['onMove']
  onToggleItemDone: EditItemModalProps['onToggleItemDone']
  onAddSubtask: EditItemModalProps['onAddSubtask']
  onClose: () => void
}) {
  const [type, setType] = useState<ItemType>(item?.type ?? 'task')
  const [title, setTitle] = useState(item?.title ?? '')
  const [context, setContext] = useState(item?.context ?? contexts[0]?.id ?? '')
  const [newContextLabel, setNewContextLabel] = useState('')
  const [size, setSize] = useState<ItemSize | undefined>(item?.size)
  const [period, setPeriod] = useState<PeriodId | null>(item?.period ?? null)
  const [timeNote, setTimeNote] = useState(item?.timeNote ?? '')
  const [currentDayId] = useState(dayId)
  const [newSubtask, setNewSubtask] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pickingDate, setPickingDate] = useState(false)
  const isFaculdade = context === 'faculdade'

  const children = item ? items.filter((it) => it.parentId === item.id).sort((a, b) => a.order - b.order) : []
  const parent = item?.parentId ? items.find((it) => it.id === item.parentId) : undefined

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const finalContext = context === NEW_CONTEXT_VALUE ? onAddContext(newContextLabel) : context
    onSave(item?.id ?? null, {
      type,
      title: title.trim(),
      context: finalContext || contexts[0]?.id || '',
      size: isFaculdade ? size : undefined,
      dayId: currentDayId,
      period: currentDayId ? period : null,
      timeNote: timeNote.trim() || undefined,
    })
    onClose()
  }

  function handleAddSubtask() {
    const trimmed = newSubtask.trim()
    if (!trimmed || !item) return
    onAddSubtask(item.id, trimmed)
    setNewSubtask('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold">{item ? 'Editar item' : 'Novo item'}</h3>
        <button type="button" onClick={onClose} className="text-ink-dim hover:text-ink" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>

      {parent && <p className="text-xs text-ink-faint">{parent.title} › subtarefa</p>}

      <div className="flex gap-1.5">
        {(['task', 'event'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-sm border px-2 py-1.5 text-xs',
              type === t ? 'border-ink bg-ink text-paper' : 'border-line text-ink-dim hover:border-line-strong',
            )}
          >
            <ItemGlyph type={t} done={false} onChange={() => {}} interactive={false} />
            {t === 'task' ? 'tarefa' : 'evento'}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        Título
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-ink-dim">
          Contexto
          <select value={context} onChange={(e) => setContext(e.target.value)} className={inputClass}>
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            <option value={NEW_CONTEXT_VALUE}>+ novo contexto…</option>
          </select>
        </label>
        {isFaculdade && (
          <div className="flex flex-col gap-1 text-xs text-ink-dim">
            Tamanho
            <div className="flex gap-1">
              {(['P', 'M', 'G'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize((v) => (v === s ? undefined : s))}
                  className={cn(
                    'size-8 rounded-sm border font-mono text-xs',
                    size === s ? 'border-accent bg-accent text-paper-raised' : 'border-line text-ink-dim hover:border-line-strong',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {context === NEW_CONTEXT_VALUE && (
        <input
          value={newContextLabel}
          onChange={(e) => setNewContextLabel(e.target.value)}
          placeholder="Nome do novo contexto"
          className={inputClass}
        />
      )}

      {currentDayId && (
        <div className="flex flex-col gap-1 text-xs text-ink-dim">
          Período
          <PeriodPicker value={period} onChange={setPeriod} />
        </div>
      )}

      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        Observação de horário (opcional)
        <input
          value={timeNote}
          onChange={(e) => setTimeNote(e.target.value)}
          placeholder="ex.: 17:00 ou 9:00–11:00"
          className={inputClass}
        />
      </label>

      {item && !item.parentId && (
        <div className="flex flex-col gap-1.5 text-xs text-ink-dim">
          Subtarefas
          {children.length > 0 && (
            <ul className="flex flex-col gap-1">
              {children.map((child) => (
                <li key={child.id} className="flex items-center gap-1.5">
                  <ItemGlyph type="task" done={child.done} subtask onChange={() => onToggleItemDone(child.id)} size="sm" />
                  <span className={cn('flex-1 truncate text-ink', child.done && 'text-ink-faint line-through')}>
                    {child.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(child.id)}
                    className="text-ink-faint hover:text-attention"
                    aria-label="Remover subtarefa"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-1">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSubtask()
                }
              }}
              placeholder="adicionar subtarefa…"
              disabled={!item}
              className={cn(inputClass, 'flex-1')}
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              disabled={!item}
              className="flex shrink-0 items-center justify-center rounded-sm border border-line px-2 text-ink-dim hover:border-line-strong disabled:opacity-40"
              aria-label="Adicionar subtarefa"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {item && (
        <div className="flex flex-col gap-1.5 rounded-sm border border-line bg-paper p-2">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">Mover</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                onMove(item, { kind: 'tomorrow' })
                onClose()
              }}
              className="flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink-dim hover:border-line-strong"
            >
              <CalendarPlus className="size-3" /> amanhã
            </button>
            {pickingDate ? (
              <input
                type="date"
                autoFocus
                onChange={(e) => {
                  if (e.target.value) {
                    onMove(item, { kind: 'date', dayId: e.target.value })
                    onClose()
                  }
                }}
                onBlur={() => setPickingDate(false)}
                className="rounded-sm border border-line px-2 py-1 text-xs"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPickingDate(true)}
                className="rounded-sm border border-line px-2 py-1 text-xs text-ink-dim hover:border-line-strong"
              >
                outro dia…
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onMove(item, { kind: 'week' })
                onClose()
              }}
              className="flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink-dim hover:border-line-strong"
            >
              <CalendarRange className="size-3" /> backlog da semana
            </button>
            <button
              type="button"
              onClick={() => {
                onMove(item, { kind: 'month' })
                onClose()
              }}
              className="flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink-dim hover:border-line-strong"
            >
              <CalendarRange className="size-3" /> backlog do mês
            </button>
            <button
              type="button"
              onClick={() => {
                onMove(item, { kind: 'backlog' })
                onClose()
              }}
              className="flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink-dim hover:border-line-strong"
            >
              <Inbox className="size-3" /> sem período
            </button>
          </div>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        {item ? (
          confirmDelete ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-ink-dim">excluir mesmo?</span>
              <button
                type="button"
                onClick={() => {
                  onDelete(item.id)
                  onClose()
                }}
                className="text-attention hover:underline"
              >
                sim
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-ink-dim hover:underline">
                não
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-xs text-attention hover:underline"
            >
              <Trash2 className="size-3.5" /> excluir
            </button>
          )
        ) : (
          <span />
        )}
        <button type="submit" className="rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-accent">
          salvar
        </button>
      </div>
    </form>
  )
}
