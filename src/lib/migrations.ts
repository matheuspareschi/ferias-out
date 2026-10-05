import { DEFAULT_CONTEXT_ID, DEFAULT_CONTEXTS } from './contexts'
import { todayId } from './dates'
import { DEFAULT_DISCIPLINES } from './disciplines'
import type {
  Context,
  DayCategoryId,
  DayMeta,
  Discipline,
  EstagioHoursEntry,
  FacultyNotes,
  GaebEncontro,
  GaebIdea,
  HabitId,
  Item,
  ItemSize,
  PeriodId,
  Retrospective,
  Unit,
} from './types'

export const CURRENT_SCHEMA_VERSION = 6 as const

export interface PlannerState {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  items: Item[]
  contexts: Context[]
  dayMeta: Record<string, DayMeta>
  anchorDayId: string
  disciplines: Discipline[]
  units: Unit[]
  facultyNotes: FacultyNotes
  gaebIdeias: GaebIdea[]
  gaebEncontros: GaebEncontro[]
  /** Notas simples por contexto de projeto (hoje: conexao, acampamento). */
  projectNotes: Record<string, string>
  estagioNotes: string
  estagioHours: EstagioHoursEntry[]
  /** Retrospectiva mensal, chaveada por "YYYY-MM". */
  retrospectives: Record<string, Retrospective>
  /** Dias de DAY_LABELS que o usuário descartou na limpeza de legado (5.1). */
  dismissedDayLabels: string[]
}

/** Rotina-base gravada antes da HabitStrip existir não tinha o campo `habit`. */
const HABIT_TITLE_TO_ID: Record<string, HabitId> = {
  Devocional: 'devocional',
  Alongamento: 'alongamento',
  Leitura: 'leitura',
  Exercício: 'exercicio',
  'Revisão da faculdade': 'revisao',
}

/** Mapeamento confirmado com o usuário pra migrar categoria do backlog em contexto (1.2). */
function mapCategoryToContext(category: string | undefined, title: string): string {
  if (category === 'aula') return 'faculdade'
  if (category === 'preparo') return /gaeb/i.test(title) ? 'gaeb' : DEFAULT_CONTEXT_ID
  return DEFAULT_CONTEXT_ID
}

