import { Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ItemBullet } from '@/components/ItemBullet'
import { ACCENT_OPTIONS, ACCENT_STYLES } from '@/lib/categoryStyles'
import { formatDayShort } from '@/lib/days'
import { PERIOD_LABEL, PERIOD_ORDER } from '@/lib/periods'
import type { AccentColor, Context, Item, ItemSize, ItemType, PeriodId, Subitem } from '@/lib/types'
import { cn } from '@/lib/utils'

export type ModalState = { type: 'item'; item: Item } | { type: 'new'; dayId: string } | null

export interface ItemFormData {
  type: ItemType
  title: string
  context: string
  size?: ItemSize
  dayId?: string
  period: PeriodId | null
  timeNote?: string
  color: AccentColor
  subitems?: Subitem[]
}

interface EditItemModalProps {
  state: ModalState
  contexts: Context[]
  onClose: () => void
  onSave: (id: string | null, data: ItemFormData) => void
  onDelete: (id: string) => void
  onAddContext: (label: string) => string
}

const inputClass =
  'rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-rust'
const NEW_CONTEXT_VALUE = '__new__'

export function EditItemModal({ state, contexts, onClose, onSave, onDelete, onAddContext }: EditItemModalProps) {
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
          contexts={contexts}
          onSave={onSave}
          onDelete={onDelete}
          onAddContext={onAddContext}
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
            value === null
              ? 'border-ink bg-ink text-paper'
              : 'border-line text-ink-dim hover:border-line-strong',
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
  contexts,
  onSave,
  onDelete,
  onAddContext,
  onClose,
}: {
  item: Item | null
  dayId: string | undefined
  contexts: Context[]
  onSave: EditItemModalProps['onSave']
  onDelete: EditItemModalProps['onDelete']
  onAddContext: EditItemModalProps['onAddContext']
  onClose: () => void
}) {
  const [type, setType] = useState<ItemType>(item?.type ?? 'task')
  const [title, setTitle] = useState(item?.title ?? '')
  const [context, setContext] = useState(item?.context ?? contexts[0]?.id ?? '')
  const [newContextLabel, setNewContextLabel] = useState('')
  const [size, setSize] = useState<ItemSize | undefined>(item?.size)
  const [period, setPeriod] = useState<PeriodId | null>(item?.period ?? null)
  const [timeNote, setTimeNote] = useState(item?.timeNote ?? '')
  const [color, setColor] = useState<AccentColor>(item?.color ?? 'clay')
  const [subitems, setSubitems] = useState<Subitem[]>(item?.subitems ?? [])
  const [newSubitem, setNewSubitem] = useState('')
  const [currentDayId, setCurrentDayId] = useState(dayId)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const finalContext = context === NEW_CONTEXT_VALUE ? onAddContext(newContextLabel) : context
    onSave(item?.id ?? null, {
      type,
      title: title.trim(),
      context: finalContext || contexts[0]?.id || '',
      size,
      dayId: currentDayId,
      period: currentDayId ? period : null,
      timeNote: timeNote.trim() || undefined,
      color,
      subitems: subitems.length > 0 ? subitems : undefined,
    })
    onClose()
  }

  function addSubitem() {
    const trimmed = newSubitem.trim()
    if (!trimmed) return
    setSubitems((prev) => [...prev, { id: `sub-${Date.now().toString(36)}`, title: trimmed, done: false }])
    setNewSubitem('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold">{item ? 'Editar item' : 'Novo item'}</h3>
        <button type="button" onClick={onClose} className="text-ink-dim hover:text-ink" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>
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
            <ItemBullet type={t} done={false} onChange={() => {}} className="pointer-events-none" />
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
          <select
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className={inputClass}
          >
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            <option value={NEW_CONTEXT_VALUE}>+ novo contexto…</option>
          </select>
        </label>
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
                  size === s ? 'border-rust bg-rust text-paper-raised' : 'border-line text-ink-dim hover:border-line-strong',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
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
        <div className="flex flex-col gap-2 rounded-sm border border-line bg-paper p-2">
          <div className="flex items-center justify-between text-xs text-ink-dim">
            <span>agendado em {formatDayShort(currentDayId)}</span>
            <button
              type="button"
              onClick={() => setCurrentDayId(undefined)}
              className="text-rust hover:underline"
            >
              voltar ao backlog
            </button>
          </div>
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

      <div className="flex flex-col gap-1 text-xs text-ink-dim">
        Cor
        <div className="flex gap-1.5">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              aria-label={opt.label}
              aria-pressed={color === opt.value}
              onClick={() => setColor(opt.value)}
              className={cn(
                'size-6 rounded-full border-2',
                ACCENT_STYLES[opt.value].bg,
                ACCENT_STYLES[opt.value].border,
                color === opt.value ? 'ring-2 ring-ink ring-offset-1 ring-offset-paper-raised' : '',
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-ink-dim">
        Checklist (opcional)
        {subitems.length > 0 && (
          <ul className="flex flex-col gap-1">
            {subitems.map((sub) => (
              <li key={sub.id} className="flex items-center gap-1.5">
                <ItemBullet
                  type="task"
                  done={sub.done}
                  onChange={() =>
                    setSubitems((prev) => prev.map((s) => (s.id === sub.id ? { ...s, done: !s.done } : s)))
                  }
                  size="sm"
                />
                <span className={cn('flex-1 truncate text-ink', sub.done && 'line-through opacity-60')}>
                  {sub.title}
                </span>
                <button
                  type="button"
                  onClick={() => setSubitems((prev) => prev.filter((s) => s.id !== sub.id))}
                  className="text-ink-faint hover:text-rust"
                  aria-label="Remover subitem"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-1">
          <input
            value={newSubitem}
            onChange={(e) => setNewSubitem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSubitem()
              }
            }}
            placeholder="adicionar subitem…"
            className={cn(inputClass, 'flex-1')}
          />
          <button
            type="button"
            onClick={addSubitem}
            className="flex shrink-0 items-center justify-center rounded-sm border border-line px-2 text-ink-dim hover:border-line-strong"
            aria-label="Adicionar subitem"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between">
        {item ? (
          <button
            type="button"
            onClick={() => {
              onDelete(item.id)
              onClose()
            }}
            className="flex items-center gap-1 text-xs text-rust hover:underline"
          >
            <Trash2 className="size-3.5" /> excluir
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-rust">
          salvar
        </button>
      </div>
    </form>
  )
}
