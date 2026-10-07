export interface Day {
  id: string // "2026-09-24"
  weekday: string // "qui"
}

export type HabitId = 'devocional' | 'alongamento' | 'leitura' | 'exercicio' | 'revisao' | 'sem_internet'

export type DayCategoryId = 'piedade' | 'lazer' | 'geral' | 'estudo' | 'livre' | 'outro'

/** Período do dia — substitui o horário/duração como forma de agendar. */
export type PeriodId = 'manha' | 'tarde' | 'noite'

/**
 * Estilo bullet journal: apenas dois tipos de item. `context` (Faculdade,
 * GAEB, Pessoal…) é quem antes era "categoria do backlog" — agora é uma
 * etiqueta livre, independente do tipo e do tamanho.
 */
export type ItemType = 'task' | 'event'

/** Só existe (e só é exibido) pra tarefas do contexto Faculdade. */
export type ItemSize = 'P' | 'M' | 'G'

/**
 * Entidade única pra tudo que o usuário anota — substitui o antigo par
 * AgendaItem (preso a um dia) / BacklogItem (flutuante, com alocação
 * opcional). Sem `dayId` o item mora só no backlog; com `dayId` ele aparece
 * na grade daquele dia e some do backlog (nunca os dois ao mesmo tempo).
 *
 * Sem cor própria (v2 da especificação): a distinção visual entre tarefa,
 * evento, tarefa-pai e subtarefa é só por forma/símbolo (ver ItemRow), nunca
 * por tonalidade.
 */
export interface Item {
  id: string
  type: ItemType
  title: string
  /** Id de um Context (ver contexts.ts) — todo item pertence a um contexto. */
  context: string
  /** Tamanho P/M/G — só existe (e só aparece) em tarefas do contexto Faculdade. */
  size?: ItemSize
  /** Dia em que o item aparece na grade; sem valor = ainda no backlog. */
  dayId?: string
  /** Período dentro do dia; null = "sem período" (só vale com dayId). */
  period?: PeriodId | null
  /** Posição de execução dentro do período/lista (menor = mais cedo na fila). */
  order: number
  /**
   * Texto livre opcional pra guardar um horário específico relevante (ex.: "17:00" ou
   * "9:00–11:00") — é só uma anotação exibida na linha, não define layout nem ordena nada.
   */
  timeNote?: string
  done: boolean
  /** Marca os hábitos diários da rotina-base, exibidos à parte na HabitStrip. */
  habit?: HabitId
  /** Mês de referência no backlog ("YYYY-MM") — só faz sentido sem dayId. */
  referenceMonth?: string
  /** Semana ISO de referência no backlog ("YYYY-Www") — alternativa a `referenceMonth`, só faz sentido sem dayId. */
  referenceWeek?: string
  /** Dia de origem da última migração — mostra o símbolo `>`. */
  migratedFrom?: string
  /**
   * Id da tarefa-pai, se este item for uma subtarefa (um nível só: uma
   * subtarefa nunca tem suas próprias subtarefas). A tarefa-pai não guarda
   * a lista de filhas — elas são encontradas filtrando por `parentId`.
   */
  parentId?: string
  /** Liga o item a uma Unidade da Faculdade — só em itens de aula/revisão. */
  unitId?: string
  /**
   * Papel do item dentro da Unidade (ver `unitId`) — `revisao_continua` não
   * tem `unitId` (não é de uma Unidade específica): é o acompanhamento
   * diário de Hebraico, um item por dia (ver `ensureContinuousReview`).
   */
  unitRole?: 'aula' | 'revisao' | 'revisao_continua'
  /** Só em revisões: qual das 3 (1, 2 ou 3) — usado pra não duplicar. */
  reviewIndex?: 1 | 2 | 3
  /** Entrega da Faculdade — mostra ★ em vez do símbolo normal de tipo. */
  isDelivery?: boolean
  /** Disciplina direta — entregas e aulas ao vivo, que não passam por Unidade. */
  disciplineId?: string
  /** Só em aulas ao vivo (evento, contexto Faculdade): estado de presença. */
  liveClassStatus?: LiveClassStatus
  /** Dia final, pra compromissos de vários dias (ex.: viagem) — inclusivo. Sem valor = só `dayId`. */
  endDayId?: string
  /** Id do evento correspondente no Google Agenda — só em eventos criados/linkados por lá (5.3). */
  googleEventId?: string
  /** `updated`/etag do Google na última sincronização — detecta mudança feita lá antes de sobrescrever. */
  googleUpdated?: string
  /** true pra um evento só-leitura vindo do Google (nunca editado por aqui). */
  fromGoogle?: boolean
  /** Marca um item lançado direto na visão Ano (2.4/5.2) — só esses aparecem nas caixas do Ano. */
  origem?: 'ano'
  /** Só em itens da lixeira (1.6): quando foi excluído — base pra purgar depois de 30 dias. */
  deletedAt?: string
}

/** Disciplina da Faculdade — sigla curta + nome completo. */
export interface Discipline {
  id: string
  sigla: string
  name: string
}

/**
 * Unidade de uma disciplina (UN3, UN4…) — tem só aula e revisão (3.1). O
 * estado de cada uma é derivado dos Items ligados por `unitId`, nunca
 * guardado aqui, pra não desincronizar.
 */
export interface Unit {
  id: string
  disciplineId: string
  number: number
  size: ItemSize
  pages?: number
}

export type LiveClassStatus = 'vou' | 'nao' | 'assisti'

/** Notas livres da Faculdade — uma geral e, opcionalmente, uma por disciplina. */
export interface FacultyNotes {
  general: string
  byDiscipline: Record<string, string>
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

/** Uma ideia solta do GAEB (painel de Ideias, 7). */
export interface GaebIdea {
  id: string
  text: string
}

/**
 * Um encontro do GAEB (7): dia marcado no calendário pequeno, com
 * comentários em texto livre e metadados pequenos opcionais.
 */
export interface GaebEncontro {
  id: string
  dayId: string
  comments: string
  tema?: string
  pessoas?: number
  comida?: string
}

/** Uma linha da tabela opcional de horas do Estágio (7). */
export interface EstagioHoursEntry {
  id: string
  activity: string
  hours: number
}

/** Retrospectiva de um mês ("YYYY-MM") — três campos de texto livre (8). */
export interface Retrospective {
  from: string
  alive: string
  wantToAppear: string
}
