import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ItemType } from '@/lib/types'

interface ItemBulletProps {
  /** tarefa = caixa (quadrado), evento = círculo — símbolos de bullet journal. */
  type: ItemType
  done: boolean
  /** Mostra um pequeno `>` no canto — item que veio de um dia anterior (migrado). */
  migrated?: boolean
  onChange: () => void
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Botão de status no estilo bullet journal — substitui o checkbox nativo
 * (que renderiza cru, principalmente no mobile) por um glifo próprio: caixa
 * pra tarefa, círculo pra evento, ✕ quando feito.
 */
export function ItemBullet({ type, done, migrated, onChange, size = 'sm', className }: ItemBulletProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        'relative flex shrink-0 items-center justify-center border transition-colors',
        type === 'event' ? 'rounded-full' : 'rounded-[5px]',
        size === 'sm' ? 'size-4' : 'size-5',
        done
          ? 'border-olive bg-olive text-paper-raised'
          : 'border-line-strong bg-paper text-transparent hover:border-ink-dim',
        className,
      )}
    >
      <X className={size === 'sm' ? 'size-3' : 'size-3.5'} strokeWidth={3} />
      {migrated && (
        <span
          className="absolute -right-1.5 -top-1.5 flex size-3 items-center justify-center rounded-full bg-rust text-[7px] font-bold leading-none text-paper-raised"
          aria-hidden
          title="migrado de outro dia"
        >
          &gt;
        </span>
      )}
    </button>
  )
}
