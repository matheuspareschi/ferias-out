import type { DayCategoryId } from '@/lib/types'
import { cn } from '@/lib/utils'

const CATEGORY_OPTIONS: { value: DayCategoryId; label: string }[] = [
  { value: 'piedade', label: 'piedade' },
  { value: 'lazer', label: 'lazer' },
  { value: 'geral', label: 'atividades gerais' },
  { value: 'livre', label: 'tempo livre' },
  { value: 'outro', label: 'outro' },
]

const CATEGORY_CLASS: Record<DayCategoryId, string> = {
  piedade: 'border-gold-dim bg-gold-soft text-gold',
  lazer: 'border-olive-dim bg-olive-soft text-olive',
  geral: 'border-clay bg-clay-soft text-clay',
  livre: 'border-rust-dim bg-rust-soft text-rust',
  outro: 'border-line-strong bg-paper-raised text-ink-dim',
}

interface DayCategoryTagProps {
  value: DayCategoryId | null
  disabled?: boolean
  onChange: (value: DayCategoryId | null) => void
}

export function DayCategoryTag({ value, disabled, onChange }: DayCategoryTagProps) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange((e.target.value || null) as DayCategoryId | null)}
      aria-label="Categoria do dia"
      className={cn(
        'rounded-full border bg-paper px-1.5 py-0.5 text-[9px] uppercase tracking-wide outline-none',
        value ? CATEGORY_CLASS[value] : 'border-dashed border-line-strong text-ink-faint',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <option value="">+ tag</option>
      {CATEGORY_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
