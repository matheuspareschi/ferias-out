import { describe, expect, it } from 'vitest'
import { todayId } from './dates'
import { CURRENT_SCHEMA_VERSION, needsMigration, normalizeState } from './migrations'

describe('normalizeState — v0 (AgendaItem/BacklogItem) → v2', () => {
  it('merges agendaItems and backlogItems into one items[] array', () => {
    const result = normalizeState({
      agendaItems: [{ id: 'a1', dayId: '2026-09-25', title: 'Culto', period: 'noite', order: 0, done: false }],
      backlogItems: [{ id: 'b1', title: 'Lavar o carro', category: 'tarefa', size: 'P', done: false }],
      anchorDayId: '2026-09-25',
    })
    expect(result?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result?.items.map((i) => i.id)).toEqual(['a1', 'b1'])
  })

  it('assigns type event to non-habit agenda items and task to habits and backlog items', () => {
    const result = normalizeState({
      agendaItems: [
        { id: 'a1', dayId: '2026-09-25', title: 'Culto', period: 'noite', order: 0, done: false },
        { id: 'a2', dayId: '2026-09-25', title: 'Devocional', period: null, order: 0, done: false, habit: 'devocional' },
      ],
      backlogItems: [{ id: 'b1', title: 'Lavar o carro', category: 'tarefa', size: 'P', done: false }],
      anchorDayId: '2026-09-25',
    })
    const byId = Object.fromEntries(result!.items.map((i) => [i.id, i]))
    expect(byId.a1.type).toBe('event')
    expect(byId.a2.type).toBe('task')
    expect(byId.b1.type).toBe('task')
  })

  it('applies the confirmed category → context mapping', () => {
    const result = normalizeState({
      agendaItems: [],
      backlogItems: [
        { id: 'b1', title: 'Aula — a definir 1', category: 'aula', size: 'M', done: false },
        { id: 'b2', title: 'Preparo de aula do JVJ', category: 'preparo', size: 'M', done: false },
        { id: 'b3', title: 'Preparo de aula para o GAEB', category: 'preparo', size: 'M', done: false },
        { id: 'b4', title: 'Lavar o carro', category: 'tarefa', size: 'P', done: false },
      ],
      anchorDayId: '2026-09-25',
    })
    const byId = Object.fromEntries(result!.items.map((i) => [i.id, i]))
    expect(byId.b1.context).toBe('faculdade')
    expect(byId.b2.context).toBe('pessoal')
    expect(byId.b3.context).toBe('gaeb')
    expect(byId.b4.context).toBe('pessoal')
  })

  it('carries over an existing allocation as dayId/period/order and leaves unallocated items in the backlog', () => {
    const result = normalizeState({
      agendaItems: [],
      backlogItems: [
        {
          id: 'b1',
          title: 'Preparo de Estudo Bíblico',
          category: 'preparo',
          size: 'M',
          done: false,
          allocation: { dayId: '2026-09-26', period: 'manha', order: 2 },
        },
        { id: 'b2', title: 'Aula — a definir 2', category: 'aula', size: 'M', done: false },
      ],
      anchorDayId: '2026-09-25',
    })
    const byId = Object.fromEntries(result!.items.map((i) => [i.id, i]))
    expect(byId.b1.dayId).toBe('2026-09-26')
    expect(byId.b1.period).toBe('manha')
    expect(byId.b1.order).toBe(2)
    expect(byId.b2.dayId).toBeUndefined()
  })

  it('converts legacy start/duration into period + a human-readable timeNote', () => {
    const result = normalizeState({
      agendaItems: [{ id: 'a1', dayId: '2026-09-25', title: 'Reunião', start: '14:00', duration: 60, done: false }],
      backlogItems: [],
      anchorDayId: '2026-09-25',
    })
    expect(result!.items[0].period).toBe('tarde')
    expect(result!.items[0].timeNote).toBe('14:00–15:00')
  })

  it('converts dayCategories into dayMeta', () => {
    const result = normalizeState({
      agendaItems: [],
      backlogItems: [],
      anchorDayId: '2026-09-25',
      dayCategories: { '2026-09-25': 'piedade' },
    })
    expect(result!.dayMeta['2026-09-25']).toEqual({ category: 'piedade' })
  })

  it('seeds the default context list and drops the P/M/G size for non-Faculdade items', () => {
    const result = normalizeState({
      agendaItems: [],
      backlogItems: [{ id: 'b1', title: 'Lavar o carro', category: 'tarefa', size: 'P', done: false }],
      anchorDayId: '2026-09-25',
    })
    expect(result!.contexts.map((c) => c.id)).toContain('pessoal')
    expect(result!.contexts.map((c) => c.id)).toContain('faculdade')
    expect(result!.items[0].size).toBeUndefined()
  })
})

