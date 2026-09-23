import { Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { formatDayShort } from '@/lib/days'
import type { AgendaItem, BacklogCategory, BacklogItem, BacklogSize } from '@/lib/types'
import { cn } from '@/lib/utils'

export type ModalState =
  | { type: 'agenda'; item: AgendaItem }
  | { type: 'agenda-new'; dayId: string }
  | { type: 'backlog'; item: BacklogItem }
  | null

interface EditItemModalProps {
  state: ModalState
  onClose: () => void
  onSaveAgenda: (
    id: string | null,
    dayId: string,
    data: { title: string; start: string | null; duration: number | null },
  ) => void
  onDeleteAgenda: (id: string) => void
  onSaveBacklog: (id: string, data: { title: string; category: BacklogCategory; size: BacklogSize }) => void
  onDeleteBacklog: (id: string) => void
  onUnallocate: (id: string) => void
}

const inputClass =
  'rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-rust'
const labelClass = 'flex flex-1 flex-col gap-1 text-xs text-ink-dim'

export function EditItemModal({
  state,
  onClose,
  onSaveAgenda,
  onDeleteAgenda,
  onSaveBacklog,
  onDeleteBacklog,
  onUnallocate,
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
        {state.type === 'backlog' ? (
          <BacklogForm
            item={state.item}
            onSave={onSaveBacklog}
            onDelete={onDeleteBacklog}
            onUnallocate={onUnallocate}
            onClose={onClose}
          />
        ) : (
          <AgendaForm
            key={state.type === 'agenda' ? state.item.id : `new-${state.dayId}`}
            item={state.type === 'agenda' ? state.item : null}
            dayId={state.type === 'agenda' ? state.item.dayId : state.dayId}
            onSave={onSaveAgenda}
            onDelete={onDeleteAgenda}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

function AgendaForm({
  item,
  dayId,
  onSave,
  onDelete,
  onClose,
}: {
  item: AgendaItem | null
  dayId: string
  onSave: EditItemModalProps['onSaveAgenda']
  onDelete: EditItemModalProps['onDeleteAgenda']
  onClose: () => void
}) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [start, setStart] = useState(item?.start ?? '')
  const [duration, setDuration] = useState(item?.duration != null ? String(item.duration) : '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave(item?.id ?? null, dayId, {
      title: title.trim(),
      start: start || null,
      duration: duration ? Number(duration) : null,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold">
          {item ? 'Editar compromisso' : 'Novo compromisso'}
        </h3>
        <button type="button" onClick={onClose} className="text-ink-dim hover:text-ink" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>
      <p className="font-mono text-xs text-ink-faint">{formatDayShort(dayId)}</p>
      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        Título
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </label>
      <div className="flex gap-2">
        <label className={labelClass}>
          Horário
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          Duração (min)
          <input
            type="number"
            min={0}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputClass}
          />
        </label>
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

function BacklogForm({
  item,
  onSave,
  onDelete,
  onUnallocate,
  onClose,
}: {
  item: BacklogItem
  onSave: EditItemModalProps['onSaveBacklog']
  onDelete: EditItemModalProps['onDeleteBacklog']
  onUnallocate: EditItemModalProps['onUnallocate']
  onClose: () => void
}) {
  const [title, setTitle] = useState(item.title)
  const [category, setCategory] = useState<BacklogCategory>(item.category)
  const [size, setSize] = useState<BacklogSize>(item.size)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave(item.id, { title: title.trim(), category, size })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold">Editar item do backlog</h3>
        <button type="button" onClick={onClose} className="text-ink-dim hover:text-ink" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>
      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        Título
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </label>
      <div className="flex gap-2">
        <label className={labelClass}>
          Categoria
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as BacklogCategory)}
            className={inputClass}
          >
            <option value="aula">Aula</option>
            <option value="preparo">Preparo</option>
            <option value="tarefa">Tarefa</option>
          </select>
        </label>
        <div className="flex flex-col gap-1 text-xs text-ink-dim">
          Tamanho
          <div className="flex gap-1">
            {(['P', 'M', 'G'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
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
      {item.allocation && (
        <div className="flex items-center justify-between rounded-sm border border-line bg-paper px-2 py-1.5 text-xs text-ink-dim">
          <span>
            alocado em {formatDayShort(item.allocation.dayId)} às {item.allocation.start}
          </span>
          <button type="button" onClick={() => onUnallocate(item.id)} className="text-rust hover:underline">
            remover
          </button>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between">
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
        <button type="submit" className="rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-rust">
          salvar
        </button>
      </div>
    </form>
  )
}
