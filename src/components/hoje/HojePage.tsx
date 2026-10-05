import { DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragPendingEvent, DragStartEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { DayColumn } from '@/components/planner/DayColumn'
import { EditItemModal, type ModalState } from '@/components/planner/EditItemModal'
import { useItemActions } from '@/hooks/useItemActions'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { addDays, todayId } from '@/lib/dates'
import { dayOf } from '@/lib/days'
import { type ContainerRef, itemDndId, parseContainerId, PendingDndContext, splitDndId } from '@/lib/dnd'
import type { PeriodId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BacklogPanel } from './BacklogPanel'

interface HojePageProps {
  planner: UsePlannerReturn
}

interface DragPayload {
  dndId: string
}

type MobileTab = 'backlog' | 'hoje'

/**
 * Visão "Hoje" (2.3) — dois painéis 50/50 (Backlog | dia atual), sem faixa
 * de dias e sem navegação pra frente: só hoje e, pra trás, os dias
 * anteriores (um de cada vez). No celular vira abas.
 */
export function HojePage({ planner }: HojePageProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const [activeDragTitle, setActiveDragTitle] = useState<string | null>(null)
  const [pendingDndId, setPendingDndId] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('hoje')
  const { handleMoveItem, handleToggleDone, handleAddSubtask } = useItemActions(planner)

  const sensors = useSensors(
    // Mouse (desktop): arraste começa assim que o cursor se move um pouco, como antes.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Toque (mobile): precisa segurar 3s parado pra ativar — evita que um toque
    // qualquer (rolar a tela, tocar no checkbox) já mude o cartão de lugar.
    useSensor(TouchSensor, { activationConstraint: { delay: 3000, tolerance: 20 } }),
  )

  function handleDragPending(event: DragPendingEvent) {
    setPendingDndId(String(event.id))
  }
  function clearPending() {
    setPendingDndId(null)
  }

  const day = dayOf(planner.anchorDayId)

  function goPrev() {
    planner.setAnchorDay(addDays(planner.anchorDayId, -1))
  }
  function goToday() {
    planner.setAnchorDay(todayId())
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

  function handleRefineToWeek(id: string, weekId: string) {
    planner.updateItem(id, { referenceWeek: weekId, referenceMonth: undefined })
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
        <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-line lg:flex-row">
          <div className="flex shrink-0 border-b border-line lg:hidden">
            {(['backlog', 'hoje'] as MobileTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className={cn(
                  'flex-1 py-2 text-center text-xs font-semibold uppercase tracking-wide',
                  mobileTab === tab ? 'bg-ink text-paper' : 'text-ink-dim',
                )}
              >
                {tab === 'backlog' ? 'Backlog' : 'Hoje'}
              </button>
            ))}
          </div>

          <div className={cn('min-h-0 flex-1 border-line lg:block lg:w-1/2 lg:border-r', mobileTab === 'backlog' ? 'block' : 'hidden')}>
            <BacklogPanel
              items={planner.items}
              contexts={planner.contexts}
              onToggleDone={handleToggleDone}
              onOpen={(item) => setModal({ type: 'item', item })}
              onAdd={(data) => planner.addItem({ type: 'task', ...data })}
              onMoveItem={handleMoveItem}
              onRefineToWeek={handleRefineToWeek}
            />
          </div>

          <div className={cn('min-h-0 flex-1 overflow-y-auto lg:block lg:w-1/2', mobileTab === 'hoje' ? 'block' : 'hidden')}>
            <DayColumn
              dayId={day.id}
              weekday={day.weekday}
              items={planner.items.filter((i) => i.dayId === day.id)}
              allItems={planner.items}
              meta={planner.dayMeta[day.id] ?? {}}
              onSetCategory={planner.setDayCategory}
              onSetNote={planner.setDayNote}
              onToggleDone={handleToggleDone}
              onOpenItem={(item) => setModal({ type: 'item', item })}
              onAddItem={(dayId) => setModal({ type: 'new', dayId })}
              onMoveItem={handleMoveItem}
              onGoPrev={goPrev}
              onGoToday={goToday}
              showTodayButton={day.id !== todayId()}
            />
          </div>
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
        items={planner.items}
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
        onMove={handleMoveItem}
        onToggleItemDone={handleToggleDone}
        onAddSubtask={handleAddSubtask}
      />
    </DndContext>
  )
}
