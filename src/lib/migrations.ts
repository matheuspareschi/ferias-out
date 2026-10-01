import { DEFAULT_CONTEXT_ID, DEFAULT_CONTEXTS } from './contexts'
import { todayId } from './dates'
import type { AccentColor, Context, DayCategoryId, DayMeta, HabitId, Item, ItemSize, PeriodId } from './types'

export const CURRENT_SCHEMA_VERSION = 1 as const

export interface PlannerState {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  items: Item[]
  contexts: Context[]
  dayMeta: Record<string, DayMeta>
  anchorDayId: string
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

/** Shapes v0 (antes da unificação em Item) — cobre tanto o formato por período
 * quanto o formato ainda mais antigo por horário/duração. */
interface LegacyAgendaItemV0 {
  id: string
  dayId: string
  title: string
  period?: PeriodId | null
  order?: number
  timeNote?: string
  done?: boolean
  habit?: HabitId
  color?: AccentColor
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
export function migrateV0ToV1(raw: LegacyStateV0): PlannerState {
  const items: Item[] = []
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
    schemaVersion: CURRENT_SCHEMA_VERSION,
    items,
    contexts: DEFAULT_CONTEXTS,
    dayMeta,
    anchorDayId: raw.anchorDayId ?? todayId(),
  }
}

function isLegacyV0(parsed: Record<string, unknown>): boolean {
  return Array.isArray(parsed.agendaItems) || Array.isArray(parsed.backlogItems)
}

function normalizeItem(raw: Partial<Item>): Item | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null
  return {
    id: raw.id,
    type: raw.type === 'event' ? 'event' : 'task',
    title: raw.title,
    context: raw.context ?? DEFAULT_CONTEXT_ID,
    size: raw.size,
    dayId: raw.dayId,
    period: raw.period ?? null,
    order: raw.order ?? 0,
    timeNote: raw.timeNote,
    done: raw.done ?? false,
    habit: raw.habit,
    color: raw.color,
    referenceMonth: raw.referenceMonth,
    migratedFrom: raw.migratedFrom,
    subitems: raw.subitems,
  }
}

/**
 * Ponto único de entrada pra carregar um blob salvo (localStorage ou
 * Supabase) — decide se já está no formato atual ou se precisa migrar a
 * partir do v0. Retorna `null` se o formato for irreconhecível (cai pro seed).
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
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      items,
      contexts,
      dayMeta: (obj.dayMeta as Record<string, DayMeta>) ?? {},
      anchorDayId: obj.anchorDayId,
    }
  }

  if (isLegacyV0(obj)) {
    return migrateV0ToV1(obj as LegacyStateV0)
  }

  return null
}

/** Verdadeiro quando `parsed` precisa passar pela migração v0→v1 (pra decidir se faz backup antes). */
export function needsV0Migration(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false
  const obj = parsed as Record<string, unknown>
  return obj.schemaVersion !== CURRENT_SCHEMA_VERSION && isLegacyV0(obj)
}
