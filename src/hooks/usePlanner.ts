import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_CONTEXT_ID, DEFAULT_CONTEXTS } from '@/lib/contexts'
import { defaultAnchorDayId } from '@/lib/days'
import { needsV0Migration, normalizeState, type PlannerState } from '@/lib/migrations'
import { buildSeedItems } from '@/lib/seed'
import { SYNC_ENABLED, supabase } from '@/lib/supabaseClient'
import type { Context, DayCategoryId, HabitId, Item } from '@/lib/types'

const STORAGE_KEY = 'ferias-planner:v1'
const BACKUP_KEY = 'ferias-planner:backup:pre-v1'
const SYNC_TABLE = 'planner_state'
const SYNC_ROW_ID = 'default'

export type SyncStatus = 'disabled' | 'syncing' | 'synced' | 'error'

const HABIT_ORDER: HabitId[] = ['devocional', 'alongamento', 'leitura', 'exercicio', 'revisao']
const HABIT_TITLE: Record<HabitId, string> = {
  devocional: 'Devocional',
  alongamento: 'Alongamento',
  leitura: 'Leitura',
  exercicio: 'Exercício',
  revisao: 'Revisão da faculdade',
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Guarda uma cópia do blob v0 antes de migrar — só uma vez, nunca sobrescreve. */
function backupLegacyBlobIfNeeded(raw: string) {
  try {
    if (!window.localStorage.getItem(BACKUP_KEY)) {
      window.localStorage.setItem(BACKUP_KEY, raw)
    }
  } catch {
    // localStorage indisponível — segue sem backup local (o export manual ainda cobre isso)
  }
}

/** Garante que `dayId` tenha os itens de hábito da rotina-base, sem duplicar. */
function ensureDailyHabits(items: Item[], dayId: string): Item[] {
  const existing = new Set(items.filter((it) => it.dayId === dayId && it.habit).map((it) => it.habit))
  const missing = HABIT_ORDER.filter((h) => !existing.has(h))
  if (missing.length === 0) return items
  const created: Item[] = missing.map((habit) => ({
    id: newId('item'),
    type: 'task',
    title: HABIT_TITLE[habit],
    context: DEFAULT_CONTEXT_ID,
    dayId,
    period: null,
    order: 0,
    done: false,
    habit,
  }))
  return [...items, ...created]
}

function seedState(): PlannerState {
  return {
    schemaVersion: 1,
    items: ensureDailyHabits(buildSeedItems(), defaultAnchorDayId()),
    contexts: DEFAULT_CONTEXTS,
    dayMeta: {},
    anchorDayId: defaultAnchorDayId(),
  }
}

/** Ao abrir o app, sempre parte do dia atual — não herda o último dia navegado. */
function withTodayAnchor(state: PlannerState): PlannerState {
  return { ...state, anchorDayId: defaultAnchorDayId() }
}

function loadState(): PlannerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (needsV0Migration(parsed)) backupLegacyBlobIfNeeded(raw)
      const normalized = normalizeState(parsed)
      if (normalized) return withTodayAnchor(normalized)
    }
  } catch {
    // localStorage indisponível ou dados corrompidos — cai para o seed
  }
  return seedState()
}

