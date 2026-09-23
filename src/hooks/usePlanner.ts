import { useCallback, useEffect, useState } from 'react'
import { defaultAnchorDayId } from '@/lib/days'
import { buildSeedAgendaItems, buildSeedBacklogItems } from '@/lib/seed'
import type { AgendaItem, BacklogItem } from '@/lib/types'

const STORAGE_KEY = 'ferias-planner:v1'

interface PlannerState {
  agendaItems: AgendaItem[]
  backlogItems: BacklogItem[]
  anchorDayId: string
}

function loadState(): PlannerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlannerState>
      if (Array.isArray(parsed.agendaItems) && Array.isArray(parsed.backlogItems) && parsed.anchorDayId) {
        return parsed as PlannerState
      }
    }
  } catch {
    // localStorage indisponível ou dados corrompidos — cai para o seed
  }
  return {
    agendaItems: buildSeedAgendaItems(),
    backlogItems: buildSeedBacklogItems(),
    anchorDayId: defaultAnchorDayId(),
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function usePlanner() {
  const [state, setState] = useState<PlannerState>(loadState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage indisponível/cheio — segue só em memória
    }
  }, [state])

  const addAgendaItem = useCallback(
    (dayId: string, data: Partial<Pick<AgendaItem, 'title' | 'start' | 'duration'>> = {}) => {
      const item: AgendaItem = {
        id: newId('agenda'),
        dayId,
        title: data.title?.trim() || 'Novo compromisso',
        start: data.start ?? null,
        duration: data.duration ?? null,
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

  return {
    agendaItems: state.agendaItems,
    backlogItems: state.backlogItems,
    anchorDayId: state.anchorDayId,
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
  }
}

export type UsePlannerReturn = ReturnType<typeof usePlanner>
