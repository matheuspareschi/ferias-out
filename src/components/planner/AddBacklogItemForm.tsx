import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { BacklogCategory, BacklogSize } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AddBacklogItemFormProps {
  onAdd: (data: { title: string; category: BacklogCategory; size: BacklogSize }) => void
}

const CATEGORIES: { value: BacklogCategory; label: string }[] = [
  { value: 'aula', label: 'Aula' },
  { value: 'preparo', label: 'Preparo' },
  { value: 'tarefa', label: 'Tarefa' },
]

const SIZES: BacklogSize[] = ['P', 'M', 'G']

export function AddBacklogItemForm({ onAdd }: AddBacklogItemFormProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<BacklogCategory>('tarefa')
  const [size, setSize] = useState<BacklogSize>('M')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({ title, category, size })
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
          value={category}
          onChange={(e) => setCategory(e.target.value as BacklogCategory)}
          className="flex-1 rounded-sm border border-line bg-paper px-1.5 py-1 text-xs text-ink outline-none focus:border-rust"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
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
