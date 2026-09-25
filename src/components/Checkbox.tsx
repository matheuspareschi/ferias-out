import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Checkbox custom — o <input type="checkbox"> nativo renderiza muito cru
 * (principalmente no mobile), então aqui é só um botão com um estado visual
 * próprio, suave e consistente com o resto do app.
 */
export function Checkbox({ checked, onChange, size = 'sm', className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-[5px] border transition-colors',
        size === 'sm' ? 'size-4' : 'size-5',
        checked
          ? 'border-olive bg-olive text-paper-raised'
          : 'border-line-strong bg-paper text-transparent hover:border-ink-dim',
        className,
      )}
    >
      <Check className={cn(size === 'sm' ? 'size-3' : 'size-3.5')} strokeWidth={3} />
    </button>
  )
}