describe('normalizeState — v1 (Item único, com cor/checklist) → v2', () => {
  function v1State(overrides: Record<string, unknown> = {}) {
    return {
      schemaVersion: 1,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }, { id: 'faculdade', label: 'Faculdade' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [],
      ...overrides,
    }
  }

  it('drops the color field', () => {
    const result = normalizeState(
      v1State({
        items: [{ id: 'i1', type: 'task', title: 'Tarefa', context: 'pessoal', order: 0, done: false, color: 'rust' }],
      }),
    )
    expect(result!.items[0]).not.toHaveProperty('color')
  })

  it('keeps size for Faculdade items and drops it for everything else', () => {
    const result = normalizeState(
      v1State({
        items: [
          { id: 'i1', type: 'task', title: 'Aula HC3', context: 'faculdade', size: 'M', order: 0, done: false },
          { id: 'i2', type: 'task', title: 'Lavar o carro', context: 'pessoal', size: 'P', order: 0, done: false },
        ],
      }),
    )
    const byId = Object.fromEntries(result!.items.map((i) => [i.id, i]))
    expect(byId.i1.size).toBe('M')
    expect(byId.i2.size).toBeUndefined()
  })

  it('turns subitems into real child Items with parentId, inheriting dayId/period/context', () => {
    const result = normalizeState(
      v1State({
        items: [
          {
            id: 'parent-1',
            type: 'task',
            title: 'Preparar o GAEB',
            context: 'gaeb',
            dayId: '2026-09-25',
            period: 'tarde',
            order: 0,
            done: false,
            subitems: [
              { id: 'sub-1', title: 'Escolher música', done: false },
              { id: 'sub-2', title: 'Preparar estudo', done: true },
            ],
          },
        ],
      }),
    )
    expect(result!.items).toHaveLength(3)
    const byId = Object.fromEntries(result!.items.map((i) => [i.id, i]))
    expect(byId['parent-1']).not.toHaveProperty('subitems')
    expect(byId['sub-1']).toMatchObject({
      type: 'task',
      title: 'Escolher música',
      context: 'gaeb',
      dayId: '2026-09-25',
      period: 'tarde',
      done: false,
      parentId: 'parent-1',
    })
    expect(byId['sub-2'].done).toBe(true)
  })

  it('leaves items without subitems untouched aside from dropping color', () => {
    const result = normalizeState(
      v1State({
        items: [{ id: 'i1', type: 'event', title: 'Culto', context: 'pessoal', order: 0, done: false }],
      }),
    )
    expect(result!.items).toHaveLength(1)
  })
})

