/**
 * Esquema de ids de arraste (dnd-kit). Cada draggable montado precisa de um id
 * único DENTRO do DndContext — um AgendaItem "hábito" pode estar montado ao
 * mesmo tempo na HabitStrip (sempre visível) e como bloco na grade (quando
 * tem horário), e um BacklogItem alocado fica montado tanto no card da
 * sidebar quanto no bloco da grade. Por isso cada "papel" tem seu próprio
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