export function usePlanner() {
  const [state, setState] = useState<PlannerState>(loadState)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SYNC_ENABLED ? 'syncing' : 'disabled')
  const isRemoteUpdate = useRef(false)
  // Trava os writes locais até o load inicial do Supabase resolver — sem isso, um
  // aparelho novo (só com o seed no localStorage) sobrescreveria o que já estava
  // sincronizado antes mesmo de baixar os dados existentes.
  const hasHydrated = useRef(!SYNC_ENABLED)

  // Sempre grava um cache local instantâneo, mesmo com sync na nuvem ligado.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage indisponível/cheio — segue só em memória
    }
  }, [state])

  // Garante os hábitos do dia sempre que a âncora muda (inclusive no primeiro
  // load, já que ela começa em hoje) — idempotente: se nada falta, devolve a
  // mesma referência de `items` e o React não re-renderiza à toa.
  useEffect(() => {
    setState((s) => {
      const items = ensureDailyHabits(s.items, s.anchorDayId)
      return items === s.items ? s : { ...s, items }
    })
  }, [state.anchorDayId])

  // Sobe pro Supabase toda mudança LOCAL (ignora mudanças que vieram de lá mesmo).
  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      return
    }
    if (!SYNC_ENABLED || !supabase || !hasHydrated.current) return
    let cancelled = false
    setSyncStatus('syncing')
    supabase
      .from(SYNC_TABLE)
      .upsert({ id: SYNC_ROW_ID, data: state, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (cancelled) return
        setSyncStatus(error ? 'error' : 'synced')
      })
    return () => {
      cancelled = true
    }
  }, [state])

  // Carrega o estado remoto ao abrir e escuta mudanças feitas em outros aparelhos.
  useEffect(() => {
    if (!SYNC_ENABLED || !supabase) return
    let cancelled = false

    supabase
      .from(SYNC_TABLE)
      .select('data')
      .eq('id', SYNC_ROW_ID)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setSyncStatus('error')
          hasHydrated.current = true
          return
        }
        if (needsV0Migration(data?.data)) backupLegacyBlobIfNeeded(JSON.stringify(data?.data))
        const remote = data?.data ? normalizeState(data.data) : null
        if (remote) {
          isRemoteUpdate.current = true
          setState(withTodayAnchor(remote))
          setSyncStatus('synced')
        } else {
          // primeira vez usando o Supabase: sobe o estado local atual como ponto de partida
          void supabase!.from(SYNC_TABLE).upsert({ id: SYNC_ROW_ID, data: state })
        }
        hasHydrated.current = true
      })

    const channel = supabase
      .channel('planner_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SYNC_TABLE, filter: `id=eq.${SYNC_ROW_ID}` },
        (payload) => {
          const incoming = payload.new as { data?: unknown } | undefined
          const remote = incoming?.data ? normalizeState(incoming.data) : null
          if (remote) {
            isRemoteUpdate.current = true
            // Mantém o dia que a pessoa está vendo — não pula pro dia que estava
            // aberto no outro aparelho que originou a mudança.
            setState((prev) => ({ ...remote, anchorDayId: prev.anchorDayId }))
            setSyncStatus('synced')
          }
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase?.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addItem = useCallback(
    (
      data: Pick<Item, 'type' | 'title'> &
        Partial<
          Pick<
            Item,
            | 'context'
            | 'size'
            | 'dayId'
            | 'period'
            | 'order'
            | 'timeNote'
            | 'color'
            | 'referenceMonth'
            | 'subitems'
          >
        >,
    ) => {
      const item: Item = {
        id: newId('item'),
        type: data.type,
        title: data.title.trim() || (data.type === 'event' ? 'Novo evento' : 'Nova tarefa'),
        context: data.context ?? DEFAULT_CONTEXT_ID,
        size: data.size,
        dayId: data.dayId,
        period: data.period ?? null,
        order: data.order ?? 0,
        timeNote: data.timeNote,
        color: data.color,
        referenceMonth: data.referenceMonth,
        subitems: data.subitems,
        done: false,
      }
      setState((s) => ({ ...s, items: [...s.items, item] }))
      return item.id
    },
    [],
  )

  const updateItem = useCallback((id: string, patch: Partial<Item>) => {
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }))
  }, [])

  const deleteItem = useCallback((id: string) => {
    setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }))
  }, [])

  const toggleDone = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    }))
  }, [])

  const setAnchorDay = useCallback((dayId: string) => {
    setState((s) => ({ ...s, anchorDayId: dayId }))
  }, [])

  const setDayCategory = useCallback((dayId: string, category: DayCategoryId | null) => {
    setState((s) => {
      const dayMeta = { ...s.dayMeta }
      const current = dayMeta[dayId] ?? {}
      if (category) {
        dayMeta[dayId] = { ...current, category }
      } else if (current.note) {
        dayMeta[dayId] = { note: current.note }
      } else {
        delete dayMeta[dayId]
      }
      return { ...s, dayMeta }
    })
  }, [])

  const setDayNote = useCallback((dayId: string, note: string) => {
    setState((s) => {
      const dayMeta = { ...s.dayMeta }
      const current = dayMeta[dayId] ?? {}
      const trimmed = note.trim()
      if (trimmed) {
        dayMeta[dayId] = { ...current, note: trimmed }
      } else if (current.category) {
        dayMeta[dayId] = { category: current.category }
      } else {
        delete dayMeta[dayId]
      }
      return { ...s, dayMeta }
    })
  }, [])

  const addContext = useCallback((label: string): string => {
    const trimmed = label.trim()
    if (!trimmed) return DEFAULT_CONTEXT_ID
    const id = slugify(trimmed) || newId('contexto')
    setState((s) => (s.contexts.some((c) => c.id === id) ? s : { ...s, contexts: [...s.contexts, { id, label: trimmed }] }))
    return id
  }, [])

  const renameContext = useCallback((id: string, label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    setState((s) => ({
      ...s,
      contexts: s.contexts.map((c) => (c.id === id ? { ...c, label: trimmed } : c)),
    }))
  }, [])

  /** Não deixa apagar um contexto ainda em uso por algum item. */
  const deleteContext = useCallback((id: string) => {
    setState((s) => {
      if (s.items.some((it) => it.context === id)) return s
      return { ...s, contexts: s.contexts.filter((c) => c.id !== id) }
    })
  }, [])

  const importState = useCallback((json: string): boolean => {
    try {
      const normalized = normalizeState(JSON.parse(json))
      if (!normalized) return false
      setState(withTodayAnchor(normalized))
      return true
    } catch {
      return false
    }
  }, [])

  return {
    items: state.items,
    contexts: state.contexts,
    dayMeta: state.dayMeta,
    anchorDayId: state.anchorDayId,
    syncStatus,
    addItem,
    updateItem,
    deleteItem,
    toggleDone,
    setAnchorDay,
    setDayCategory,
    setDayNote,
    addContext,
    renameContext,
    deleteContext,
    /** Estado completo, pronto pra `JSON.stringify` num botão de exportar. */
    exportState: () => state,
    importState,
  }
}

export type UsePlannerReturn = ReturnType<typeof usePlanner>
export type { Context }
