import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BlurSavedInput, BlurSavedTextarea } from '@/components/BlurSavedField'
import { FaculdadePage } from '@/components/faculdade/FaculdadePage'
import { EditItemModal, type ModalState } from '@/components/planner/EditItemModal'
import { ItemRow } from '@/components/planner/ItemRow'
import { useItemActions } from '@/hooks/useItemActions'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addMonths, monthIdOf, todayId } from '@/lib/dates'
import { monthWeeks } from '@/lib/habitGrid'
import type { Item } from '@/lib/types'
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
      <div className="min-w-0 flex-1 overflow-hidden pb-4">
        {project === 'faculdade' && <div className="h-full overflow-y-auto"><FaculdadePage planner={planner} /></div>}
        {project === 'gaeb' && <div className="h-full overflow-y-auto"><GaebPage planner={planner} /></div>}
        {project === 'conexao' && <ProjectPage planner={planner} contextId="conexao" title="Conexão" />}
        {project === 'acampamento' && <ProjectPage planner={planner} contextId="acampamento" title="Acampamento" />}
        {project === 'estagio' && <div className="h-full overflow-y-auto"><EstagioPage planner={planner} /></div>}
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
                <BlurSavedInput
                  value={selected?.tema ?? ''}
                  onSave={(text) => planner.upsertGaebEncontro(selectedDay, { tema: text })}
                  placeholder="tema (opcional)"
                  className={cn(inputClass, 'w-40')}
                />
                <BlurSavedInput
                  value={selected?.pessoas !== undefined ? String(selected.pessoas) : ''}
                  onSave={(text) => planner.upsertGaebEncontro(selectedDay, { pessoas: text ? Number(text) : undefined })}
                  placeholder="nº de pessoas"
                  type="number"
                  min={0}
                  className={cn(inputClass, 'w-28')}
                />
                <BlurSavedInput
                  value={selected?.comida ?? ''}
                  onSave={(text) => planner.upsertGaebEncontro(selectedDay, { comida: text })}
                  placeholder="comida (opcional)"
                  className={cn(inputClass, 'w-40')}
                />
              </div>
              <BlurSavedTextarea
                value={selected?.comments ?? ''}
                onSave={(text) => planner.upsertGaebEncontro(selectedDay, { comments: text })}
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

type ProjectTab = 'tarefas' | 'anotacoes'

/**
 * Conexão e Acampamento (7): dois painéis 50/50 iguais à Hoje — Tarefas
 * (itens desse contexto, mesma fonte do Backlog) e Anotações (texto livre,
 * blur-save per 0.1). No celular vira abas.
 */
function ProjectPage({ planner, contextId, title }: { planner: UsePlannerReturn; contextId: string; title: string }) {
  const [tab, setTab] = useState<ProjectTab>('tarefas')

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-line">
      <div className="flex shrink-0 border-b border-line lg:hidden">
        {(['tarefas', 'anotacoes'] as ProjectTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn('flex-1 py-2 text-center text-xs font-semibold uppercase tracking-wide', tab === t ? 'bg-ink text-paper' : 'text-ink-dim')}
          >
            {t === 'tarefas' ? 'Tarefas' : 'Anotações'}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 lg:flex-row">
        <div className={cn('min-h-0 flex-1 overflow-y-auto border-line lg:block lg:w-1/2 lg:border-r', tab === 'tarefas' ? 'block' : 'hidden')}>
          <ProjectTasksPanel planner={planner} contextId={contextId} title={title} />
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto lg:block lg:w-1/2', tab === 'anotacoes' ? 'block' : 'hidden')}>
          <div className="flex h-full flex-col gap-2 p-3">
            <h2 className="font-serif text-base font-semibold">Anotações</h2>
            <BlurSavedTextarea
              value={planner.projectNotes[contextId] ?? ''}
              onSave={(text) => planner.setProjectNote(contextId, text)}
              placeholder={`Anotações de ${title}…`}
              className={cn(inputClass, 'min-h-0 flex-1 resize-none font-serif text-sm italic text-ink-dim')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectTasksPanel({ planner, contextId, title }: { planner: UsePlannerReturn; contextId: string; title: string }) {
  const [modal, setModal] = useState<ModalState>(null)
  const [newTitle, setNewTitle] = useState('')
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const { handleMoveItem, handleToggleDone, handleAddSubtask } = useItemActions(planner)

  const items = planner.items.filter((it) => it.context === contextId && !it.dayId)
  const itemIds = new Set(items.map((it) => it.id))
  const topLevel = items.filter((it) => !it.parentId || !itemIds.has(it.parentId))
  const pendingTop = topLevel.filter((it) => !it.done)
  const doneTop = topLevel.filter((it) => it.done)

  function childrenOf(id: string): Item[] {
    return items.filter((it) => it.parentId === id).sort((a, b) => a.order - b.order)
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderRow(item: Item) {
    const children = childrenOf(item.id)
    const progress = children.length > 0 ? { done: children.filter((c) => c.done).length, total: children.length } : undefined
    const parent = item.parentId ? planner.items.find((it) => it.id === item.parentId) : undefined
    const collapsed = collapsedIds.has(item.id)
    return (
      <div key={item.id}>
        <ItemRow
          item={item}
          progress={progress}
          collapsed={collapsed}
          onToggleCollapsed={progress ? () => toggleCollapsed(item.id) : undefined}
          parentTitle={parent?.title}
          onToggleDone={() => handleToggleDone(item.id)}
          onOpen={() => setModal({ type: 'item', item })}
          onMove={(action) => handleMoveItem(item, action)}
        />
        {progress && !collapsed && <div className="flex flex-col">{children.map((c) => renderRow(c))}</div>}
      </div>
    )
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    planner.addItem({ type: 'task', title: newTitle.trim(), context: contextId })
    setNewTitle('')
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div>
        <h2 className="font-serif text-base font-semibold">Tarefas</h2>
        <p className="text-xs text-ink-dim">tarefas de {title} — mesma fonte do Backlog</p>
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        {pendingTop.length === 0 && <p className="p-2 font-mono text-[10px] text-ink-faint">nenhuma tarefa ainda</p>}
        {pendingTop.map((item) => renderRow(item))}
        {doneTop.length > 0 && <div className="mt-2 flex flex-col border-t border-line pt-2">{doneTop.map((item) => renderRow(item))}</div>}
      </div>

      <form onSubmit={handleAdd} className="flex gap-1.5">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={`Nova tarefa de ${title}…`}
          className={cn(inputClass, 'flex-1 text-sm')}
        />
        <button type="submit" className="flex shrink-0 items-center justify-center rounded-sm border border-line px-2 text-ink-dim hover:border-line-strong" aria-label="Adicionar tarefa">
          <Plus className="size-3.5" />
        </button>
      </form>

      <EditItemModal
        state={modal}
        items={planner.items}
        contexts={planner.contexts}
        onClose={() => setModal(null)}
        onAddContext={planner.addContext}
        onSave={(id, data) => {
          if (id) planner.updateItem(id, data)
          else planner.addItem({ ...data, order: Date.now() })
        }}
        onDelete={planner.deleteItem}
        onMove={handleMoveItem}
        onToggleItemDone={handleToggleDone}
        onAddSubtask={handleAddSubtask}
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
      <BlurSavedTextarea
        value={planner.estagioNotes}
        onSave={planner.setEstagioNotes}
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
