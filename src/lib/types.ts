export interface Day {
  id: string // "2026-09-24"
  weekday: string // "qui"
}

export type HabitId = 'devocional' | 'alongamento' | 'leitura' | 'exercicio' | 'revisao'

export type DayCategoryId = 'piedade' | 'lazer' | 'geral' | 'livre' | 'outro'

/** Paleta de destaque usada nos blocos — cor padrão do compromisso ou escolha do usuário. */
export type AccentColor = 'clay' | 'rust' | 'olive' | 'gold' | 'ink'

export interface AgendaItem {
  id: string
  dayId: string
  title: string
  start: string | null // "17:00" ou null se sem horário definido
  duration: number | null // minutos
  done: boolean
  /** Marca os 5 hábitos diários da rotina-base, exibidos à parte na HabitStrip. */
  habit?: HabitId
  /** Cor de destaque escolhida pelo usuário; sem valor usa o padrão 'clay'. */
  color?: AccentColor
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
