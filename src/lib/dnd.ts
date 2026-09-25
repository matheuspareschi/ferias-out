import type { PeriodId } from './types'

/**
 * Esquema de ids de arraste (dnd-kit). Cada draggable montado precisa de um id
 * único DENTRO do DndContext — um AgendaItem "hábito" pode estar montado ao
 * mesmo tempo na HabitStrip (sempre visível) e como card num período (quando
 * tem período), e um BacklogItem alocado fica montado tanto no card da
 * sidebar quanto no card do período. Por isso cada "papel" tem seu próprio
 * prefixo, mesmo quando aponta para o mesmo registro de dados.
 */
export type DndKind = 'agenda' | 'backlog'

const PREFIX_KIND: Record<string, DndKind> = {
  agenda: 'agenda',
  habit: 'agenda',
  backlog: 'backlog',
  'backlog-alloc': 'backlog',
}

export function agendaDndId(id: string): string {
  return `agenda:${id}`
}

export function habitDndId(id: string): string {
  return `habit:${id}`
}

export function backlogCardDndId(id: string): string {
  return `backlog:${id}`
}

export function backlogAllocDndId(id: string): string {
  return `backlog-alloc:${id}`
}

export function splitDndId(dndId: string): { kind: DndKind; id: string } {
  const sep = dndId.indexOf(':')
  const prefix = dndId.slice(0, sep)
  const id = dndId.slice(sep + 1)
  return { kind: PREFIX_KIND[prefix] ?? 'agenda', id }
}

export const SIDEBAR_CONTAINER_ID = 'sidebar'

export function periodContainerId(dayId: string, period: PeriodId): string {
  return `period:${dayId}:${period}`
}

export function unassignedContainerId(dayId: string): string {
  return `unassigned:${dayId}`
}

export type ContainerRef =
  | { type: 'period'; dayId: string; period: PeriodId }
  | { type: 'unassigned'; dayId: string }
  | { type: 'sidebar' }

export function parseContainerId(id: string): ContainerRef | null {
  if (id === SIDEBAR_CONTAINER_ID) return { type: 'sidebar' }
  if (id.startsWith('period:')) {
    const [, dayId, period] = id.split(':')
    return { type: 'period', dayId, period: period as PeriodId }
  }
  if (id.startsWith('unassigned:')) {
    const [, dayId] = id.split(':')
    return { type: 'unassigned', dayId }
  }
  return null
}
