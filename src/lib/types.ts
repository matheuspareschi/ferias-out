export interface Day {
  id: string // "2026-09-24"
  weekday: string // "qui"
}

export type HabitId = 'devocional' | 'alongamento' | 'leitura' | 'exercicio' | 'revisao'

export type DayCategoryId = 'piedade' | 'lazer' | 'geral' | 'estudo' | 'livre' | 'outro'

/** Paleta de destaque usada nos blocos — cor padrão do item ou escolha do usuário. */
export type AccentColor = 'clay' | 'rust' | 'olive' | 'gold' | 'ink'

/** Período do dia — substitui o horário/duração como forma de agendar. */
export type PeriodId = 'manha' | 'tarde' | 'noite'

/**
 * Estilo bullet journal: apenas dois tipos de item. `context` (Faculdade,
 * GAEB, Pessoal…) é quem antes era "categoria do backlog" — agora é uma
 * etiqueta livre, independente do tipo e do tamanho.
 */
export type ItemType = 'task' | 'event'

export type ItemSize = 'P' | 'M' | 'G'

export interface Subitem {
  id: string
  title: string
  done: boolean
}

/**
 * Entidade única pra tudo que o usuário anota — substitui o antigo par
 * AgendaItem (preso a um dia) / BacklogItem (flutuante, com alocação
 * opcional). Sem `dayId` o item mora só no backlog; com `dayId` ele aparece
 * na grade daquele dia e some do backlog (nunca os dois ao mesmo tempo).
 */
export interface Item {
  id: string
  type: ItemType
  title: string
  /** Id de um Context (ver contexts.ts) — todo item pertence a um contexto. */
  context: string
  /** Tamanho P/M/G — independente do contexto, só um indicador de esforço. */
  size?: ItemSize
  /** Dia em que o item aparece na grade; sem valor = ainda no backlog. */
  dayId?: string
  /** Período dentro do dia; null = "sem período" (só vale com dayId). */
  period?: PeriodId | null
  /** Posição de execução dentro do período/lista (menor = mais cedo na fila). */
  order: number
  /**
   * Texto livre opcional pra guardar um horário específico relevante (ex.: "17:00" ou
   * "9:00–11:00") — é só uma anotação exibida no card, não define layout nem ordena nada.
   */
  timeNote?: string
  done: boolean
  /** Marca os hábitos diários da rotina-base, exibidos à parte na HabitStrip. */
  habit?: HabitId
  /** Cor de destaque escolhida pelo usuário; sem valor usa o padrão 'clay'. */
  color?: AccentColor
  /** Mês de referência no backlog ("YYYY-MM") — só faz sentido sem dayId. */
  referenceMonth?: string
  /** Dia de origem da última migração (painel de pendentes) — mostra o símbolo `>`. */
  migratedFrom?: string
  /** Checklist simples dentro do item. */
  subitems?: Subitem[]
}

/** Contexto — lista editável (Pessoal, Faculdade, GAEB, Conexão, Acampamento, Estágio…). */
export interface Context {
  id: string
  label: string
}

/** Metadados por dia que não são itens: tag de tipo de dia e nota livre. */
export interface DayMeta {
  category?: DayCategoryId
  note?: string
}
