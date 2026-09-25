export interface Day {
  id: string // "2026-09-24"
  weekday: string // "qui"
}

export type HabitId = 'devocional' | 'alongamento' | 'leitura' | 'exercicio' | 'revisao'

export type DayCategoryId = 'piedade' | 'lazer' | 'geral' | 'estudo' | 'livre' | 'outro'

/** Paleta de destaque usada nos blocos — cor padrão do compromisso ou escolha do usuário. */
export type AccentColor = 'clay' | 'rust' | 'olive' | 'gold' | 'ink'

/** Período do dia — substitui o horário/duração como forma de agendar. */
export type PeriodId = 'manha' | 'tarde' | 'noite'

export interface AgendaItem {
  id: string
  dayId: string
  title: string
  /** Período em que a tarefa entra; null = ainda sem período (fica na lista "sem período"). */
  period: PeriodId | null
  /** Posição de execução dentro do período (menor = mais cedo na fila). */
  order: number
  /**
   * Texto livre opcional pra guardar um horário específico relevante (ex.: "17:00" ou
   * "9:00–11:00") — é só uma anotação exibida no card, não define layout nem ordena nada.
   */
  timeNote?: string
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
  period: PeriodId
  /** Posição de execução dentro do período (menor = mais cedo na fila). */
  order: number
}

export interface BacklogItem {
  id: string
  title: string
  category: BacklogCategory
  size: BacklogSize
  done: boolean
  allocation?: BacklogAllocation
}

/** União usada pelos cards alocados num período e pela EditItemModal. */
export type PlannerItem =
  | { kind: 'agenda'; item: AgendaItem }
  | { kind: 'backlog'; item: BacklogItem }
