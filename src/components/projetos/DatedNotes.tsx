import { useState } from 'react'
import { todayId } from '@/lib/dates'
import { cn } from '@/lib/utils'

const inputClass = 'rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-accent'

function formatFullDate(dayId: string): string {
  const [y, m, d] = dayId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Componente comum de anotação datada (7.1): edição explícita por "Salvar",
 * não blur-save — sair do foco só preserva o rascunho local, nunca grava.
 * Depois de salva vira texto de leitura, com "editar" pra reabrir.
 */
function DatedNoteBody({ text, onSave, autoFocus }: { text: string; onSave: (text: string) => void; autoFocus?: boolean }) {
  const [editing, setEditing] = useState(text.trim() === '')
  const [draft, setDraft] = useState(text)

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <textarea
          autoFocus={autoFocus}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          placeholder="Escreva a anotação…"
          className={cn(inputClass, 'font-serif text-sm italic text-ink-dim')}
        />
        <div className="flex justify-end gap-2">
          {text.trim() !== '' && (
            <button
              type="button"
              onClick={() => {
                setDraft(text)
                setEditing(false)
              }}
              className="rounded-sm px-2 py-1 text-xs text-ink-dim hover:bg-paper-dim"
            >
              cancelar
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!draft.trim()) return
              onSave(draft.trim())
              setEditing(false)
            }}
            disabled={!draft.trim()}
            className="rounded-sm bg-ink px-3 py-1 text-xs text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            salvar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="whitespace-pre-wrap font-serif text-sm italic text-ink-dim">{text}</p>
      <button type="button" onClick={() => setEditing(true)} className="self-end text-[10px] text-ink-faint hover:text-ink">
        editar
      </button>
    </div>
  )
}

/**
 * Lista de anotações datadas (7.1), da mais recente pra mais antiga — usada
 * por Conexão/Acampamento. "+ nova anotação" abre um editor com data
 * escolhível (hoje por padrão); cada entrada existente usa DatedNoteBody
 * pro ciclo editar/salvar/ler.
 */
export function DatedNotesList({ notesByDay, onSave }: { notesByDay: Record<string, string>; onSave: (dayId: string, text: string) => void }) {
  const [newDate, setNewDate] = useState<string | null>(null)
  const days = Object.keys(notesByDay)
    .filter((d) => notesByDay[d]?.trim())
    .filter((d) => d !== newDate)
    .sort((a, b) => (a < b ? 1 : -1))

  return (
    <div className="flex flex-col gap-3">
      {newDate === null ? (
        <button
          type="button"
          onClick={() => setNewDate(todayId())}
          className="self-start rounded-sm border border-dashed border-line-strong px-2 py-1 text-xs text-ink-dim hover:border-line-strong hover:text-ink"
        >
          + nova anotação
        </button>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-sm border border-dashed border-line-strong p-2">
          <div className="flex items-center justify-between">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={cn(inputClass, 'w-40 text-xs')} />
            <button type="button" onClick={() => setNewDate(null)} className="text-xs text-ink-faint hover:text-ink">
              cancelar
            </button>
          </div>
          <DatedNoteBody
            autoFocus
            text={notesByDay[newDate] ?? ''}
            onSave={(text) => {
              onSave(newDate, text)
              setNewDate(null)
            }}
          />
        </div>
      )}

      {days.length === 0 && newDate === null && <p className="font-mono text-[10px] text-ink-faint">nenhuma anotação ainda</p>}

      {days.map((dayId) => (
        <div key={dayId} className="flex flex-col gap-1 border-t border-line pt-2">
          <p className="font-serif text-sm font-semibold">{formatFullDate(dayId)}</p>
          <DatedNoteBody text={notesByDay[dayId]} onSave={(text) => onSave(dayId, text)} />
        </div>
      ))}
    </div>
  )
}

/** Só o corpo (sem lista/data) — pro GAEB, onde a data já vem escolhida pelo calendário próprio. */
export { DatedNoteBody }
