import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_CONTEXT_ID, DEFAULT_CONTEXTS } from '@/lib/contexts'
import { defaultAnchorDayId } from '@/lib/days'
import { validateDateInput } from '@/lib/dates'
import { DEFAULT_DISCIPLINES } from '@/lib/disciplines'
import { syncUnitReviews } from '@/lib/facultyReviews'
import { HABIT_LABEL, HABIT_ORDER } from '@/lib/habits'
import { CURRENT_SCHEMA_VERSION, needsMigration, normalizeState, type PlannerState } from '@/lib/migrations'
import { buildSeedItems } from '@/lib/seed'
import { SYNC_ENABLED, supabase } from '@/lib/supabaseClient'
import type { Context, DayCategoryId, GaebEncontro, Item, ItemSize, LiveClassStatus, Retrospective, Unit } from '@/lib/types'

const STORAGE_KEY = 'ferias-planner:v1'
const BACKUP_KEY = 'ferias-planner:backup:pre-migration'
const SYNC_TABLE = 'planner_state'
const SYNC_ROW_ID = 'default'

export type SyncStatus = 'disabled' | 'syncing' | 'synced' | 'error'

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Tamanho P/M/G só existe (e só aparece) em itens do contexto Faculdade. */
function clampSize(item: Item): Item {
  return item.context === 'faculdade' ? item : { ...item, size: undefined }
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
    title: HABIT_LABEL[habit],
    context: DEFAULT_CONTEXT_ID,
    dayId,
    period: null,
    order: 0,
    done: false,
    habit,
  }))
  return [...items, ...created]
}

/**
 * Backfill de hábitos pra TODO dia já presente nos itens (4.?: hábitos
 * valem pro dia inteiro de calendário, sem exceção — viagem/retiro/sábado
 * incluídos). Sem isso, um dia só ganharia o conjunto completo de hábitos
 * se tivesse sido a âncora alguma vez; dados antigos (de antes do 6º
 * hábito, por exemplo) ficariam pra sempre incompletos.
 */
function ensureHabitsForAllDays(items: Item[]): Item[] {
  const dayIds = new Set(items.filter((it): it is Item & { dayId: string } => Boolean(it.dayId)).map((it) => it.dayId))
  let result = items
  for (const dayId of dayIds) {
    result = ensureDailyHabits(result, dayId)
  }
  return result
}

/**
 * Recuperação (1.4/1.5): devolve pra "sem período" todo item cujo `dayId`
 * não é uma data real ou válida (ex. ano "0002" de um bug já corrigido no
 * seletor de data) — nenhum item fica preso numa data que o usuário nunca
 * vai alcançar navegando. Idempotente; devolve a mesma referência se nada
 * precisar mudar.
 */
function recoverInvalidDates(items: Item[]): { items: Item[]; recoveredCount: number } {
  let recoveredCount = 0
  const result = items.map((it) => {
    if (it.dayId && !validateDateInput(it.dayId)) {
      recoveredCount++
      return { ...it, dayId: undefined, period: null }
    }
    return it
  })
  return recoveredCount === 0 ? { items, recoveredCount: 0 } : { items: result, recoveredCount }
}

