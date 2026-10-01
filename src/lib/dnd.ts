import { CSS } from '@dnd-kit/utilities'
import type { Transform } from '@dnd-kit/utilities'
import { createContext, useContext } from 'react'
import type { PeriodId } from './types'

/**
 * Id do item em "espera de ativação" (segurando, ainda dentro dos 3s do toque
 * prolongado) — usado só pra pintar o preenchimento de "carregando" no card
 * certo enquanto a pessoa segura. `null` quando nada está pendente.
 */
export const PendingDndContext = createContext<string | null>(null)

export function usePendingDnd(dndId: string): boolean {
  return useContext(PendingDndContext) === dndId
}

const POP_SCALE = 1.05
const POP_TRANSITION = 'transform 150ms ease, box-shadow 150ms ease'

/**
 * Estilo de transform/transition de um item `useSortable` — dá um leve salto de
 * escala assim que o toque prolongado ativa o arraste (feedback de "agora dá
 * pra mover"), sem interferir na animação de encaixe do dnd-kit fora disso.
 */
export function sortableDragStyle(
  transform: Transform | null,
  transition: string | undefined,
  isDragging: boolean,
): { transform: string | undefined; transition: string | undefined } {
  if (!isDragging) return { transform: CSS.Transform.toString(transform), transition }
  const base = transform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1 }
  return {
    transform: CSS.Transform.toString({ ...base, scaleX: base.scaleX * POP_SCALE, scaleY: base.scaleY * POP_SCALE }),
    transition: POP_TRANSITION,
  }
}

/** Mesmo salto de ativação, para um item `useDraggable` (transform só de translação). */
export function draggableDragStyle(
  transform: Transform | null,
  isDragging: boolean,
): { transform: string | undefined; transition: string | undefined } {
  if (!isDragging) return { transform: transform ? CSS.Translate.toString(transform) : undefined, transition: undefined }
  const base = transform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1 }
  return {
    transform: `${CSS.Translate.toString(base)} scale(${POP_SCALE})`,
    transition: POP_TRANSITION,
  }
}

/**
 * Esquema de ids de arraste (dnd-kit). Cada draggable montado precisa de um id
 * único DENTRO do DndContext. Um Item normal mora OU no backlog OU numa data
 * (nunca os dois ao mesmo tempo), então um único id (`item:`) já basta. Um
 * hábito é a exceção: fica sempre visível na HabitStrip do dia e, se também
 * tiver período, aparece de novo como card dentro do período — a mesma
 * entidade, montada duas vezes ao mesmo tempo — por isso a HabitStrip usa seu
 * próprio prefixo (`habit:`) pra não colidir com o `item:` da renderização
 * dentro do período.
 */
export type DndKind = 'item' | 'habit'

const PREFIX_KIND: Record<string, DndKind> = {
  item: 'item',
  habit: 'habit',
}

export function itemDndId(id: string): string {
  return `item:${id}`
}

export function habitDndId(id: string): string {
  return `habit:${id}`
}

export function splitDndId(dndId: string): { kind: DndKind; id: string } {
  const sep = dndId.indexOf(':')
  const prefix = dndId.slice(0, sep)
  const id = dndId.slice(sep + 1)
  return { kind: PREFIX_KIND[prefix] ?? 'item', id }
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
