import { useState } from 'react'
import { validateDateInput } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface InlineDateEditorProps {
  /** "YYYY-MM-DD" ou undefined pra "sem data". */
  value?: string
  onConfirm: (dayId: string) => void
  placeholder?: string
  className?: string
}

/**
 * Data clicável que vira um `<input type="date">` + confirmar/cancelar —
 * mesmo padrão de "só grava ao confirmar, valida antes" do resto do app
 * (RowActionMenu/EditItemModal), pra não repetir o bug de data parcial.
 */
export function InlineDateEditor({ value, onConfirm, placeholder = 'agendar', className }: InlineDateEditorProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  function startEditing() {
    setDraft(value ?? '')
    setError(null)
    setEditing(true)
  }

  function confirm() {
    const valid = validateDateInput(draft)
    if (!valid) {
      setError('data inválida')
      return
    }
    onConfirm(valid)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className={cn('font-mono text-[10px] text-ink-faint hover:text-ink', value ? 'text-ink-dim' : undefined, className)}
      >
        {value ?? placeholder}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <input
        type="date"
        autoFocus
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setError(null)
        }}
        className="w-32 rounded-sm border border-line px-1 py-0.5 text-[11px]"
      />
      {error && <span className="font-mono text-[9px] text-attention">{error}</span>}
      <div className="flex gap-1">
        <button type="button" onClick={confirm} className="rounded-sm bg-ink px-1.5 py-0.5 text-[10px] text-paper hover:bg-accent">
          confirmar
        </button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-sm px-1.5 py-0.5 text-[10px] text-ink-faint hover:text-ink">
          cancelar
        </button>
      </div>
    </div>
  )
}
