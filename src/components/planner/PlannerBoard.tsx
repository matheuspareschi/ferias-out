import { DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { DAYS, dayIndex, isPastDay } from '@/lib/days'
import { agendaDndId, backlogAllocDndId, type ContainerRef, parseContainerId, splitDndId } from '@/lib/dnd'
import type { BacklogCategory, BacklogSize, PeriodId } from '@/lib/types'
import { BacklogSidebar } from './BacklogSidebar'
import { DayColumn } from './DayColumn'
import { EditItemModal, type ModalState } from './EditItemModal'

interface PlannerBoardProps {
  planner: UsePlannerReturn
}

interface DragPayload {
  dndId: string
}

export function PlannerBoard({ planner }: PlannerBoardProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const [activeDragTitle, setActiveDragTitle] = useState<string | null>(null)

  const sensors = useSensors(
    // Mouse (desktop): arraste começa assim que o cursor se move um pouco, como antes.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Toque (mobile): precisa segurar 3s parado pra ativar — evita que um toque
    // qualquer (rolar a tela, tocar no checkbox) já mude o cartão de lugar.
    useSensor(TouchSensor, { activationConstraint: { delay: 3000, tolerance: 8 } }),
  )

  const anchorIdx = dayIndex(planner.anchorDayId)
  const windowDays = [DAYS[anchorIdx - 1], DAYS[anchorIdx], DAYS[anchorIdx + 1]].filter(
    (d): d is (typeof DAYS)[number] => Boolean(d),
  )

  function goPrev() {
    if (anchorIdx > 0) planner.setAnchorDay(DAYS[anchorIdx - 1].id)
  }
  function goNext() {
    if (anchorIdx < DAYS.length - 1) planner.setAnchorDay(DAYS[anchorIdx + 1].id)
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragPayload | undefined
    if (!data) return
    const { kind, id } = splitDndId(data.dndId)
    const title =
      kind === 'agenda'
        ? planner.agendaItems.find((i) => i.id === id)?.title
        : planner.backlogItems.find((i) => i.id === id)?.title
    setActiveDragTitle(title ?? null)
  }

  /** Ids (dndId) + order de tudo que já está no destino, na ordem atual. */
  function entriesFor(container: ContainerRef): { dndId: string; order: number }[] {
    if (container.type === 'sidebar') return []
    if (container.type === 'unassigned') {
      return planner.agendaItems
        .filter((it) => it.dayId === container.dayId && !it.period)
        .map((it) => ({ dndId: agendaDndId(it.id), order: it.order }))
    }
    const agenda = planner.agendaItems
      .filter((it) => it.dayId === container.dayId && it.period === container.period)
      .map((it) => ({ dndId: agendaDndId(it.id), order: it.order }))
    const backlog = planner.backlogItems
      .filter((it) => it.allocation?.dayId === container.dayId && it.allocation?.period === container.period)
      .map((it) => ({ dndId: backlogAllocDndId(it.id), order: it.allocation!.order }))
    return [...agenda, ...backlog].sort((a, b) => a.order - b.order)
  }

  /** Resolve em qual container (período/sem período/sidebar) um id de item já está hoje. */
  function containerOfItem(dndId: string): ContainerRef | null {
    const { kind, id } = splitDndId(dndId)
    if (kind === 'agenda') {
      const item = planner.agendaItems.find((i) => i.id === id)
      if (!item) return null
      return item.period ? { type: 'period', dayId: item.dayId, period: item.period } : { type: 'unassigned', dayId: item.dayId }
    }
    const item = planner.backlogItems.find((i) => i.id === id)
    if (!item) return null
    return item.allocation ? { type: 'period', dayId: item.allocation.dayId, period: item.allocation.period } : { type: 'sidebar' }
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
    const { active, over } = event
    if (!over || active.id === over.id) return
    const data = active.data.current as DragPayload | undefined
    if (!data) return
    const { kind, id } = splitDndId(data.dndId)

    const target = resolveTarget(String(over.id))
    if (!target) return

    if (target.type === 'sidebar') {
      if (kind === 'backlog') planner.unallocate(id)
      return
    }

    if (isPastDay(target.dayId)) return

    const entries = entriesFor(target)
    const order = computeOrder(entries, data.dndId, String(over.id))

    if (kind === 'agenda') {
      const period: PeriodId | null = target.type === 'period' ? target.period : null
      planner.updateAgendaItem(id, { dayId: target.dayId, period, order })
    } else if (target.type === 'period') {
      planner.allocate(id, target.dayId, target.period, order)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragTitle(null)}
    >
      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:overflow-hidden">
        <div className="flex flex-1 flex-col gap-2 lg:overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={anchorIdx <= 0}
              className="flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" /> anterior
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={anchorIdx >= DAYS.length - 1}
              className="flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink disabled:pointer-events-none disabled:opacity-30"
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
                    agendaItems={planner.agendaItems.filter((i) => i.dayId === day.id)}
                    allocatedBacklogItems={planner.backlogItems.filter((i) => i.allocation?.dayId === day.id)}
                    category={planner.dayCategories[day.id] ?? null}
                    onSetCategory={planner.setDayCategory}
                    onToggleDone={planner.toggleDone}
                    onOpenAgenda={(item) => setModal({ type: 'agenda', item })}
                    onOpenBacklog={(item) => setModal({ type: 'backlog', item })}
                    onAddAgenda={(dayId) => setModal({ type: 'agenda-new', dayId })}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <BacklogSidebar
          items={planner.backlogItems}
          onToggleDone={planner.toggleDone}
          onOpen={(item) => setModal({ type: 'backlog', item })}
          onAdd={(data: { title: string; category: BacklogCategory; size: BacklogSize }) =>
            planner.addBacklogItem(data)
          }
        />
      </div>

      <DragOverlay>
        {activeDragTitle && (
          <div className="max-w-48 truncate rounded-sm border border-line-strong bg-paper-raised px-2 py-1 text-xs shadow-lifted">
            {activeDragTitle}
          </div>
        )}
      </DragOverlay>

      <EditItemModal
        state={modal}
        onClose={() => setModal(null)}
        onSaveAgenda={(id, dayId, data) => {
          const container: ContainerRef = data.period
            ? { type: 'period', dayId, period: data.period }
            : { type: 'unassigned', dayId }
          if (id) {
            const existing = planner.agendaItems.find((i) => i.id === id)
            const samePlace = existing && existing.dayId === dayId && existing.period === data.period
            const order = samePlace ? existing.order : appendOrder(container, agendaDndId(id))
            planner.updateAgendaItem(id, { ...data, dayId, order })
          } else {
            planner.addAgendaItem(dayId, { ...data, order: appendOrder(container) })
          }
        }}
        onDeleteAgenda={planner.deleteAgendaItem}
        onSaveBacklog={(id, data) => planner.updateBacklogItem(id, data)}
        onDeleteBacklog={planner.deleteBacklogItem}
        onUnallocate={planner.unallocate}
        onReallocate={(id, dayId, period) => {
          const order = appendOrder({ type: 'period', dayId, period }, backlogAllocDndId(id))
          planner.allocate(id, dayId, period, order)
        }}
      />
    </DndContext>
  )
}