function periodForHour(hour: number): PeriodId {
  if (hour < 12) return 'manha'
  if (hour < 18) return 'tarde'
  return 'noite'
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Só existe (e só é exibido) em tarefas do contexto Faculdade (v2, confirmado). */
function sizeAllowed(context: string, size: ItemSize | undefined): ItemSize | undefined {
  return context === 'faculdade' ? size : undefined
}

// ---------------------------------------------------------------------------
// v0 (AgendaItem/BacklogItem separados) → v1 (Item único, ainda com cor e checklist)
// ---------------------------------------------------------------------------

interface LegacyAgendaItemV0 {
  id: string
  dayId: string
  title: string
  period?: PeriodId | null
  order?: number
  timeNote?: string
  done?: boolean
  habit?: HabitId
  color?: string
  start?: string | null
  duration?: number | null
}

interface LegacyAllocationV0 {
  dayId: string
  period?: PeriodId
  order?: number
  start?: string
  duration?: number
}

interface LegacyBacklogItemV0 {
  id: string
  title: string
  category?: string
  size?: ItemSize
  done?: boolean
  allocation?: LegacyAllocationV0
}

interface LegacyStateV0 {
  agendaItems?: unknown[]
  backlogItems?: unknown[]
  anchorDayId?: string
  dayCategories?: Record<string, DayCategoryId>
}

/** Item como existia na v1: Item atual + campos já removidos na v2. */
interface ItemV1 {
  id: string
  type: 'task' | 'event'
  title: string
  context: string
  size?: ItemSize
  dayId?: string
  period?: PeriodId | null
  order: number
  timeNote?: string
  done: boolean
  habit?: HabitId
  color?: string
  referenceMonth?: string
  migratedFrom?: string
  subitems?: { id: string; title: string; done: boolean }[]
}

interface PlannerStateV1 {
  schemaVersion: 1
  items: ItemV1[]
  contexts: Context[]
  dayMeta: Record<string, DayMeta>
  anchorDayId: string
}

function legacyPeriodAndNote(raw: {
  period?: PeriodId | null
  timeNote?: string
  start?: string | null
  duration?: number | null
}): { period: PeriodId | null; timeNote: string | undefined } {
  if (raw.period !== undefined) return { period: raw.period, timeNote: raw.timeNote }
  if (!raw.start) return { period: null, timeNote: raw.timeNote }
  const [h, m] = raw.start.split(':').map(Number)
  const period = periodForHour(h)
  if (!raw.duration) return { period, timeNote: raw.start }
  const endMinutes = h * 60 + m + raw.duration
  const end = `${pad2(Math.floor(endMinutes / 60) % 24)}:${pad2(endMinutes % 60)}`
  return { period, timeNote: end === raw.start ? raw.start : `${raw.start}–${end}` }
}

/**
 * v0 → v1: junta agendaItems + backlogItems num único Item[], atribuindo
 * contexto (mapeamento confirmado) e tipo (tarefa/evento). Heurística de
 * tipo: um AgendaItem era um "compromisso" preso a um dia — sem ser hábito,
 * isso é o mais próximo de um "evento"; um BacklogItem era sempre uma
 * "tarefa" flutuante. Pura — não grava nada, quem chama decide se faz backup.
 */
function migrateV0ToV1(raw: LegacyStateV0): PlannerStateV1 {
  const items: ItemV1[] = []
  const orderCounters = new Map<string, number>()
  function nextOrder(dayId: string, period: PeriodId | null): number {
    const key = `${dayId}:${period ?? 'none'}`
    const n = orderCounters.get(key) ?? 0
    orderCounters.set(key, n + 1)
    return n
  }

  for (const entry of raw.agendaItems ?? []) {
    const a = entry as LegacyAgendaItemV0
    const habit = a.habit ?? HABIT_TITLE_TO_ID[a.title]
    const { period, timeNote } = legacyPeriodAndNote(a)
    const order = a.order ?? nextOrder(a.dayId, period)
    items.push({
      id: a.id,
      type: habit ? 'task' : 'event',
      title: a.title,
      context: DEFAULT_CONTEXT_ID,
      dayId: a.dayId,
      period,
      order,
      timeNote,
      done: a.done ?? false,
      habit,
      color: a.color,
    })
  }

  for (const entry of raw.backlogItems ?? []) {
    const b = entry as LegacyBacklogItemV0
    const context = mapCategoryToContext(b.category, b.title)
    const alloc = b.allocation
    let dayId: string | undefined
    let period: PeriodId | undefined
    let order = 0
    if (alloc) {
      dayId = alloc.dayId
      period = alloc.period ?? (alloc.start ? periodForHour(Number(alloc.start.split(':')[0])) : undefined)
      if (period) order = alloc.order ?? nextOrder(alloc.dayId, period)
    }
    items.push({
      id: b.id,
      type: 'task',
      title: b.title,
      context,
      size: b.size,
      dayId: period ? dayId : undefined,
      period: period ?? null,
      order,
      done: b.done ?? false,
    })
  }

  const dayMeta: Record<string, DayMeta> = {}
  for (const [dayId, category] of Object.entries(raw.dayCategories ?? {})) {
    dayMeta[dayId] = { category }
  }

  return {
    schemaVersion: 1,
    items,
    contexts: DEFAULT_CONTEXTS,
    dayMeta,
    anchorDayId: raw.anchorDayId ?? todayId(),
  }
}

// ---------------------------------------------------------------------------
// v1 → v2: sem cor por item; checklist vira subtarefas reais; tamanho só
// sobrevive em itens do contexto Faculdade.
// ---------------------------------------------------------------------------

interface PlannerStateV2 {
  schemaVersion: 2
  items: Item[]
  contexts: Context[]
  dayMeta: Record<string, DayMeta>
  anchorDayId: string
}

/**
 * v1 → v2: remove `color` (sem cor por item, v2 da especificação); cada
 * `subitems[]` vira Item de verdade com `parentId`, herdando dia/período/
 * contexto do pai (fica junto dele até o usuário mover); tamanho passa a só
 * existir em itens do contexto Faculdade — os demais perdem o campo aqui
 * (o blob pré-migração guarda o valor original). Pura.
 */
function migrateV1ToV2(v1: PlannerStateV1): PlannerStateV2 {
  const items: Item[] = []

  for (const raw of v1.items) {
    const { color: _color, subitems, ...rest } = raw
    void _color
    items.push({ ...rest, size: sizeAllowed(rest.context, rest.size) })

    subitems?.forEach((sub, idx) => {
      items.push({
        id: sub.id,
        type: 'task',
        title: sub.title,
        context: rest.context,
        dayId: rest.dayId,
        period: rest.period ?? null,
        // logo depois do pai na mesma lista, preservando a ordem entre elas
        order: rest.order + (idx + 1) / 1000,
        done: sub.done,
        parentId: rest.id,
      })
    })
  }

  return {
    schemaVersion: 2,
    items,
    contexts: v1.contexts,
    dayMeta: v1.dayMeta,
    anchorDayId: v1.anchorDayId,
  }
}

// ---------------------------------------------------------------------------
// v2 → v3: adiciona o módulo Faculdade (disciplinas, unidades, notas) —
// nenhum Item existente muda, só ganham os novos campos opcionais.
// ---------------------------------------------------------------------------

interface PlannerStateV3 {
  schemaVersion: 3
  items: Item[]
  contexts: Context[]
  dayMeta: Record<string, DayMeta>
  anchorDayId: string
  disciplines: Discipline[]
  units: Unit[]
  facultyNotes: FacultyNotes
}

/**
 * v2 → v3: entra com as disciplinas iniciais (3.1, lista editável depois) e
 * nenhuma unidade ainda — o usuário cadastra as unidades na página da
 * Faculdade. Pura.
 */
function migrateV2ToV3(v2: PlannerStateV2): PlannerStateV3 {
  return {
    schemaVersion: 3,
    items: v2.items,
    contexts: v2.contexts,
    dayMeta: v2.dayMeta,
    anchorDayId: v2.anchorDayId,
    disciplines: DEFAULT_DISCIPLINES,
    units: [],
    facultyNotes: { general: '', byDiscipline: {} },
  }
}

// ---------------------------------------------------------------------------
// v3 → v4: adiciona Projetos (GAEB/Conexão/Acampamento/Estágio) e
// Retrospectiva mensal — nenhum Item existente muda, só ganha campos
// opcionais novos (endDayId, googleEventId, googleUpdated, fromGoogle, pro
// uso futuro do Google Agenda, fase 4).
// ---------------------------------------------------------------------------

interface PlannerStateV4 {
  schemaVersion: 4
  items: Item[]
  contexts: Context[]
  dayMeta: Record<string, DayMeta>
  anchorDayId: string
  disciplines: Discipline[]
  units: Unit[]
  facultyNotes: FacultyNotes
  gaebIdeias: GaebIdea[]
  gaebEncontros: GaebEncontro[]
  projectNotes: Record<string, string>
  estagioNotes: string
  estagioHours: EstagioHoursEntry[]
  retrospectives: Record<string, Retrospective>
}

/**
 * v3 → v4: entra tudo vazio — nenhuma ideia/encontro/nota/retrospectiva
 * existia antes dessa fase, não há o que migrar de dado antigo. Pura.
 */
function migrateV3ToV4(v3: PlannerStateV3): PlannerStateV4 {
  return {
    schemaVersion: 4,
    items: v3.items,
    contexts: v3.contexts,
    dayMeta: v3.dayMeta,
    anchorDayId: v3.anchorDayId,
    disciplines: v3.disciplines,
    units: v3.units,
    facultyNotes: v3.facultyNotes,
    gaebIdeias: [],
    gaebEncontros: [],
    projectNotes: {},
    estagioNotes: '',
    estagioHours: [],
    retrospectives: {},
  }
}

// ---------------------------------------------------------------------------
// v4 → v5: adiciona o hábito "sem_internet" e `referenceWeek` em Item
// (2.3.1, backlog por semana) — nenhum dado existente muda, só ganham
// campos/valores possíveis novos. O hábito novo só passa a existir de fato
// quando `ensureDailyHabits` o criar pra algum dia visitado; nada aqui cria
// itens de hábito retroativamente.
// ---------------------------------------------------------------------------

interface PlannerStateV5 {
  schemaVersion: 5
  items: Item[]
  contexts: Context[]
  dayMeta: Record<string, DayMeta>
  anchorDayId: string
  disciplines: Discipline[]
  units: Unit[]
  facultyNotes: FacultyNotes
  gaebIdeias: GaebIdea[]
  gaebEncontros: GaebEncontro[]
  projectNotes: Record<string, string>
  estagioNotes: string
  estagioHours: EstagioHoursEntry[]
  retrospectives: Record<string, Retrospective>
}

/** v4 → v5: passthrough puro — nada muda nos dados, só o formato aceita os campos novos. */
function migrateV4ToV5(v4: PlannerStateV4): PlannerStateV5 {
  return { ...v4, schemaVersion: 5 }
}

// ---------------------------------------------------------------------------
// v5 → v6 (atual): adiciona `dismissedDayLabels` pra limpeza de legado (5.1)
// — a wizard de revisão marca tags de dia antigas (viagem/retiro/etc.) como
// descartadas sem apagar a constante DAY_LABELS. Nenhum dado existente muda.
// ---------------------------------------------------------------------------

/** v5 → v6: passthrough puro — só ganha o campo novo, vazio. */
function migrateV5ToV6(v5: PlannerStateV5): PlannerState {
  return { ...v5, schemaVersion: CURRENT_SCHEMA_VERSION, dismissedDayLabels: [] }
}

function isLegacyV0(parsed: Record<string, unknown>): boolean {
  return Array.isArray(parsed.agendaItems) || Array.isArray(parsed.backlogItems)
}

function normalizeItem(raw: Partial<Item>): Item | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null
  const context = raw.context ?? DEFAULT_CONTEXT_ID
  return {
    id: raw.id,
    type: raw.type === 'event' ? 'event' : 'task',
    title: raw.title,
    context,
    size: sizeAllowed(context, raw.size),
    dayId: raw.dayId,
    period: raw.period ?? null,
    order: raw.order ?? 0,
    timeNote: raw.timeNote,
    done: raw.done ?? false,
    habit: raw.habit,
    referenceMonth: raw.referenceMonth,
    referenceWeek: raw.referenceWeek,
    migratedFrom: raw.migratedFrom,
    parentId: raw.parentId,
    unitId: raw.unitId,
    unitRole: raw.unitRole,
    reviewIndex: raw.reviewIndex,
    isDelivery: raw.isDelivery,
    disciplineId: raw.disciplineId,
    liveClassStatus: raw.liveClassStatus,
    endDayId: raw.endDayId,
    googleEventId: raw.googleEventId,
    googleUpdated: raw.googleUpdated,
    fromGoogle: raw.fromGoogle,
  }
}