function seedState(): PlannerState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    items: ensureHabitsForAllDays(ensureDailyHabits(buildSeedItems(), defaultAnchorDayId())),
    contexts: DEFAULT_CONTEXTS,
    dayMeta: {},
    anchorDayId: defaultAnchorDayId(),
    disciplines: DEFAULT_DISCIPLINES,
    units: [],
    facultyNotes: { general: '', byDiscipline: {} },
    gaebIdeias: [],
    gaebEncontros: [],
    projectNotes: {},
    estagioNotes: '',
    estagioHours: [],
    retrospectives: {},
    dismissedDayLabels: [],
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
      if (needsMigration(parsed)) backupLegacyBlobIfNeeded(raw)
      const normalized = normalizeState(parsed)
      if (normalized) {
        const { items: recovered, recoveredCount } = recoverInvalidDates(normalized.items)
        if (recoveredCount > 0) {
          window.setTimeout(() => {
            window.alert(
              `${recoveredCount} item(ns) com data inválida foi(ram) devolvido(s) pra "sem período" — confira o grupo "sem período" na página Backlog.`,
            )
          }, 0)
        }
        return withTodayAnchor({ ...normalized, items: ensureHabitsForAllDays(recovered) })
      }
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
        if (needsMigration(data?.data)) backupLegacyBlobIfNeeded(JSON.stringify(data?.data))
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
            | 'endDayId'
            | 'period'
            | 'order'
            | 'timeNote'
            | 'referenceMonth'
            | 'referenceWeek'
            | 'parentId'
            | 'origem'
          >
        >,
    ) => {
      const item: Item = clampSize({
        id: newId('item'),
        type: data.type,
        title: data.title.trim() || (data.type === 'event' ? 'Novo evento' : 'Nova tarefa'),
        context: data.context ?? DEFAULT_CONTEXT_ID,
        size: data.size,
        dayId: data.dayId,
        endDayId: data.endDayId,
        period: data.period ?? null,
        order: data.order ?? 0,
        timeNote: data.timeNote,
        referenceMonth: data.referenceMonth,
        referenceWeek: data.referenceWeek,
        parentId: data.parentId,
        origem: data.origem,
        done: false,
      })
      setState((s) => ({ ...s, items: [...s.items, item] }))
      return item.id
    },
    [],
  )

  const updateItem = useCallback((id: string, patch: Partial<Item>) => {
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? clampSize({ ...it, ...patch }) : it)),
    }))
  }, [])

  /** Apaga o item; subtarefas dele viram itens independentes (não some o trabalho junto). */
  const deleteItem = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      items: s.items
        .filter((it) => it.id !== id)
        .map((it) => (it.parentId === id ? { ...it, parentId: undefined } : it)),
    }))
  }, [])

  /**
   * Tica/destica um item. Se for uma subtarefa, resincroniza o progresso do
   * pai (concluído automaticamente quando todas as irmãs terminam, e pode
   * "desconcluir" se alguma voltar a ficar pendente). Completar manualmente
   * um pai com subtarefas pendentes exige `cascadeToChildren: true` — quem
   * decide pedir confirmação antes é a UI (ver useItemActions).
   */
  const toggleDone = useCallback((id: string, opts?: { cascadeToChildren?: boolean }) => {
    setState((s) => {
      const item = s.items.find((it) => it.id === id)
      if (!item) return s
      const children = s.items.filter((it) => it.parentId === id)
      const nextDone = !item.done

      if (children.length > 0 && nextDone && children.some((c) => !c.done) && !opts?.cascadeToChildren) {
        return s
      }

      let items = s.items.map((it) => {
        if (it.id === id) return { ...it, done: nextDone }
        if (opts?.cascadeToChildren && it.parentId === id) return { ...it, done: true }
        return it
      })

      if (item.parentId) {
        const siblings = items.filter((it) => it.parentId === item.parentId)
        const allDone = siblings.length > 0 && siblings.every((it) => it.done)
        items = items.map((it) => (it.id === item.parentId ? { ...it, done: allDone } : it))
      }

      if (item.unitRole === 'aula' && item.unitId) {
        items = syncUnitReviews(items, s.units, s.disciplines, item.unitId, nextDone)
      }

      return { ...s, items }
    })
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

  const addDiscipline = useCallback((sigla: string, name: string): string => {
    const trimmedSigla = sigla.trim().toUpperCase()
    const trimmedName = name.trim()
    const id = slugify(trimmedSigla) || newId('disciplina')
    setState((s) =>
      s.disciplines.some((d) => d.id === id)
        ? s
        : { ...s, disciplines: [...s.disciplines, { id, sigla: trimmedSigla, name: trimmedName }] },
    )
    return id
  }, [])

  /** Cria a Unidade e, junto, o Item de "aula" ligado a ela (3.1 — alimenta backlog/dias como qualquer tarefa). */
  const addUnit = useCallback((disciplineId: string, number: number, size: ItemSize, pages?: number): string => {
    const unitId = newId('unidade')
    setState((s) => {
      const discipline = s.disciplines.find((d) => d.id === disciplineId)
      const sigla = `${discipline?.sigla ?? 'UN'}${number}`
      const aulaItem: Item = {
        id: newId('aula'),
        type: 'task',
        title: `[${sigla}] Aula`,
        context: 'faculdade',
        size,
        order: 0,
        done: false,
        unitId,
        unitRole: 'aula',
      }
      return {
        ...s,
        units: [...s.units, { id: unitId, disciplineId, number, size, pages }],
        items: [...s.items, aulaItem],
      }
    })
    return unitId
  }, [])

  /** Edita a Unidade; número/tamanho novos também atualizam o título/tamanho da aula e das revisões já criadas. */
  const updateUnit = useCallback((id: string, patch: Partial<Pick<Unit, 'number' | 'size' | 'pages'>>) => {
    setState((s) => {
      const unit = s.units.find((u) => u.id === id)
      if (!unit) return s
      const nextUnit = { ...unit, ...patch }
      const discipline = s.disciplines.find((d) => d.id === nextUnit.disciplineId)
      const sigla = `${discipline?.sigla ?? 'UN'}${nextUnit.number}`
      const items = s.items.map((it) => {
        if (it.unitId !== id) return it
        if (it.unitRole === 'aula') return { ...it, title: `[${sigla}] Aula`, size: nextUnit.size }
        if (it.unitRole === 'revisao') return { ...it, title: `[${sigla}] Revisão ${it.reviewIndex}/3` }
        return it
      })
      return { ...s, units: s.units.map((u) => (u.id === id ? nextUnit : u)), items }
    })
  }, [])

  /** Apaga a Unidade e todos os itens ligados a ela (aula + revisões), feitos ou não. */
  const deleteUnit = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      units: s.units.filter((u) => u.id !== id),
      items: s.items.filter((it) => it.unitId !== id),
    }))
  }, [])

  const addDelivery = useCallback((disciplineId: string, title: string, dayId: string) => {
    setState((s) => {
      const discipline = s.disciplines.find((d) => d.id === disciplineId)
      const label = title.trim()
      const item: Item = {
        id: newId('entrega'),
        type: 'task',
        title: discipline ? `[${discipline.sigla}] ${label}` : label,
        context: 'faculdade',
        dayId,
        period: null,
        order: 0,
        done: false,
        isDelivery: true,
        disciplineId,
      }
      return { ...s, items: [...s.items, item] }
    })
  }, [])

  const addLiveClass = useCallback((disciplineId: string, title: string, dayId: string, timeNote?: string) => {
    setState((s) => {
      const discipline = s.disciplines.find((d) => d.id === disciplineId)
      const label = title.trim()
      const item: Item = {
        id: newId('aulavivo'),
        type: 'event',
        title: discipline ? `[${discipline.sigla}] ${label}` : label,
        context: 'faculdade',
        dayId,
        period: null,
        order: 0,
        timeNote,
        done: false,
        disciplineId,
        liveClassStatus: 'vou',
      }
      return { ...s, items: [...s.items, item] }
    })
  }, [])

  const setLiveClassStatus = useCallback((id: string, status: LiveClassStatus) => {
    setState((s) => ({ ...s, items: s.items.map((it) => (it.id === id ? { ...it, liveClassStatus: status } : it)) }))
  }, [])

  /** `disciplineId: null` grava a nota geral da Faculdade; com id, grava a nota daquela disciplina. */
  const setFacultyNote = useCallback((disciplineId: string | null, text: string) => {
    setState((s) => ({
      ...s,
      facultyNotes:
        disciplineId === null
          ? { ...s.facultyNotes, general: text }
          : { ...s.facultyNotes, byDiscipline: { ...s.facultyNotes.byDiscipline, [disciplineId]: text } },
    }))
  }, [])

  const addGaebIdea = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setState((s) => ({ ...s, gaebIdeias: [...s.gaebIdeias, { id: newId('ideia'), text: trimmed }] }))
  }, [])

  const deleteGaebIdea = useCallback((id: string) => {
    setState((s) => ({ ...s, gaebIdeias: s.gaebIdeias.filter((i) => i.id !== id) }))
  }, [])

  /** Cria ou atualiza o encontro do dia (um por dia) — usado pelo calendário pequeno do GAEB. */
  const upsertGaebEncontro = useCallback(
    (dayId: string, patch: Partial<Pick<GaebEncontro, 'comments' | 'tema' | 'pessoas' | 'comida'>>) => {
      setState((s) => {
        const existing = s.gaebEncontros.find((e) => e.dayId === dayId)
        if (existing) {
          return { ...s, gaebEncontros: s.gaebEncontros.map((e) => (e.dayId === dayId ? { ...e, ...patch } : e)) }
        }
        return {
          ...s,
          gaebEncontros: [...s.gaebEncontros, { id: newId('encontro'), dayId, comments: '', ...patch }],
        }
      })
    },
    [],
  )

  const deleteGaebEncontro = useCallback((dayId: string) => {
    setState((s) => ({ ...s, gaebEncontros: s.gaebEncontros.filter((e) => e.dayId !== dayId) }))
  }, [])

  /** Anotação datada por contexto de projeto (hoje: conexao, acampamento) — 7.1. */
  const setProjectNote = useCallback((contextId: string, dayId: string, text: string) => {
    setState((s) => ({
      ...s,
      projectNotes: { ...s.projectNotes, [contextId]: { ...s.projectNotes[contextId], [dayId]: text } },
    }))
  }, [])

  const setEstagioNotes = useCallback((text: string) => {
    setState((s) => ({ ...s, estagioNotes: text }))
  }, [])

  const addEstagioHours = useCallback((activity: string, hours: number) => {
    const trimmed = activity.trim()
    if (!trimmed || !Number.isFinite(hours) || hours <= 0) return
    setState((s) => ({ ...s, estagioHours: [...s.estagioHours, { id: newId('horas'), activity: trimmed, hours }] }))
  }, [])

  const deleteEstagioHours = useCallback((id: string) => {
    setState((s) => ({ ...s, estagioHours: s.estagioHours.filter((h) => h.id !== id) }))
  }, [])

  /** Mês no formato "YYYY-MM" — cria a retrospectiva na primeira edição. */
  const setRetrospective = useCallback((month: string, patch: Partial<Retrospective>) => {
    setState((s) => {
      const current: Retrospective = s.retrospectives[month] ?? { from: '', alive: '', wantToAppear: '' }
      return { ...s, retrospectives: { ...s.retrospectives, [month]: { ...current, ...patch } } }
    })
  }, [])

  /** Descarta um rótulo legado de DAY_LABELS (5.1, wizard de limpeza) — não apaga a constante, só esconde na UI. */
  const dismissDayLabel = useCallback((dayId: string) => {
    setState((s) => (s.dismissedDayLabels.includes(dayId) ? s : { ...s, dismissedDayLabels: [...s.dismissedDayLabels, dayId] }))
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
    disciplines: state.disciplines,
    units: state.units,
    facultyNotes: state.facultyNotes,
    gaebIdeias: state.gaebIdeias,
    gaebEncontros: state.gaebEncontros,
    projectNotes: state.projectNotes,
    estagioNotes: state.estagioNotes,
    estagioHours: state.estagioHours,
    retrospectives: state.retrospectives,
    dismissedDayLabels: state.dismissedDayLabels,
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
    addDiscipline,
    addUnit,
    updateUnit,
    deleteUnit,
    addDelivery,
    addLiveClass,
    setLiveClassStatus,
    setFacultyNote,
    addGaebIdea,
    deleteGaebIdea,
    upsertGaebEncontro,
    deleteGaebEncontro,
    setProjectNote,
    setEstagioNotes,
    addEstagioHours,
    deleteEstagioHours,
    setRetrospective,
    dismissDayLabel,
    /** Estado completo, pronto pra `JSON.stringify` num botão de exportar. */
    exportState: () => state,
    importState,
  }
}

export type UsePlannerReturn = ReturnType<typeof usePlanner>
export type { Context }
