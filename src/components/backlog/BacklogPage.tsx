import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { AddBacklogItemForm } from '@/components/planner/AddBacklogItemForm'
import { EditItemModal, type ModalState } from '@/components/planner/EditItemModal'
import { ItemRow } from '@/components/planner/ItemRow'
import { useItemActions } from '@/hooks/useItemActions'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { contextLabel } from '@/lib/contexts'
import { addMonths, monthIdOf, todayId } from '@/lib/dates'
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

/**
 * Página cheia do Backlog (Fase 5) — mesma fonte de dados do painel
 * compacto da Semana (2.3): qualquer item sem `dayId`. Os filtros
 * (mês de referência + contexto) são independentes, compostos em
 * sequência — basta somar mais um `.filter(...)` aqui pra entrar um
 * filtro novo (ex.: Trabalho, seção 9) sem mexer no resto da página.
 */
export function BacklogPage({ planner }: BacklogPageProps) {
  const [month, setMonth] = useState(() => monthIdOf(todayId()))
  const [allMonths, setAllMonths] = useState(false)
  const [contextFilter, setContextFilter] = useState<string>(CONTEXT_ALL)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>(null)
  const { handleMoveItem, handleToggleDone, handleAddSubtask } = useItemActions(planner)

  let backlogItems = planner.items.filter((it) => !it.dayId)
  if (!allMonths) backlogItems = backlogItems.filter((it) => !it.referenceMonth || it.referenceMonth === month)
  if (contextFilter !== CONTEXT_ALL) backlogItems = backlogItems.filter((it) => it.context === contextFilter)

  const backlogIds = new Set(backlogItems.map((it) => it.id))
  const topLevel = backlogItems.filter((it) => !it.parentId || !backlogIds.has(it.parentId))
  const pendingTop = topLevel.filter((it) => !it.done)
  const doneTop = topLevel.filter((it) => it.done)

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
          sizeSuffix={item.context === 'faculdade' ? item.size : undefined}
          onToggleDone={() => handleToggleDone(item.id)}
          onOpen={() => setModal({ type: 'item', item })}
          onMove={(action) => handleMoveItem(item, action)}
        />
        {progress && !collapsed && <div className="flex flex-col">{children.map((c) => renderRow(c))}</div>}
      </div>
    )
  }

  const groups: { context: Context; items: Item[] }[] = []
  for (const context of planner.contexts) {
    const group = pendingTop.filter((it) => it.context === context.id)
    if (group.length > 0) groups.push({ context, items: group })
  }
  const orphanContextIds = new Set(pendingTop.map((it) => it.context).filter((id) => !planner.contexts.some((c) => c.id === id)))
  for (const id of orphanContextIds) {
    groups.push({ context: { id, label: id }, items: pendingTop.filter((it) => it.context === id) })
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pb-4">
      <h1 className="font-serif text-lg font-semibold">Backlog</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            disabled={allMonths}
            className="rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-dim hover:text-ink disabled:opacity-30"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className={cn('font-mono text-xs', allMonths ? 'text-ink-faint' : 'text-ink-dim')}>{formatMonthLabel(month)}</span>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            disabled={allMonths}
            className="rounded-sm p-1 text-ink-dim transition-colors hover:bg-paper-dim hover:text-ink disabled:opacity-30"
            aria-label="Mês seguinte"
          >
            <ChevronRight className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAllMonths((v) => !v)}
            className={cn('ml-1 rounded-sm px-2 py-1 text-xs', allMonths ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-paper-dim')}
          >
            todos os meses
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

      <div className="flex flex-col gap-3 rounded-sm border border-line bg-paper-raised/40 p-2">
        {pendingTop.length === 0 && <p className="p-2 font-mono text-[10px] text-ink-faint">backlog vazio</p>}
        {groups.map(({ context, items: groupItems }) => (
          <div key={context.id} className="flex flex-col gap-0.5">
            <p className="px-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint">{contextLabel(planner.contexts, context.id)}</p>
            {groupItems.map((item) => renderRow(item))}
          </div>
        ))}
        {doneTop.length > 0 && <div className="flex flex-col border-t border-line pt-2">{doneTop.map((item) => renderRow(item))}</div>}
      </div>

      <div className="max-w-sm">
        <AddBacklogItemForm contexts={planner.contexts} onAdd={(data) => planner.addItem({ type: 'task', ...data })} />
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