function normalizeUnit(raw: Partial<Unit>): Unit | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.disciplineId !== 'string') return null
  return {
    id: raw.id,
    disciplineId: raw.disciplineId,
    number: raw.number ?? 0,
    size: raw.size ?? 'M',
    pages: raw.pages,
  }
}

/**
 * Ponto único de entrada pra carregar um blob salvo (localStorage ou
 * Supabase) — decide se já está no formato atual ou encadeia as migrações
 * necessárias (v0→v1→v2→v3→v4→v5). Retorna `null` se o formato for irreconhecível
 * (cai pro seed).
 */
export function normalizeState(parsed: unknown): PlannerState | null {
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>

  if (obj.schemaVersion === CURRENT_SCHEMA_VERSION) {
    if (!Array.isArray(obj.items) || typeof obj.anchorDayId !== 'string') return null
    const items = (obj.items as Partial<Item>[]).map(normalizeItem).filter((it): it is Item => it !== null)
    const contexts =
      Array.isArray(obj.contexts) && (obj.contexts as Context[]).length > 0
        ? (obj.contexts as Context[])
        : DEFAULT_CONTEXTS
    const units = Array.isArray(obj.units)
      ? (obj.units as Partial<Unit>[]).map(normalizeUnit).filter((u): u is Unit => u !== null)
      : []
    const disciplines =
      Array.isArray(obj.disciplines) && (obj.disciplines as Discipline[]).length > 0
        ? (obj.disciplines as Discipline[])
        : DEFAULT_DISCIPLINES
    const facultyNotes = obj.facultyNotes as Partial<FacultyNotes> | undefined
    const gaebIdeias = Array.isArray(obj.gaebIdeias) ? (obj.gaebIdeias as GaebIdea[]) : []
    const gaebEncontros = Array.isArray(obj.gaebEncontros) ? (obj.gaebEncontros as GaebEncontro[]) : []
    const projectNotes = (obj.projectNotes as Record<string, string>) ?? {}
    const estagioHours = Array.isArray(obj.estagioHours) ? (obj.estagioHours as EstagioHoursEntry[]) : []
    const retrospectives = (obj.retrospectives as Record<string, Retrospective>) ?? {}
    const dismissedDayLabels = Array.isArray(obj.dismissedDayLabels) ? (obj.dismissedDayLabels as string[]) : []
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      items,
      contexts,
      dayMeta: (obj.dayMeta as Record<string, DayMeta>) ?? {},
      anchorDayId: obj.anchorDayId,
      disciplines,
      units,
      facultyNotes: { general: facultyNotes?.general ?? '', byDiscipline: facultyNotes?.byDiscipline ?? {} },
      gaebIdeias,
      gaebEncontros,
      projectNotes,
      estagioNotes: typeof obj.estagioNotes === 'string' ? obj.estagioNotes : '',
      estagioHours,
      retrospectives,
      dismissedDayLabels,
    }
  }

  if (obj.schemaVersion === 5) {
    return migrateV5ToV6(obj as unknown as PlannerStateV5)
  }

  if (obj.schemaVersion === 4) {
    return migrateV5ToV6(migrateV4ToV5(obj as unknown as PlannerStateV4))
  }

  if (obj.schemaVersion === 3) {
    return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(obj as unknown as PlannerStateV3)))
  }

  if (obj.schemaVersion === 2) {
    return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(obj as unknown as PlannerStateV2))))
  }

  if (obj.schemaVersion === 1) {
    return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(obj as unknown as PlannerStateV1)))))
  }

  if (isLegacyV0(obj)) {
    return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(migrateV0ToV1(obj as LegacyStateV0))))))
  }

  return null
}

/** Verdadeiro quando `parsed` precisa de alguma migração de esquema (pra decidir se faz backup antes). */
export function needsMigration(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false
  const obj = parsed as Record<string, unknown>
  if (obj.schemaVersion === CURRENT_SCHEMA_VERSION) return false
  return (
    obj.schemaVersion === 1 ||
    obj.schemaVersion === 2 ||
    obj.schemaVersion === 3 ||
    obj.schemaVersion === 4 ||
    obj.schemaVersion === 5 ||
    isLegacyV0(obj)
  )
}
