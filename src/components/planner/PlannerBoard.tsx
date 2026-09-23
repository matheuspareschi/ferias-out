import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { DAYS, dayIndex, isPastDay } from '@/lib/days'
import { DEFAULT_DURATION, HOUR_HEIGHT, clampStartMinutes, minutesToTime, snapMinutes } from '@/lib/grid'
import type { BacklogCategory, BacklogSize } from '@/lib/types'
import { BacklogSidebar } from './BacklogSidebar'
import { DayColumn } from './DayColumn'
import { EditItemModal, type ModalState } from './EditItemModal'

interface PlannerBoardProps {
  planner: UsePlannerReturn
}

interface DragPayload {
  dndId: string
}

interface DropPayload {
  type: 'grid' | 'unscheduled' | 'sidebar'
  dayId?: string
}

function splitDndId(dndId: string): { kind: 'agenda' | 'backlog'; id: string } {
  const sep = dndId.indexOf(':')
  return { kind: dndId.slice(0, sep) as 'agenda' | 'backlog', id: dndId.slice(sep + 1) }
}

export function PlannerBoard({ planner }: PlannerBoardProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const [activeDragTitle, setActiveDragTitle] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragTitle(null)
    const { active, over, delta, activatorEvent } = event
    if (!over) return
    const data = active.data.current as DragPayload | undefined
    if (!data) return
    const { kind, id } = splitDndId(data.dndId)
    const overData = over.data.current as DropPayload | undefined
    if (!overData) return

    if (overData.type === 'grid' && overData.dayId) {
      const dayId = overData.dayId
      if (isPastDay(dayId)) return
      const clientY = 'clientY' in activatorEvent ? (activatorEvent as PointerEvent).clientY : 0
      const pointerY = clientY + delta.y
      const relativeY = pointerY - over.rect.top
      const rawMinutes = 6 * 60 + (relativeY / HOUR_HEIGHT) * 60

      if (kind === 'agenda') {
        const item = planner.agendaItems.find((i) => i.id === id)
        if (!item) return
        const duration = item.duration ?? DEFAULT_DURATION
        const start = minutesToTime(snapMinutes(clampStartMinutes(rawMinutes, duration)))
        planner.updateAgendaItem(id, { dayId, start, duration })
      } else {
        const item = planner.backlogItems.find((i) => i.id === id)
        if (!item) return
        const duration = item.allocation?.duration ?? DEFAULT_DURATION
        const start = minutesToTime(snapMinutes(clampStartMinutes(rawMinutes, duration)))
        planner.allocate(id, dayId, start, duration)
      }
      return
    }

    if (overData.type === 'unscheduled' && overData.dayId) {
      if (kind === 'agenda') {
        const dayId = overData.dayId
        if (isPastDay(dayId)) return
        planner.updateAgendaItem(id, { dayId, start: null })
      }
      return
    }

    if (overData.type === 'sidebar' && kind === 'backlog') {
      planner.unallocate(id)
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
            {windowDays.map((day) => (
              <DayColumn
                key={day.id}
                dayId={day.id}
                weekday={day.weekday}
                isAnchor={day.id === planner.anchorDayId}
                agendaItems={planner.agendaItems.filter((i) => i.dayId === day.id)}
                allocatedBacklogItems={planner.backlogItems.filter((i) => i.allocation?.dayId === day.id)}
                category={planner.dayCategories[day.id] ?? null}
                onSetCategory={planner.setDayCategory}
                onToggleDone={planner.toggleDone}
                onOpenAgenda={(item) => setModal({ type: 'agenda', item })}
                onOpenBacklog={(item) => setModal({ type: 'backlog', item })}
                onResizeAgenda={(id, duration) => planner.updateAgendaItem(id, { duration })}
                onResizeBacklog={(id, duration) => {
                  const item = planner.backlogItems.find((i) => i.id === id)
                  if (item?.allocation) {
                    planner.allocate(id, item.allocation.dayId, item.allocation.start, duration)
                  }
                }}
                onAddAgenda={(dayId) => setModal({ type: 'agenda-new', dayId })}
              />
            ))}
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
          if (id) planner.updateAgendaItem(id, data)
          else planner.addAgendaItem(dayId, data)
        }}
        onDeleteAgenda={planner.deleteAgendaItem}
        onSaveBacklog={(id, data) => planner.updateBacklogItem(id, data)}
        onDeleteBacklog={planner.deleteBacklogItem}
        onUnallocate={planner.unallocate}
      />
    </DndContext>
  )
}
