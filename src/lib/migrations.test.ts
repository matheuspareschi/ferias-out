import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, migrateV0ToV1, needsV0Migration, normalizeState } from './migrations'

describe('migrateV0ToV1', () => {
  it('merges agendaItems and backlogItems into one items[] array', () => {
    const result = migrateV0ToV1({
      agendaItems: [{ id: 'a1', dayId: '2026-09-25', title: 'Culto', period: 'noite', order: 0, done: false }],
      backlogItems: [{ id: 'b1', title: 'Lavar o carro', category: 'tarefa', size: 'P', done: false }],
      anchorDayId: '2026-09-25',
    })
    expect(result.items).toHaveLength(2)
    expect(result.items.map((i) => i.id)).toEqual(['a1', 'b1'])
  })

  it('assigns type event to non-habit agenda items and task to habits and backlog items', () => {
    const result = migrateV0ToV1({
      agendaItems: [
        { id: 'a1', dayId: '2026-09-25', title: 'Culto', period: 'noite', order: 0, done: false },
        { id: 'a2', dayId: '2026-09-25', title: 'Devocional', period: null, order: 0, done: false, habit: 'devocional' },
      ],
      backlogItems: [{ id: 'b1', title: 'Lavar o carro', category: 'tarefa', size: 'P', done: false }],
      anchorDayId: '2026-09-25',
    })
    const byId = Object.fromEntries(result.items.map((i) => [i.id, i]))
    expect(byId.a1.type).toBe('event')
    expect(byId.a2.type).toBe('task')
    expect(byId.b1.type).toBe('task')
  })

  it('applies the confirmed category → context mapping', () => {
    const result = migrateV0ToV1({
      agendaItems: [],
      backlogItems: [
        { id: 'b1', title: 'Aula — a definir 1', category: 'aula', size: 'M', done: false },
        { id: 'b2', title: 'Preparo de aula do JVJ', category: 'preparo', size: 'M', done: false },
        { id: 'b3', title: 'Preparo de aula para o GAEB', category: 'preparo', size: 'M', done: false },
        { id: 'b4', title: 'Lavar o carro', category: 'tarefa', size: 'P', done: false },
      ],
      anchorDayId: '2026-09-25',
    })
    const byId = Object.fromEntries(result.items.map((i) => [i.id, i]))
    expect(byId.b1.context).toBe('faculdade')
    expect(byId.b2.context).toBe('pessoal')
    expect(byId.b3.context).toBe('gaeb')
    expect(byId.b4.context).toBe('pessoal')
  })

  it('carries over an existing allocation as dayId/period/order and leaves unallocated items in the backlog', () => {
    const result = migrateV0ToV1({
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
    const byId = Object.fromEntries(result.items.map((i) => [i.id, i]))
    expect(byId.b1.dayId).toBe('2026-09-26')
    expect(byId.b1.period).toBe('manha')
    expect(byId.b1.order).toBe(2)
    expect(byId.b2.dayId).toBeUndefined()
  })

  it('converts legacy start/duration into period + a human-readable timeNote', () => {
    const result = migrateV0ToV1({
      agendaItems: [
        { id: 'a1', dayId: '2026-09-25', title: 'Reunião', start: '14:00', duration: 60, done: false },
      ],
      backlogItems: [],
      anchorDayId: '2026-09-25',
    })
    expect(result.items[0].period).toBe('tarde')
    expect(result.items[0].timeNote).toBe('14:00–15:00')
  })

  it('converts dayCategories into dayMeta', () => {
    const result = migrateV0ToV1({
      agendaItems: [],
      backlogItems: [],
      anchorDayId: '2026-09-25',
      dayCategories: { '2026-09-25': 'piedade' },
    })
    expect(result.dayMeta['2026-09-25']).toEqual({ category: 'piedade' })
  })

  it('stamps the current schema version and seeds the default context list', () => {
    const result = migrateV0ToV1({ agendaItems: [], backlogItems: [], anchorDayId: '2026-09-25' })
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.contexts.map((c) => c.id)).toContain('pessoal')
    expect(result.contexts.map((c) => c.id)).toContain('faculdade')
  })
})

describe('needsV0Migration', () => {
  it('is true for legacy shapes without a schemaVersion', () => {
    expect(needsV0Migration({ agendaItems: [], backlogItems: [], anchorDayId: '2026-09-25' })).toBe(true)
  })

  it('is false for the current shape and for garbage', () => {
    expect(needsV0Migration({ schemaVersion: CURRENT_SCHEMA_VERSION, items: [], anchorDayId: '2026-09-25' })).toBe(
      false,
    )
    expect(needsV0Migration(null)).toBe(false)
    expect(needsV0Migration({})).toBe(false)
  })
})

describe('normalizeState', () => {
  it('migrates a legacy v0 blob end to end', () => {
    const result = normalizeState({
      agendaItems: [{ id: 'a1', dayId: '2026-09-25', title: 'Culto', period: 'noite', order: 0, done: false }],
      backlogItems: [],
      anchorDayId: '2026-09-25',
    })
    expect(result?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result?.items).toHaveLength(1)
  })

  it('passes through an already-current blob, filling in missing optional fields', () => {
    const result = normalizeState({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      items: [{ id: 'i1', title: 'Tarefa' }],
      anchorDayId: '2026-09-25',
    })
    expect(result?.items[0]).toMatchObject({ id: 'i1', title: 'Tarefa', type: 'task', done: false, order: 0 })
  })

  it('returns null for unrecognizable input', () => {
    expect(normalizeState(null)).toBeNull()
    expect(normalizeState({})).toBeNull()
    expect(normalizeState({ foo: 'bar' })).toBeNull()
  })
})