describe('normalizeState — v2 (sem Faculdade) → v3', () => {
  function v2State(overrides: Record<string, unknown> = {}) {
    return {
      schemaVersion: 2,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }, { id: 'faculdade', label: 'Faculdade' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [{ id: 'i1', type: 'task', title: 'Lavar o carro', context: 'pessoal', order: 0, done: false }],
      ...overrides,
    }
  }

  it('seeds the default discipline list and starts with no units', () => {
    const result = normalizeState(v2State())
    expect(result?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result?.disciplines.map((d) => d.sigla)).toEqual(['HB', 'HC', 'AT', 'NT', 'EC'])
    expect(result?.units).toEqual([])
    expect(result?.facultyNotes).toEqual({ general: '', byDiscipline: {} })
  })

  it('leaves existing items untouched', () => {
    const result = normalizeState(v2State())
    expect(result?.items).toHaveLength(1)
    expect(result?.items[0].id).toBe('i1')
  })

  it('chains all the way from v0 and from v1 too', () => {
    const fromV0 = normalizeState({ agendaItems: [], backlogItems: [], anchorDayId: '2026-09-25' })
    expect(fromV0?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(fromV0?.disciplines.length).toBeGreaterThan(0)

    const fromV1 = normalizeState({
      schemaVersion: 1,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [],
    })
    expect(fromV1?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(fromV1?.disciplines.length).toBeGreaterThan(0)
  })
})

describe('normalizeState — v3 (sem Projetos/Retrospectiva) → v4', () => {
  function v3State(overrides: Record<string, unknown> = {}) {
    return {
      schemaVersion: 3,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [{ id: 'i1', type: 'task', title: 'Lavar o carro', context: 'pessoal', order: 0, done: false }],
      disciplines: [{ id: 'hb', sigla: 'HB', name: 'Hebraico Bíblico' }],
      units: [],
      facultyNotes: { general: '', byDiscipline: {} },
      ...overrides,
    }
  }

  it('starts Projetos/Retrospectiva state empty and leaves the rest untouched', () => {
    const result = normalizeState(v3State())
    expect(result?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result?.gaebIdeias).toEqual([])
    expect(result?.gaebEncontros).toEqual([])
    expect(result?.projectNotes).toEqual({})
    expect(result?.estagioNotes).toBe('')
    expect(result?.estagioHours).toEqual([])
    expect(result?.retrospectives).toEqual({})
    expect(result?.items).toHaveLength(1)
    expect(result?.disciplines[0].sigla).toBe('HB')
  })

  it('chains all the way from v0, v1 and v2 too', () => {
    const fromV0 = normalizeState({ agendaItems: [], backlogItems: [], anchorDayId: '2026-09-25' })
    expect(fromV0?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(fromV0?.retrospectives).toEqual({})

    const fromV2 = normalizeState({
      schemaVersion: 2,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [],
    })
    expect(fromV2?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(fromV2?.retrospectives).toEqual({})
  })
})

describe('normalizeState — v4 (sem referenceWeek) → v5', () => {
  function v4State(overrides: Record<string, unknown> = {}) {
    return {
      schemaVersion: 4,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [{ id: 'i1', type: 'task', title: 'Lavar o carro', context: 'pessoal', order: 0, done: false }],
      disciplines: [{ id: 'hb', sigla: 'HB', name: 'Hebraico Bíblico' }],
      units: [],
      facultyNotes: { general: '', byDiscipline: {} },
      gaebIdeias: [],
      gaebEncontros: [],
      projectNotes: {},
      estagioNotes: '',
      estagioHours: [],
      retrospectives: {},
      ...overrides,
    }
  }

  it('is a pure passthrough — nothing changes, items keep working without referenceWeek', () => {
    const result = normalizeState(v4State())
    expect(result?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result?.items[0].referenceWeek).toBeUndefined()
    expect(result?.gaebIdeias).toEqual([])
  })

  it('carries referenceWeek through when present', () => {
    const result = normalizeState(
      v4State({
        items: [{ id: 'i1', type: 'task', title: 'Escrever relatório', context: 'pessoal', order: 0, done: false, referenceWeek: '2026-W39' }],
      }),
    )
    expect(result?.items[0].referenceWeek).toBe('2026-W39')
  })

  it('chains all the way from v0 through v4', () => {
    const fromV0 = normalizeState({ agendaItems: [], backlogItems: [], anchorDayId: '2026-09-25' })
    expect(fromV0?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)

    const fromV3 = normalizeState({
      schemaVersion: 3,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [],
      disciplines: [],
      units: [],
      facultyNotes: { general: '', byDiscipline: {} },
    })
    expect(fromV3?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(fromV3?.retrospectives).toEqual({})
  })
})

describe('normalizeState — v5 (sem dismissedDayLabels) → v6', () => {
  function v5State(overrides: Record<string, unknown> = {}) {
    return {
      schemaVersion: 5,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [{ id: 'i1', type: 'task', title: 'Lavar o carro', context: 'pessoal', order: 0, done: false }],
      disciplines: [{ id: 'hb', sigla: 'HB', name: 'Hebraico Bíblico' }],
      units: [],
      facultyNotes: { general: '', byDiscipline: {} },
      gaebIdeias: [],
      gaebEncontros: [],
      projectNotes: {},
      estagioNotes: '',
      estagioHours: [],
      retrospectives: {},
      ...overrides,
    }
  }

  it('is a pure passthrough — nothing changes, dismissedDayLabels starts empty', () => {
    const result = normalizeState(v5State())
    expect(result?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result?.dismissedDayLabels).toEqual([])
    expect(result?.items[0].id).toBe('i1')
  })

  it('chains all the way from v0 through v4', () => {
    const fromV0 = normalizeState({ agendaItems: [], backlogItems: [], anchorDayId: '2026-09-25' })
    expect(fromV0?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(fromV0?.dismissedDayLabels).toEqual([])

    const fromV4 = normalizeState({
      schemaVersion: 4,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [],
      disciplines: [],
      units: [],
      facultyNotes: { general: '', byDiscipline: {} },
      gaebIdeias: [],
      gaebEncontros: [],
      projectNotes: {},
      estagioNotes: '',
      estagioHours: [],
      retrospectives: {},
    })
    expect(fromV4?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(fromV4?.dismissedDayLabels).toEqual([])
  })
})

describe('normalizeState — v6 (projectNotes nota única) → v7 (anotações datadas)', () => {
  function v6State(overrides: Record<string, unknown> = {}) {
    return {
      schemaVersion: 6,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [],
      disciplines: [],
      units: [],
      facultyNotes: { general: '', byDiscipline: {} },
      gaebIdeias: [],
      gaebEncontros: [],
      projectNotes: { conexao: 'nota antiga de conexão' },
      estagioNotes: '',
      estagioHours: [],
      retrospectives: {},
      dismissedDayLabels: [],
      ...overrides,
    }
  }

  it('turns a non-empty single note into a dated entry for today', () => {
    const result = normalizeState(v6State())
    expect(result?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result?.projectNotes.conexao).toEqual({ [todayId()]: 'nota antiga de conexão' })
  })

  it('drops an empty/blank single note instead of creating an empty-text dated entry', () => {
    const result = normalizeState(v6State({ projectNotes: { acampamento: '   ' } }))
    expect(result?.projectNotes.acampamento).toBeUndefined()
  })

  it('chains all the way from v0 and v4', () => {
    const fromV0 = normalizeState({ agendaItems: [], backlogItems: [], anchorDayId: '2026-09-25' })
    expect(fromV0?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(fromV0?.projectNotes).toEqual({})

    const fromV4 = normalizeState({
      schemaVersion: 4,
      contexts: [{ id: 'pessoal', label: 'Pessoal' }],
      dayMeta: {},
      anchorDayId: '2026-09-25',
      items: [],
      disciplines: [],
      units: [],
      facultyNotes: { general: '', byDiscipline: {} },
      gaebIdeias: [],
      gaebEncontros: [],
      projectNotes: { gaeb: 'texto' },
      estagioNotes: '',
      estagioHours: [],
      retrospectives: {},
    })
    expect(fromV4?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(fromV4?.projectNotes.gaeb).toEqual({ [todayId()]: 'texto' })
  })
})

describe('needsMigration', () => {
  it('is true for legacy v0 shapes, v1, v2, v3, v4, v5 and v6', () => {
    expect(needsMigration({ agendaItems: [], backlogItems: [], anchorDayId: '2026-09-25' })).toBe(true)
    expect(needsMigration({ schemaVersion: 1, items: [], anchorDayId: '2026-09-25' })).toBe(true)
    expect(needsMigration({ schemaVersion: 2, items: [], anchorDayId: '2026-09-25' })).toBe(true)
    expect(needsMigration({ schemaVersion: 3, items: [], anchorDayId: '2026-09-25' })).toBe(true)
    expect(needsMigration({ schemaVersion: 4, items: [], anchorDayId: '2026-09-25' })).toBe(true)
    expect(needsMigration({ schemaVersion: 5, items: [], anchorDayId: '2026-09-25' })).toBe(true)
    expect(needsMigration({ schemaVersion: 6, items: [], anchorDayId: '2026-09-25' })).toBe(true)
  })

  it('is false for the current shape and for garbage', () => {
    expect(needsMigration({ schemaVersion: CURRENT_SCHEMA_VERSION, items: [], anchorDayId: '2026-09-25' })).toBe(
      false,
    )
    expect(needsMigration(null)).toBe(false)
    expect(needsMigration({})).toBe(false)
  })
})

describe('normalizeState — current shape passthrough', () => {
  it('passes through an already-current blob, filling in missing optional fields', () => {
    const result = normalizeState({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      items: [{ id: 'i1', title: 'Tarefa' }],
      anchorDayId: '2026-09-25',
    })
    expect(result?.items[0]).toMatchObject({ id: 'i1', title: 'Tarefa', type: 'task', done: false, order: 0 })
    expect(result?.disciplines.length).toBeGreaterThan(0)
    expect(result?.units).toEqual([])
    expect(result?.dismissedDayLabels).toEqual([])
  })

  it('carries dismissedDayLabels through when already present', () => {
    const result = normalizeState({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      items: [],
      anchorDayId: '2026-09-25',
      dismissedDayLabels: ['2026-10-03'],
    })
    expect(result?.dismissedDayLabels).toEqual(['2026-10-03'])
  })

  it('returns null for unrecognizable input', () => {
    expect(normalizeState(null)).toBeNull()
    expect(normalizeState({})).toBeNull()
    expect(normalizeState({ foo: 'bar' })).toBeNull()
  })
})
