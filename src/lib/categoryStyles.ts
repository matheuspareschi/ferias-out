import type { AccentColor, BacklogCategory } from './types'

interface BlockStyle {
  bg: string
  border: string
  /** Faixa sólida na borda esquerda — o principal sinal de cor, legível mesmo entre tons próximos. */
  stripe: string
  text: string
  dot: string
  label: string
}

export const ACCENT_STYLES: Record<AccentColor, BlockStyle> = {
  clay: {
    bg: 'bg-clay-soft',
    border: 'border-clay-dim',
    stripe: 'border-l-clay',
    text: 'text-ink',
    dot: 'bg-clay',
    label: 'compromisso',
  },
  gold: {
    bg: 'bg-gold-soft',
    border: 'border-gold-dim',
    stripe: 'border-l-gold',
    text: 'text-ink',
    dot: 'bg-gold',
    label: 'aula',
  },
  olive: {
    bg: 'bg-olive-soft',
    border: 'border-olive-dim',
    stripe: 'border-l-olive',
    text: 'text-ink',
    dot: 'bg-olive',
    label: 'preparo',
  },
  rust: {
    bg: 'bg-rust-soft',
    border: 'border-rust-dim',
    stripe: 'border-l-rust',
    text: 'text-ink',
    dot: 'bg-rust',
    label: 'tarefa',
  },
  ink: {
    bg: 'bg-paper-raised',
    border: 'border-line-strong',
    stripe: 'border-l-ink-faint',
    text: 'text-ink',
    dot: 'bg-ink-faint',
    label: 'neutro',
  },
}

/** Cor fixa de cada categoria do backlog. */
export const CATEGORY_ACCENT: Record<BacklogCategory, AccentColor> = {
  aula: 'gold',
  preparo: 'olive',
  tarefa: 'rust',
}

/** Opções oferecidas no seletor de cor do EditItemModal para AgendaItem. */
export const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: 'clay', label: 'padrão' },
  { value: 'rust', label: 'terracota' },
  { value: 'olive', label: 'oliva' },
  { value: 'gold', label: 'dourado' },
  { value: 'ink', label: 'neutro' },
]
