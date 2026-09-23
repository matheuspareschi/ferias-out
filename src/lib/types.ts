export interface Day {
  id: string // "2026-09-24"
  weekday: string // "qui"
}

export interface AgendaItem {
  id: string
  dayId: string
  title: string
  start: string | null // "17:00" ou null se sem horário definido
  duration: number | null // minutos
  done: boolean
}

export type BacklogCategory = 'aula' | 'preparo' | 'tarefa'
export type BacklogSize = 'P' | 'M' | 'G'

export interface BacklogAllocation {
  dayId: string
  start: string
  duration: number // minutos
}

export interface BacklogItem {
  id: string
  title: string
  category: BacklogCategory
  size: BacklogSize
  done: boolean
  allocation?: BacklogAllocation
}

/** União usada por blocos alocados na grade e pela EditItemModal. */
export type PlannerItem =
  | { kind: 'agenda'; item: AgendaItem }
  | { kind: 'backlog'; item: BacklogItem }
