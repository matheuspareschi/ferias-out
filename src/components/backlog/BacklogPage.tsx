import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { AddBacklogItemForm } from '@/components/planner/AddBacklogItemForm'
import { EditItemModal, type ModalState } from '@/components/planner/EditItemModal'
import { ItemRow } from '@/components/planner/ItemRow'
import { useItemActions } from '@/hooks/useItemActions'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { itemsForScope, type BacklogScope } from '@/lib/backlogScope'
import { contextLabel } from '@/lib/contexts'
import { addIsoWeeks, addMonths, isoWeekOf, isoWeekStart, monthIdOf, todayId } from '@/lib/dates'
import type { Context, Item } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BacklogPageProps {
  planner: UsePlannerReturn
}

const CONTEXT_ALL = 'todos'

function formatMonthLabel(monthId: string): string {
  const [y, m] = monthId.split('-').map(Number)
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatWeekLabel(weekId: string): string {
  const [, m, d] = isoWeekStart(weekId).split('-')
  return `semana de ${d}/${m}`
}

/**
 * Página cheia do Backlog (Fase 5/6) — mesma fonte de dados do painel
 * compacto da Hoje (2.3.1): qualquer item sem `dayId`, filtrado por
 * itemsForScope. Os filtros (semana/mês + contexto) são independentes,
 * compostos em sequência — basta somar mais um `.filter(...)` aqui pra
 * entrar um filtro novo (ex.: Trabalho, seção 9) sem mexer no resto.
 */
export function BacklogPage({ planner }: BacklogPageProps) {
  const [scope, setScope] = useState<BacklogScope>('mes')
  const [week, setWeek] = useState(() => isoWeekOf(todayId()))
  const [month, setMonth] = useState(() => monthIdOf(todayId()))
  const [contextFilter, setContextFilter] = useState<string>(CONTEXT_ALL)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { handleMoveItem, handleToggleDone, handleAddSubtask } = useItemActions(planner)

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** Ação em lote (seção 6): aplica a mesma ação de 2.7 em todo item selecionado, depois limpa a seleção. */
  function applyBatch(kind: 'week' | 'month' | 'backlog') {
    for (const id of selectedIds) {
      const item = planner.items.find((it) => it.id === id)
      if (item) handleMoveItem(item, { kind })
    }
    setSelectedIds(new Set())
  }

  let backlogItems = itemsForScope(planner.items, scope, week, month)
  if (contextFilter !== CONTEXT_ALL) backlogItems = backlogItems.filter((it) => it.context === contextFilter)

  // "sem período" (seção 6): itens sem semana nem mês de referência — já
  // inclusos em qualquer escopo por itemsForScope, mas aparecem aqui numa
  // seção própria em vez de misturados com os do período ativo.
  const withPeriod = backlogItems.filter((it) => Boolean(it.referenceWeek || it.referenceMonth))
  const semPeriodo = backlogItems.filter((it) => !it.referenceWeek && !it.referenceMonth)

  const backlogIds = new Set(backlogItems.map((it) => it.id))

  function childrenOf(id: string): Item[] {
    return backlogItems.filter((it) => it.parentId === id).sort((a, b) => a.order - b.order)
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderRow(item: Item, selectable = false) {
    const children = childrenOf(item.id)
    const progress = children.length > 0 ? { done: children.filter((c) => c.done).length, total: children.length } : undefined
    const parent = item.parentId ? planner.items.find((it) => it.id === item.parentId) : undefined
    const collapsed = collapsedIds.has(item.id)
    return (
      <div key={item.id} className="flex items-start gap-1">
        {selectable && (
          <input
            type="checkbox"
            checked={selectedIds.has(item.id)}
            onChange={() => toggleSelected(item.id)}
            className="mt-1.5 size-3 shrink-0 accent-accent"
            aria-label={`Selecionar ${item.title}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <ItemRow
            item={item}
            progress={progress}
            collapsed={collapsed}
            onToggleCollapsed={progress ? () => toggleCollapsed(item.id) : undefined}
            parentTitle={parent?.title}
            sizeSuffix={item.context === 'faculdade' ? item.size : undefined}
            onToggleDone={() => handleToggleDone(item.id)}
            onOpen={() => setModal({ type: 'item', item })}
            onMove={(action) => handleMoveItem(item, action)}
          />
          {progress && !collapsed && <div className="flex flex-col">{children.map((c) => renderRow(c))}</div>}
        </div>
      </div>
    )
  }

  function groupByContext(list: Item[]): { context: Context; items: Item[] }[] {
    const topLevel = list.filter((it) => !it.parentId || !backlogIds.has(it.parentId))
    const pendingTop = topLevel.filter((it) => !it.done)
    const doneTop = topLevel.filter((it) => it.done)
    const groups: { context: Context; items: Item[] }[] = []
    for (const context of planner.contexts) {
      const group = pendingTop.filter((it) => it.context === context.id)
      if (group.length > 0) groups.push({ context, items: group })
    }
    const orphanContextIds = new Set(pendingTop.map((it) => it.context).filter((id) => !planner.contexts.some((c) => c.id === id)))
    for (const id of orphanContextIds) {
      groups.push({ context: { id, label: id }, items: pendingTop.filter((it) => it.context === id) })
    }
    return [...groups, ...(doneTop.length > 0 ? [{ context: { id: '__done', label: 'concluídos' }, items: doneTop }] : [])]
  }

  const periodGroups = groupByContext(withPeriod)
  const semPeriodoGroups = groupByContext(semPeriodo)

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pb-4">
      <h1 className="font-serif text-lg font-semibold">Backlog</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {(['semana', 'mes'] as BacklogScope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cn('rounded-sm px-2 py-1 text-xs', scope === s ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-paper-dim')}
            >
              {s === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => (scope === 'semana' ? setWeek((w) => addIsoWeeks(w, -1)) : setMonth((m) => addMonths(m, -1)))}
            className="rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-dim hover:text-ink"
            aria-label="Período anterior"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="font-mono text-xs text-ink-dim">{scope === 'semana' ? formatWeekLabel(week) : formatMonthLabel(month)}</span>
          <button
            type="button"
            onClick={() => (scope === 'semana' ? setWeek((w) => addIsoWeeks(w, 1)) : setMonth((m) => addMonths(m, 1)))}
            className="rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-dim hover:text-ink"
            aria-label="Período seguinte"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        <select
          value={contextFilter}
          onChange={(e) => setContextFilter(e.target.value)}
          className="rounded-sm border border-line bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-accent"
        >
          <option value={CONTEXT_ALL}>todos os contextos</option>
          {planner.contexts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-accent bg-accent-soft/40 px-2 py-1.5">
          <span className="font-mono text-xs text-ink-dim">{selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}</span>
          <button type="button" onClick={() => applyBatch('week')} className="rounded-sm border border-line bg-paper px-2 py-1 text-xs text-ink-dim hover:border-line-strong hover:text-ink">
            colocar na semana
          </button>
          <button type="button" onClick={() => applyBatch('month')} className="rounded-sm border border-line bg-paper px-2 py-1 text-xs text-ink-dim hover:border-line-strong hover:text-ink">
            colocar no mês
          </button>
          <button type="button" onClick={() => applyBatch('backlog')} className="rounded-sm border border-line bg-paper px-2 py-1 text-xs text-ink-dim hover:border-line-strong hover:text-ink">
            tirar (sem período)
          </button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-ink-faint hover:text-ink">
            cancelar seleção
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-sm border border-line bg-paper-raised/40 p-2">
        {withPeriod.length === 0 && <p className="p-2 font-mono text-[10px] text-ink-faint">nada neste período</p>}
        {periodGroups.map(({ context, items: groupItems }) => (
          <div key={context.id} className="flex flex-col gap-0.5">
            <p className="px-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
              {context.id === '__done' ? context.label : contextLabel(planner.contexts, context.id)}
            </p>
            {groupItems.map((item) => renderRow(item, true))}
          </div>
        ))}
      </div>

      {semPeriodo.length > 0 && (
        <div className="flex flex-col gap-3 rounded-sm border border-dashed border-line p-2">
          <p className="px-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint">sem período</p>
          {semPeriodoGroups.map(({ context, items: groupItems }) => (
            <div key={context.id} className="flex flex-col gap-0.5">
              <p className="px-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                {context.id === '__done' ? context.label : contextLabel(planner.contexts, context.id)}
              </p>
              {groupItems.map((item) => renderRow(item, true))}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-sm">
        <AddBacklogItemForm
          contexts={planner.contexts}
          onAdd={(data) =>
            planner.addItem({
              type: 'task',
              ...data,
              referenceWeek: scope === 'semana' ? week : undefined,
              referenceMonth: scope === 'mes' ? month : undefined,
            })
          }
        />
      </div>

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
