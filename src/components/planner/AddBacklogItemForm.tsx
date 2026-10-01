import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { DEFAULT_CONTEXT_ID } from '@/lib/contexts'
import type { Context, ItemSize } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AddBacklogItemFormProps {
  contexts: Context[]
  onAdd: (data: { title: string; context: string; size: ItemSize }) => void
}

const SIZES: ItemSize[] = ['P', 'M', 'G']

export function AddBacklogItemForm({ contexts, onAdd }: AddBacklogItemFormProps) {
  const [title, setTitle] = useState('')
  const [context, setContext] = useState<string>(DEFAULT_CONTEXT_ID)
  const [size, setSize] = useState<ItemSize>('M')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({ title, context, size })
    setTitle('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-1.5 rounded-sm border border-dashed border-line-strong p-2"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nova tarefa do backlog…"
        className="rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-rust"
      />
      <div className="flex items-center gap-1.5">
        <select
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="flex-1 rounded-sm border border-line bg-paper px-1.5 py-1 text-xs text-ink outline-none focus:border-rust"
        >
          {contexts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="flex gap-0.5">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={cn(
                'size-6 rounded-sm border font-mono text-xs',
                size === s ? 'border-rust bg-rust text-paper-raised' : 'border-line text-ink-dim hover:border-line-strong',
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1 rounded-sm bg-ink px-2 py-1 text-xs text-paper transition-colors hover:bg-rust"
        >
          <Plus className="size-3" />
          add
        </button>
      </div>
    </form>
  )
}
