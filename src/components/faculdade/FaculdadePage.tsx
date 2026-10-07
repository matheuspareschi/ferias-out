import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BlurSavedTextarea } from '@/components/BlurSavedField'
import { InlineDateEditor } from '@/components/InlineDateEditor'
import { ItemGlyph } from '@/components/ItemGlyph'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { todayId, validateDateInput } from '@/lib/dates'
import type { Item, ItemSize, LiveClassStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FaculdadePageProps {
  planner: UsePlannerReturn
}

const SIZES: ItemSize[] = ['P', 'M', 'G']
const LIVE_STATUS_LABEL: Record<LiveClassStatus, string> = { vou: 'vou assistir', nao: 'não vou', assisti: 'assisti' }

const inputClass =
  'rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-accent'
const sectionClass = 'flex flex-col gap-3 rounded-sm border border-line bg-paper-raised/40 p-3'

export function FaculdadePage({ planner }: FaculdadePageProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-lg font-semibold">Faculdade</h1>
      <UnitsGrid planner={planner} />
      <ContinuousReviewSection planner={planner} />
      <LiveClassesSection planner={planner} />
      <DeliveriesSection planner={planner} />
      <NotesSection disciplines={planner.disciplines} facultyNotes={planner.facultyNotes} onSetFacultyNote={planner.setFacultyNote} />
    </div>
  )
}

