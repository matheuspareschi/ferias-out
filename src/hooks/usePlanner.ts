import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultAnchorDayId } from '@/lib/days'
import { buildSeedAgendaItems, buildSeedBacklogItems } from '@/lib/seed'
import { SYNC_ENABLED, supabase } from '@/lib/supabaseClient'
import type { AgendaItem, BacklogItem, DayCategoryId, HabitId } from '@/lib/types'

const STORAGE_KEY = 'ferias-planner:v1'
const SYNC_TABLE = 'planner_state'
const SYNC_ROW_ID = 'default'

interface PlannerState {
  agendaItems: AgendaItem[]
  backlogItems: BacklogItem[]
  anchorDayId: string
  dayCategories: Record<string, DayCategoryId>
}

export type SyncStatus = 'disabled' | 'syncing' | 'synced' | 'error'

/** Rotina-base gravada antes da HabitStrip existir não tinha o campo `habit`. */
const HABIT_TITLE_TO_ID: Record<string, HabitId> = {
  Devocional: 'devocional',
  Alongamento: 'alongamento',
  Leitura: 'leitura',
  Exercício: 'exercicio',
  'Revisão da faculdade': 'revisao',
}

function migrateAgendaItems(items: AgendaItem[]): AgendaItem[] {
  return items.map((it) => (it.habit ? it : { ...it, habit: HABIT_TITLE_TO_ID[it.title] }))
}

/** Normaliza um blob salvo (localStorage ou Supabase), migrando campos antigos. */
function normalizeState(parsed: Partial<PlannerState>): PlannerState | null {
  if (!Array.isArray(parsed.agendaItems) || !Array.isArray(parsed.backlogItems) || !parsed.anchorDayId) {
    return null
  }
  return {
    agendaItems: migrateAgendaItems(parsed.agendaItems),
    backlogItems: parsed.backlogItems,
    anchorDayId: parsed.anchorDayId,
    dayCategories: parsed.dayCategories ?? {},
  }
}

function seedState(): PlannerState {
  return {
    agendaItems: buildSeedAgendaItems(),
    backlogItems: buildSeedBacklogItems(),
    anchorDayId: defaultAnchorDayId(),
    dayCategories: {},
  }
}

function loadState(): PlannerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const normalized = normalizeState(JSON.parse(raw))
      if (normalized) return normalized
    }
  } catch {
    // localStorage indisponível ou dados corrompidos — cai para o seed
  }
  return seedState()
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
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
        const remote = data?.data ? normalizeState(data.data as Partial<PlannerState>) : null
        if (remote) {
          isRemoteUpdate.current = true
          setState(remote)
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
          const remote = incoming?.data ? normalizeState(incoming.data as Partial<PlannerState>) : null
          if (remote) {
            isRemoteUpdate.current = true
            setState(remote)
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

  const addAgendaItem = useCallback(
    (dayId: string, data: Partial<Pick<AgendaItem, 'title' | 'start' | 'duration' | 'color'>> = {}) => {
      const item: AgendaItem = {
        id: newId('agenda'),
        dayId,
        title: data.title?.trim() || 'Novo compromisso',
        start: data.start ?? null,
        duration: data.duration ?? null,
        color: data.color,
        done: false,
      }
      setState((s) => ({ ...s, agendaItems: [...s.agendaItems, item] }))
      return item.id
    },
    [],
  )

  const updateAgendaItem = useCallback((id: string, patch: Partial<AgendaItem>) => {
    setState((s) => ({
      ...s,
      agendaItems: s.agendaItems.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }))
  }, [])

  const deleteAgendaItem = useCallback((id: string) => {
    setState((s) => ({ ...s, agendaItems: s.agendaItems.filter((it) => it.id !== id) }))
  }, [])

  const addBacklogItem = useCallback((data: Pick<BacklogItem, 'title' | 'category' | 'size'>) => {
    const item: BacklogItem = {
      id: newId('backlog'),
      done: false,
      title: data.title.trim(),
      category: data.category,
      size: data.size,
    }
    setState((s) => ({ ...s, backlogItems: [...s.backlogItems, item] }))
    return item.id
  }, [])

  const updateBacklogItem = useCallback((id: string, patch: Partial<BacklogItem>) => {
    setState((s) => ({
      ...s,
      backlogItems: s.backlogItems.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }))
  }, [])

  const deleteBacklogItem = useCallback((id: string) => {
    setState((s) => ({ ...s, backlogItems: s.backlogItems.filter((it) => it.id !== id) }))
  }, [])

  /** Aloca um BacklogItem numa data/horário — sugestão visual, não trava o item. */
  const allocate = useCallback((itemId: string, dayId: string, start: string, duration: number) => {
    setState((s) => ({
      ...s,
      backlogItems: s.backlogItems.map((it) =>
        it.id === itemId ? { ...it, allocation: { dayId, start, duration } } : it,
      ),
    }))
  }, [])

  const unallocate = useCallback((itemId: string) => {
    setState((s) => ({
      ...s,
      backlogItems: s.backlogItems.map((it) => {
        if (it.id !== itemId) return it
        const next = { ...it }
        delete next.allocation
        return next
      }),
    }))
  }, [])

  const toggleDone = useCallback((itemId: string) => {
    setState((s) => {
      if (s.agendaItems.some((it) => it.id === itemId)) {
        return {
          ...s,
          agendaItems: s.agendaItems.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
        }
      }
      return {
        ...s,
        backlogItems: s.backlogItems.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
      }
    })
  }, [])

  const setAnchorDay = useCallback((dayId: string) => {
    setState((s) => ({ ...s, anchorDayId: dayId }))
  }, [])

  const setDayCategory = useCallback((dayId: string, category: DayCategoryId | null) => {
    setState((s) => {
      const dayCategories = { ...s.dayCategories }
      if (category) dayCategories[dayId] = category
      else delete dayCategories[dayId]
      return { ...s, dayCategories }
    })
  }, [])

  return {
    agendaItems: state.agendaItems,
    backlogItems: state.backlogItems,
    anchorDayId: state.anchorDayId,
    dayCategories: state.dayCategories,
    syncStatus,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    addBacklogItem,
    updateBacklogItem,
    deleteBacklogItem,
    allocate,
    unallocate,
    toggleDone,
    setAnchorDay,
    setDayCategory,
  }
}

export type UsePlannerReturn = ReturnType<typeof usePlanner>
