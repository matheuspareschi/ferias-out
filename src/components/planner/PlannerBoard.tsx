import { DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragPendingEvent, DragStartEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addDays, todayId } from '@/lib/dates'
import { daysAround } from '@/lib/days'
import { type ContainerRef, itemDndId, parseContainerId, PendingDndContext, splitDndId } from '@/lib/dnd'
import type { ItemSize, PeriodId } from '@/lib/types'
import { BacklogSidebar } from './BacklogSidebar'
import { DayColumn } from './DayColumn'
import { EditItemModal, type ModalState } from './EditItemModal'
import { PendingReviewPanel } from './PendingReviewPanel'

interface PlannerBoardProps {
  planner: UsePlannerReturn
}

interface DragPayload {
  dndId: string
}

export function PlannerBoard({ planner }: PlannerBoardProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const [activeDragTitle, setActiveDragTitle] = useState<string | null>(null)
  const [pendingDndId, setPendingDndId] = useState<string | null>(null)

  const sensors = useSensors(
    // Mouse (desktop): arraste começa assim que o cursor se move um pouco, como antes.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Toque (mobile): precisa segurar 3s parado pra ativar — evita que um toque
    // qualquer (rolar a tela, tocar no checkbox) já mude o cartão de lugar. A
    // tolerância é generosa porque segurar o dedo perfeitamente parado por 3s
    // reais não é realista — um pouco de tremor não pode cancelar o arraste.
    useSensor(TouchSensor, { activationConstraint: { delay: 3000, tolerance: 20 } }),
  )

  function handleDragPending(event: DragPendingEvent) {
    setPendingDndId(String(event.id))
  }
  function clearPending() {
    setPendingDndId(null)
  }

  // Calendário sem fim: sempre 3 dias (ontem/hoje/amanhã em relação à âncora),
  // sem limite de início ou fim pra nenhum dos lados.
  const windowDays = daysAround(planner.anchorDayId, 1, 1)

  function goPrev() {
    planner.setAnchorDay(addDays(planner.anchorDayId, -1))
  }
  function goNext() {
    planner.setAnchorDay(addDays(planner.anchorDayId, 1))
  }

  function handleDragStart(event: DragStartEvent) {
    setPendingDndId(null)
    const data = event.active.data.current as DragPayload | undefined
    if (!data) return
    const { id } = splitDndId(data.dndId)
    setActiveDragTitle(planner.items.find((i) => i.id === id)?.title ?? null)
  }

  /** Ids (dndId) + order de tudo que já está no destino, na ordem atual. */
  function entriesFor(container: ContainerRef): { dndId: string; order: number }[] {
    if (container.type === 'sidebar') return []
    if (container.type === 'unassigned') {
      return planner.items
        .filter((it) => it.dayId === container.dayId && !it.period)
        .map((it) => ({ dndId: itemDndId(it.id), order: it.order }))
        .sort((a, b) => a.order - b.order)
    }
    return planner.items
      .filter((it) => it.dayId === container.dayId && it.period === container.period)
      .map((it) => ({ dndId: itemDndId(it.id), order: it.order }))
      .sort((a, b) => a.order - b.order)
  }

  /** Resolve em qual container (período/sem período/sidebar) um item já está hoje. */
  function containerOfItem(dndId: string): ContainerRef | null {
    const { id } = splitDndId(dndId)
    const item = planner.items.find((i) => i.id === id)
    if (!item) return null
    if (!item.dayId) return { type: 'sidebar' }
    return item.period ? { type: 'period', dayId: item.dayId, period: item.period } : { type: 'unassigned', dayId: item.dayId }
  }

  function resolveTarget(overId: string): ContainerRef | null {
    return parseContainerId(overId) ?? containerOfItem(overId)
  }

  function appendOrder(container: ContainerRef, excludeDndId?: string): number {
    const entries = entriesFor(container).filter((e) => e.dndId !== excludeDndId)
    return entries.length === 0 ? 0 : entries[entries.length - 1].order + 1
  }

  function computeOrder(entries: { dndId: string; order: number }[], activeDndId: string, overId: string): number {
    const rest = entries.filter((e) => e.dndId !== activeDndId)
    if (rest.length === 0) return 0
    const overIsItem = parseContainerId(overId) === null
    if (!overIsItem) return rest[rest.length - 1].order + 1
    const idx = rest.findIndex((e) => e.dndId === overId)
    if (idx === -1) return rest[rest.length - 1].order + 1
    if (idx === 0) return rest[0].order - 1
    return (rest[idx - 1].order + rest[idx].order) / 2
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragTitle(null)
    setPendingDndId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const data = active.data.current as DragPayload | undefined
    if (!data) return
    const { id } = splitDndId(data.dndId)

    const target = resolveTarget(String(over.id))
    if (!target) return

    if (target.type === 'sidebar') {
      planner.updateItem(id, { dayId: undefined, period: null })
      return
    }

    const entries = entriesFor(target)
    const order = computeOrder(entries, data.dndId, String(over.id))
    const period: PeriodId | null = target.type === 'period' ? target.period : null
    planner.updateItem(id, { dayId: target.dayId, period, order })
  }

  function migrateToDay(id: string, dayId: string) {
    const item = planner.items.find((i) => i.id === id)
    if (!item) return
    const container: ContainerRef = { type: 'unassigned', dayId }
    const order = appendOrder(container, itemDndId(id))
    planner.updateItem(id, { dayId, period: null, order, migratedFrom: item.dayId })
  }

  function backToBacklog(id: string) {
    const item = planner.items.find((i) => i.id === id)
    if (!item) return
    planner.updateItem(id, { dayId: undefined, period: null, migratedFrom: item.dayId })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragPending={handleDragPending}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragAbort={clearPending}
      onDragCancel={() => {
        setActiveDragTitle(null)
        setPendingDndId(null)
      }}
    >
      <PendingDndContext.Provider value={pendingDndId}>
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:overflow-hidden">
          <div className="flex flex-1 flex-col gap-2 lg:overflow-hidden">
            <PendingReviewPanel
              items={planner.items}
              onMigrateToday={(id) => migrateToDay(id, todayId())}
              onMigrateDate={migrateToDay}
              onBackToBacklog={backToBacklog}
              onDiscard={planner.deleteItem}
            />
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={goPrev}
                className="flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
              >
                <ChevronLeft className="size-3.5" /> anterior
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
              >
                seguinte <ChevronRight className="size-3.5" />
              </button>
            </div>
            <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:overflow-hidden">
              {windowDays.map((day) => {
                const isAnchor = day.id === planner.anchorDayId
                return (
                  <div key={day.id} className={isAnchor ? 'contents' : 'hidden sm:contents'}>
                    <DayColumn
                      dayId={day.id}
                      weekday={day.weekday}
                      isAnchor={isAnchor}
                      items={planner.items.filter((i) => i.dayId === day.id)}
                      meta={planner.dayMeta[day.id] ?? {}}
                      onSetCategory={planner.setDayCategory}
                      onSetNote={planner.setDayNote}
                      onToggleDone={planner.toggleDone}
                      onOpenItem={(item) => setModal({ type: 'item', item })}
                      onAddItem={(dayId) => setModal({ type: 'new', dayId })}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <BacklogSidebar
            items={planner.items}
            contexts={planner.contexts}
            onToggleDone={planner.toggleDone}
            onToggleSubitem={(itemId, subitemId) => {
              const item = planner.items.find((i) => i.id === itemId)
              if (!item?.subitems) return
              planner.updateItem(itemId, {
                subitems: item.subitems.map((s) => (s.id === subitemId ? { ...s, done: !s.done } : s)),
              })
            }}
            onOpen={(item) => setModal({ type: 'item', item })}
            onAdd={(data: { title: string; context: string; size: ItemSize }) =>
              planner.addItem({ type: 'task', ...data })
            }
          />
        </div>
      </PendingDndContext.Provider>

      <DragOverlay>
        {activeDragTitle && (
          <div className="max-w-48 truncate rounded-sm border border-line-strong bg-paper-raised px-2 py-1 text-xs shadow-lifted">
            {activeDragTitle}
          </div>
        )}
      </DragOverlay>

      <EditItemModal
        state={modal}
        contexts={planner.contexts}
        onClose={() => setModal(null)}
        onAddContext={planner.addContext}
        onSave={(id, data) => {
          if (id) {
            const existing = planner.items.find((i) => i.id === id)
            const samePlace = existing && existing.dayId === data.dayId && existing.period === data.period
            const order = samePlace
              ? existing.order
              : data.dayId
                ? appendOrder(
                    data.period ? { type: 'period', dayId: data.dayId, period: data.period } : { type: 'unassigned', dayId: data.dayId },
                    itemDndId(id),
                  )
                : 0
            planner.updateItem(id, { ...data, order })
          } else {
            const order = data.dayId
              ? appendOrder(
                  data.period ? { type: 'period', dayId: data.dayId, period: data.period } : { type: 'unassigned', dayId: data.dayId },
                )
              : 0
            planner.addItem({ ...data, order })
          }
        }}
        onDelete={planner.deleteItem}
      />
    </DndContext>
  )
}
