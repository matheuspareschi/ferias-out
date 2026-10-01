interface ComingSoonProps {
  title: string
  note: string
}

/** Placeholder de seção ainda não implementada — reserva a aba sem fingir que funciona. */
export function ComingSoon({ title, note }: ComingSoonProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
      <p className="font-serif text-base font-semibold text-ink-dim">{title}</p>
      <p className="max-w-sm font-mono text-xs text-ink-faint">{note}</p>
    </div>
  )
}
