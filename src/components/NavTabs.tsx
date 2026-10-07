import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type SectionId =
  | 'semana'
  | 'mes'
  | 'ano'
  | 'habitos'
  | 'backlog'
  | 'projetos'
  | 'retrospectiva'
  | 'faculdade-mes'
  | 'faculdade-geral'

/** Todas as seções já existentes no app — continuam roteadas no App.tsx, só não ficam no menu por hora (ver ALL_SECTIONS/mudança radical faculdade-only). */
const ALL_SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'faculdade-mes', label: 'Calendário' },
  { id: 'faculdade-geral', label: 'Disciplinas' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
  { id: 'habitos', label: 'Hábitos' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'projetos', label: 'Projetos' },
  { id: 'retrospectiva', label: 'Retrospectiva' },
]

/** Por hora o app é só-faculdade: o resto fica escondido do menu, mas continua funcionando se reativado. */
const HIDDEN_SECTION_IDS = new Set<SectionId>(['semana', 'mes', 'ano', 'habitos', 'backlog', 'projetos', 'retrospectiva'])
const SECTIONS = ALL_SECTIONS.filter((s) => !HIDDEN_SECTION_IDS.has(s.id))

interface NavTabsProps {
  active: SectionId
  onChange: (section: SectionId) => void
}

export function NavTabs({ active, onChange }: NavTabsProps) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-sm border border-line px-2 py-1.5 text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink sm:hidden"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
      >
        {open ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
        {SECTIONS.find((s) => s.id === active)?.label}
      </button>

      <div className="hidden items-center gap-1 sm:flex">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              'rounded-sm px-2 py-1 text-xs transition-colors',
              active === s.id ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-paper-dim hover:text-ink',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 flex w-40 flex-col rounded-sm border border-line bg-paper-raised py-1 text-xs shadow-lifted sm:hidden">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.id)
                setOpen(false)
              }}
              className={cn(
                'px-3 py-1.5 text-left transition-colors',
                active === s.id ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-paper-dim hover:text-ink',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
