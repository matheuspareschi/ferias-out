import type { AccentColor } from './types'

interface BlockStyle {
  bg: string
  border: string
  /** Faixa sólida na borda esquerda — o principal sinal de cor, legível mesmo entre tons próximos. */
  stripe: string
  text: string
  dot: string
}

export const ACCENT_STYLES: Record<AccentColor, BlockStyle> = {
  clay: {
    bg: 'bg-clay-soft',
    border: 'border-clay-dim',
    stripe: 'border-l-clay',
    text: 'text-ink',
    dot: 'bg-clay',
  },
  gold: {
    bg: 'bg-gold-soft',
    border: 'border-gold-dim',
    stripe: 'border-l-gold',
    text: 'text-ink',
    dot: 'bg-gold',
  },
  olive: {
    bg: 'bg-olive-soft',
    border: 'border-olive-dim',
    stripe: 'border-l-olive',
    text: 'text-ink',
    dot: 'bg-olive',
  },
  rust: {
    bg: 'bg-rust-soft',
    border: 'border-rust-dim',
    stripe: 'border-l-rust',
    text: 'text-ink',
    dot: 'bg-rust',
  },
  ink: {
    bg: 'bg-paper-raised',
    border: 'border-line-strong',
    stripe: 'border-l-ink-faint',
    text: 'text-ink',
    dot: 'bg-ink-faint',
  },
}

/** Opções oferecidas no seletor de cor do EditItemModal. */
export const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: 'clay', label: 'padrão' },
  { value: 'rust', label: 'terracota' },
  { value: 'olive', label: 'oliva' },
  { value: 'gold', label: 'dourado' },
  { value: 'ink', label: 'neutro' },
]
