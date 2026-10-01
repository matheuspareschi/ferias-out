import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ItemType } from '@/lib/types'

interface ItemGlyphProps {
  type: ItemType
  done: boolean
  /** Dia de origem se migrado — mostra `>` no lugar do símbolo de tipo. */
  migrated?: boolean
  /** Subtarefa: traço mais leve em vez da caixa/losango cheios. */
  subtask?: boolean
  onChange: () => void
  size?: 'sm' | 'md'
  className?: string
  /** false pra uso como ícone de pré-visualização (ex.: dentro de outro botão) — vira um <span>, não clicável. */
  interactive?: boolean
}

/**
 * Símbolo clicável no estilo bullet journal — nunca uma caixa preenchida.
 * Prioridade de símbolo: feita (✕) > migrada (`>`) > tipo (caixa/losango),
 * com a subtarefa usando um traço mais leve no lugar da caixa.
 */
export function ItemGlyph({ type, done, migrated, subtask, onChange, size = 'sm', className, interactive = true }: ItemGlyphProps) {
  const dim = size === 'sm' ? 14 : 16
  const Tag = interactive ? 'button' : 'span'

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      role="checkbox"
      aria-checked={done}
      onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation()
              onChange()
            }
          : undefined
      }
      className={cn(
        'flex shrink-0 items-center justify-center text-ink-dim transition-colors hover:text-ink',
        className,
      )}
      style={{ width: dim, height: dim }}
    >
      {done ? (
        <X size={dim - 2} strokeWidth={2} className="text-ink-faint" />
      ) : migrated ? (
        <span className="font-mono text-sm leading-none text-attention" aria-hidden>
          &gt;
        </span>
      ) : subtask ? (
        <span className="block h-px w-2.5 bg-ink-faint" aria-hidden />
      ) : type === 'event' ? (
        <svg width={dim - 4} height={dim - 4} viewBox="0 0 10 10" fill="none" aria-hidden>
          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      ) : (
        <svg width={dim - 4} height={dim - 4} viewBox="0 0 10 10" fill="none" aria-hidden>
          <rect x="0.75" y="0.75" width="8.5" height="8.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      )}
    </Tag>
  )
}
