import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { FaculdadePage } from '@/components/faculdade/FaculdadePage'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addMonths, monthIdOf, todayId } from '@/lib/dates'
import { monthWeeks } from '@/lib/habitGrid'
import { cn } from '@/lib/utils'

interface ProjetosPageProps {
  planner: UsePlannerReturn
}

type ProjectId = 'faculdade' | 'gaeb' | 'conexao' | 'acampamento' | 'estagio'

const PROJECTS: { id: ProjectId; label: string }[] = [
  { id: 'faculdade', label: 'Faculdade' },
  { id: 'gaeb', label: 'GAEB' },
  { id: 'conexao', label: 'Conexão' },
  { id: 'acampamento', label: 'Acampamento' },
  { id: 'estagio', label: 'Estágio' },
]

const inputClass = 'rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-accent'
const sectionClass = 'flex flex-col gap-3 rounded-sm border border-line bg-paper-raised/40 p-3'

export function ProjetosPage({ planner }: ProjetosPageProps) {
  const [project, setProject] = useState<ProjectId>('faculdade')

  return (
    <div className="flex flex-1 gap-4 overflow-hidden">
      <aside className="flex w-36 shrink-0 flex-col gap-0.5">
        {PROJECTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProject(p.id)}
            className={cn(
              'rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
              project === p.id ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-paper-dim hover:text-ink',
            )}
          >
            {p.label}
          </button>
        ))}
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto pb-4">
        {project === 'faculdade' && <FaculdadePage planner={planner} />}
        {project === 'gaeb' && <GaebPage planner={planner} />}
        {project === 'conexao' && <ProjectNotesPage planner={planner} contextId="conexao" title="Conexão" />}
        {project === 'acampamento' && <ProjectNotesPage planner={planner} contextId="acampamento" title="Acampamento" />}
        {project === 'estagio' && <EstagioPage planner={planner} />}
      </div>
    </div>
  )
}

