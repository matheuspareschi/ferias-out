export type BlockKind = 'agenda' | 'aula' | 'preparo' | 'tarefa'

interface BlockStyle {
  bg: string
  border: string
  text: string
  dot: string
  label: string
}

export const BLOCK_STYLES: Record<BlockKind, BlockStyle> = {
  agenda: {
    bg: 'bg-paper-raised',
    border: 'border-line-strong',
    text: 'text-ink',
    dot: 'bg-ink-faint',
    label: 'compromisso',
  },
  aula: {
    bg: 'bg-gold-soft',
    border: 'border-gold-dim',
    text: 'text-ink',
    dot: 'bg-gold',
    label: 'aula',
  },
  preparo: {
    bg: 'bg-olive-soft',
    border: 'border-olive-dim',
    text: 'text-ink',
    dot: 'bg-olive',
    label: 'preparo',
  },
  tarefa: {
    bg: 'bg-rust-soft',
    border: 'border-rust-dim',
    text: 'text-ink',
    dot: 'bg-rust',
    label: 'tarefa',
  },
}