/** Acompanhamento contínuo de Hebraico (4): um item por dia, gerado sozinho — aqui só marca feito/não feito. */
function ContinuousReviewSection({ planner }: { planner: UsePlannerReturn }) {
  const entries = planner.items
    .filter((it) => it.unitRole === 'revisao_continua')
    .sort((a, b) => (b.dayId ?? '').localeCompare(a.dayId ?? ''))
    .slice(0, 14)

  if (entries.length === 0) return null

  const doneCount = entries.filter((it) => it.done).length

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-base font-semibold">Revisão contínua — Hebraico</h2>
        <span className="font-mono text-[10px] text-ink-faint">
          {doneCount}/{entries.length} últimos dias
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map((item) => (
          <li key={item.id} className="flex items-center gap-1">
            <ItemGlyph type="task" done={item.done} onChange={() => planner.toggleDone(item.id)} size="sm" />
            <span className="font-mono text-[10px] text-ink-dim">{item.dayId}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function UnitsGrid({ planner }: { planner: UsePlannerReturn }) {
  const { disciplines, units, items } = planner
  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id ?? '')
  const [number, setNumber] = useState('')
  const [size, setSize] = useState<ItemSize>('M')
  const [pages, setPages] = useState('')
  const [dayId, setDayId] = useState('')
  const [dayError, setDayError] = useState<string | null>(null)

  function handleAddUnit(e: FormEvent) {
    e.preventDefault()
    const n = Number(number)
    if (!disciplineId || !Number.isFinite(n) || n <= 0) return
    const validDay = dayId ? validateDateInput(dayId) : null
    if (dayId && !validDay) {
      setDayError('data inválida')
      return
    }
    planner.addUnit(disciplineId, n, size, pages ? Number(pages) : undefined, validDay ?? undefined)
    setNumber('')
    setPages('')
    setDayId('')
    setDayError(null)
  }

  function handleDeleteUnit(unitId: string, label: string) {
    if (window.confirm(`Excluir a unidade ${label}? Isso apaga a aula e as revisões ligadas a ela.`)) {
      planner.deleteUnit(unitId)
    }
  }

  return (
    <section className={sectionClass}>
      <h2 className="font-serif text-base font-semibold">Disciplinas e unidades</h2>
      {disciplines.map((discipline) => {
        const disciplineUnits = units.filter((u) => u.disciplineId === discipline.id).sort((a, b) => a.number - b.number)
        return (
          <div key={discipline.id} className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-ink-dim">
              {discipline.sigla} <span className="font-normal text-ink-faint">— {discipline.name}</span>
            </p>
            {disciplineUnits.length === 0 ? (
              <p className="px-1 font-mono text-[10px] text-ink-faint">nenhuma unidade ainda</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                      <th className="py-1 pr-2 font-normal">Unidade</th>
                      <th className="px-2 py-1 font-normal">Aula</th>
                      <th className="px-2 py-1 font-normal">Rev. 1</th>
                      <th className="px-2 py-1 font-normal">Rev. 2</th>
                      <th className="px-2 py-1 font-normal">Rev. 3</th>
                      <th className="px-2 py-1 font-normal">Tam.</th>
                      <th className="px-2 py-1 font-normal">Págs.</th>
                      <th className="py-1 pl-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {disciplineUnits.map((unit) => {
                      const aula = items.find((it) => it.unitId === unit.id && it.unitRole === 'aula')
                      const reviews: (Item | undefined)[] = [1, 2, 3].map((idx) =>
                        items.find((it) => it.unitId === unit.id && it.unitRole === 'revisao' && it.reviewIndex === idx),
                      )
                      const label = `${discipline.sigla}${unit.number}`
                      return (
                        <tr key={unit.id} className="border-b border-line/60 last:border-0">
                          <td className="py-1.5 pr-2 font-mono">{label}</td>
                          <td className="px-2 py-1.5">
                            {aula && (
                              <div className="flex flex-col items-start gap-0.5">
                                <ItemGlyph type="task" done={aula.done} onChange={() => planner.toggleDone(aula.id)} />
                                <InlineDateEditor
                                  value={aula.dayId}
                                  onConfirm={(d) => planner.updateItem(aula.id, { dayId: d, period: null })}
                                />
                              </div>
                            )}
                          </td>
                          {reviews.map((review, idx) => (
                            <td key={idx} className="px-2 py-1.5">
                              {review ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <ItemGlyph type="task" done={review.done} onChange={() => planner.toggleDone(review.id)} />
                                  <InlineDateEditor
                                    value={review.dayId}
                                    onConfirm={(d) => planner.updateItem(review.id, { dayId: d, period: null })}
                                  />
                                </div>
                              ) : (
                                <span className="text-ink-faint">—</span>
                              )}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 font-mono">{unit.size}</td>
                          <td className="px-2 py-1.5 font-mono">{unit.pages ?? '—'}</td>
                          <td className="py-1.5 pl-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteUnit(unit.id, label)}
                              className="text-ink-faint hover:text-attention"
                              aria-label={`Excluir unidade ${label}`}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}

      <form onSubmit={handleAddUnit} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Disciplina
          <select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)} className={inputClass}>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.sigla}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Número
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            type="number"
            min={1}
            className={cn(inputClass, 'w-16')}
          />
        </label>
        <div className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Tamanho
          <div className="flex gap-1">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={cn(
                  'size-7 rounded-sm border font-mono text-xs',
                  size === s ? 'border-accent bg-accent text-paper-raised' : 'border-line text-ink-dim hover:border-line-strong',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Data da aula (opcional)
          <input
            value={dayId}
            onChange={(e) => {
              setDayId(e.target.value)
              setDayError(null)
            }}
            type="date"
            className={inputClass}
          />
          {dayError && <span className="font-mono text-[9px] text-attention">{dayError}</span>}
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Páginas
          <input
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            type="number"
            min={0}
            className={cn(inputClass, 'w-20')}
          />
        </label>
        <button type="submit" className="rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-accent">
          adicionar unidade
        </button>
      </form>
    </section>
  )
}

function LiveClassesSection({ planner }: { planner: UsePlannerReturn }) {
  const { disciplines, items } = planner
  const liveClasses = items
    .filter((it) => it.type === 'event' && it.disciplineId && !it.unitId)
    .sort((a, b) => (a.dayId ?? '').localeCompare(b.dayId ?? ''))

  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [dayId, setDayId] = useState(todayId())
  const [timeNote, setTimeNote] = useState('')

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!disciplineId || !title.trim() || !dayId) return
    planner.addLiveClass(disciplineId, title, dayId, timeNote.trim() || undefined)
    setTitle('')
    setTimeNote('')
  }

  return (
    <section className={sectionClass}>
      <h2 className="font-serif text-base font-semibold">Aulas ao vivo</h2>
      {liveClasses.length === 0 ? (
        <p className="px-1 font-mono text-[10px] text-ink-faint">nenhuma aula ao vivo marcada</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {liveClasses.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-[10px] text-ink-faint">{item.dayId}</span>
              <span className="flex-1 min-w-32">{item.title}</span>
              {item.timeNote && <span className="font-mono text-[10px] text-ink-faint">{item.timeNote}</span>}
              <div className="flex gap-1">
                {(['vou', 'nao', 'assisti'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => planner.setLiveClassStatus(item.id, status)}
                    className={cn(
                      'rounded-sm border px-1.5 py-0.5 text-[10px]',
                      item.liveClassStatus === status
                        ? 'border-ink bg-ink text-paper'
                        : 'border-line text-ink-dim hover:border-line-strong',
                    )}
                  >
                    {LIVE_STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Disciplina
          <select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)} className={inputClass}>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.sigla}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: Aula ao vivo" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Data
          <input value={dayId} onChange={(e) => setDayId(e.target.value)} type="date" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Horário (opcional)
          <input value={timeNote} onChange={(e) => setTimeNote(e.target.value)} placeholder="17:00" className={cn(inputClass, 'w-24')} />
        </label>
        <button type="submit" className="rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-accent">
          adicionar
        </button>
      </form>
      {disciplines.length === 0 && <p className="font-mono text-[10px] text-attention">cadastre uma disciplina antes</p>}
    </section>
  )
}

function DeliveriesSection({ planner }: { planner: UsePlannerReturn }) {
  const { disciplines, items } = planner
  const deliveries = items.filter((it) => it.isDelivery).sort((a, b) => (a.dayId ?? '').localeCompare(b.dayId ?? ''))

  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [dayId, setDayId] = useState(todayId())

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!disciplineId || !title.trim() || !dayId) return
    planner.addDelivery(disciplineId, title, dayId)
    setTitle('')
  }

  return (
    <section className={sectionClass}>
      <h2 className="font-serif text-base font-semibold">Entregas</h2>
      {deliveries.length === 0 ? (
        <p className="px-1 font-mono text-[10px] text-ink-faint">nenhuma entrega cadastrada</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {deliveries.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <ItemGlyph type="task" done={item.done} delivery onChange={() => planner.toggleDone(item.id)} />
              <span className="font-mono text-[10px] text-ink-faint">{item.dayId}</span>
              <span className={cn('flex-1', item.done && 'text-ink-faint line-through')}>{item.title}</span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Disciplina
          <select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)} className={inputClass}>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.sigla}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: Trabalho final" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
          Data
          <input value={dayId} onChange={(e) => setDayId(e.target.value)} type="date" className={inputClass} />
        </label>
        <button type="submit" className="rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-accent">
          adicionar
        </button>
      </form>
    </section>
  )
}

function NotesSection({
  disciplines,
  facultyNotes,
  onSetFacultyNote,
}: {
  disciplines: UsePlannerReturn['disciplines']
  facultyNotes: UsePlannerReturn['facultyNotes']
  onSetFacultyNote: UsePlannerReturn['setFacultyNote']
}) {
  const [openDiscipline, setOpenDiscipline] = useState<string | null>(null)

  return (
    <section className={sectionClass}>
      <h2 className="font-serif text-base font-semibold">Notas</h2>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
        Geral
        <BlurSavedTextarea
          value={facultyNotes.general}
          onSave={(text) => onSetFacultyNote(null, text)}
          rows={3}
          placeholder="Anotações livres da Faculdade…"
          className={cn(inputClass, 'font-serif text-sm italic text-ink-dim')}
        />
      </label>
      <div className="flex flex-col gap-2">
        {disciplines.map((d) => (
          <div key={d.id}>
            <button
              type="button"
              onClick={() => setOpenDiscipline((cur) => (cur === d.id ? null : d.id))}
              className="text-[10px] uppercase tracking-wide text-ink-faint hover:text-ink"
            >
              {openDiscipline === d.id ? '▾' : '▸'} notas de {d.sigla}
            </button>
            {openDiscipline === d.id && (
              <BlurSavedTextarea
                value={facultyNotes.byDiscipline[d.id] ?? ''}
                onSave={(text) => onSetFacultyNote(d.id, text)}
                rows={2}
                placeholder={`Anotações de ${d.sigla}…`}
                className={cn(inputClass, 'mt-1 w-full font-serif text-sm italic text-ink-dim')}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