function formatFullDate(dayId: string): string {
  const [y, m, d] = dayId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function monthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** GAEB (7): painel de Ideias + calendário pequeno de encontros + comentários do encontro selecionado. */
function GaebPage({ planner }: { planner: UsePlannerReturn }) {
  const [ideiasOpen, setIdeiasOpen] = useState(true)
  const [newIdea, setNewIdea] = useState('')
  const [month, setMonth] = useState(monthIdOf(todayId()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const encontroDays = new Set(planner.gaebEncontros.map((e) => e.dayId))
  const selected = selectedDay ? planner.gaebEncontros.find((e) => e.dayId === selectedDay) : undefined

  function handleAddIdea(e: FormEvent) {
    e.preventDefault()
    planner.addGaebIdea(newIdea)
    setNewIdea('')
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-lg font-semibold">GAEB</h1>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-3">
          <section className={sectionClass}>
            <button type="button" onClick={() => setIdeiasOpen((v) => !v)} className="flex items-center justify-between text-left">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-dim">Ideias</span>
              <span className="text-ink-faint">{ideiasOpen ? '▾' : '▸'}</span>
            </button>
            {ideiasOpen && (
              <>
                {planner.gaebIdeias.length === 0 ? (
                  <p className="font-mono text-[10px] text-ink-faint">nenhuma ideia ainda</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {planner.gaebIdeias.map((idea) => (
                      <li key={idea.id} className="flex items-center gap-1.5 text-sm">
                        <span className="flex-1 text-ink-dim">{idea.text}</span>
                        <button type="button" onClick={() => planner.deleteGaebIdea(idea.id)} className="text-ink-faint hover:text-attention" aria-label="Remover ideia">
                          <X className="size-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={handleAddIdea} className="flex gap-1">
                  <input value={newIdea} onChange={(e) => setNewIdea(e.target.value)} placeholder="nova ideia…" className={cn(inputClass, 'flex-1')} />
                  <button type="submit" className="flex shrink-0 items-center justify-center rounded-sm border border-line px-2 text-ink-dim hover:border-line-strong" aria-label="Adicionar ideia">
                    <Plus className="size-3.5" />
                  </button>
                </form>
              </>
            )}
          </section>

          <section className={sectionClass}>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês anterior">
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="font-mono text-xs text-ink-dim">{monthLabel(month)}</span>
              <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-sm p-1 text-ink-dim hover:bg-paper-dim hover:text-ink" aria-label="Mês seguinte">
                <ChevronRight className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {monthWeeks(month).map((week, wi) => (
                <div key={wi} className="flex gap-0.5">
                  {week.map((d, di) => (
                    <button
                      key={di}
                      type="button"
                      disabled={d === null}
                      onClick={() => d && setSelectedDay(d)}
                      className={cn(
                        'flex size-7 items-center justify-center rounded-sm text-xs',
                        d === null ? 'invisible' : 'text-ink-dim hover:bg-paper-dim hover:text-ink',
                        d === selectedDay && 'bg-ink text-paper hover:bg-ink hover:text-paper',
                        d && encontroDays.has(d) && d !== selectedDay && 'font-semibold text-accent',
                      )}
                    >
                      {d ? Number(d.slice(-2)) : ''}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3">
          {selectedDay ? (
            <>
              <h2 className="font-serif text-xl font-semibold">{formatFullDate(selectedDay)}</h2>
              <div className="flex flex-wrap gap-2">
                <input
                  value={selected?.tema ?? ''}
                  onChange={(e) => planner.upsertGaebEncontro(selectedDay, { tema: e.target.value })}
                  placeholder="tema (opcional)"
                  className={cn(inputClass, 'w-40')}
                />
                <input
                  value={selected?.pessoas ?? ''}
                  onChange={(e) => planner.upsertGaebEncontro(selectedDay, { pessoas: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="nº de pessoas"
                  type="number"
                  min={0}
                  className={cn(inputClass, 'w-28')}
                />
                <input
                  value={selected?.comida ?? ''}
                  onChange={(e) => planner.upsertGaebEncontro(selectedDay, { comida: e.target.value })}
                  placeholder="comida (opcional)"
                  className={cn(inputClass, 'w-40')}
                />
              </div>
              <textarea
                value={selected?.comments ?? ''}
                onChange={(e) => planner.upsertGaebEncontro(selectedDay, { comments: e.target.value })}
                placeholder="Comentários desse encontro…"
                rows={10}
                className={cn(inputClass, 'font-serif text-sm italic text-ink-dim')}
              />
            </>
          ) : (
            <p className="font-mono text-xs text-ink-faint">selecione um dia no calendário</p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Conexão e Acampamento (7): começam só como contexto de backlog + uma nota simples. */
function ProjectNotesPage({ planner, contextId, title }: { planner: UsePlannerReturn; contextId: string; title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-lg font-semibold">{title}</h1>
      <p className="font-mono text-[10px] text-ink-faint">as tarefas desse contexto aparecem no Backlog, como qualquer outra</p>
      <textarea
        value={planner.projectNotes[contextId] ?? ''}
        onChange={(e) => planner.setProjectNote(contextId, e.target.value)}
        placeholder={`Anotações de ${title}…`}
        rows={14}
        className={cn(inputClass, 'font-serif text-sm italic text-ink-dim')}
      />
    </div>
  )
}

/** Estágio/extensão (7): texto livre + tabela simples opcional de horas por atividade. */
function EstagioPage({ planner }: { planner: UsePlannerReturn }) {
  const [activity, setActivity] = useState('')
  const [hours, setHours] = useState('')

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    planner.addEstagioHours(activity, Number(hours))
    setActivity('')
    setHours('')
  }

  const total = planner.estagioHours.reduce((sum, h) => sum + h.hours, 0)

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-lg font-semibold">Estágio</h1>
      <textarea
        value={planner.estagioNotes}
        onChange={(e) => planner.setEstagioNotes(e.target.value)}
        placeholder="Texto livre…"
        rows={10}
        className={cn(inputClass, 'font-serif text-sm italic text-ink-dim')}
      />

      <section className={sectionClass}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-dim">Horas por atividade (opcional)</h2>
        {planner.estagioHours.length === 0 ? (
          <p className="font-mono text-[10px] text-ink-faint">nenhuma linha ainda</p>
        ) : (
          <table className="text-xs">
            <tbody>
              {planner.estagioHours.map((h) => (
                <tr key={h.id} className="border-b border-line/60 last:border-0">
                  <td className="py-1 pr-3">{h.activity}</td>
                  <td className="py-1 pr-3 font-mono">{h.hours}h</td>
                  <td className="py-1">
                    <button type="button" onClick={() => planner.deleteEstagioHours(h.id)} className="text-ink-faint hover:text-attention" aria-label="Remover linha">
                      <X className="size-3" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="pt-1.5 font-semibold text-ink-dim">Total</td>
                <td className="pt-1.5 font-mono font-semibold text-ink-dim">{total}h</td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <label className="flex flex-1 flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
            Atividade
            <input value={activity} onChange={(e) => setActivity(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
            Horas
            <input value={hours} onChange={(e) => setHours(e.target.value)} type="number" min={0} step="0.5" className={cn(inputClass, 'w-20')} />
          </label>
          <button type="submit" className="rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-accent">
            adicionar
          </button>
        </form>
      </section>
    </div>
  )
}
