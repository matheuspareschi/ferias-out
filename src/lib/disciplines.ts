import type { Discipline } from './types'

/** Lista inicial de disciplinas da Faculdade — editável depois pelo usuário. */
export const DEFAULT_DISCIPLINES: Discipline[] = [
  { id: 'hb', sigla: 'HB', name: 'Hebraico Bíblico' },
  { id: 'hc', sigla: 'HC', name: 'História da Igreja Moderna e Contemporânea' },
  { id: 'at', sigla: 'AT', name: 'Livros Poéticos, Sapienciais e Proféticos' },
  { id: 'nt', sigla: 'NT', name: 'Cartas e Apocalipse' },
  { id: 'ec', sigla: 'EC', name: 'Educação Cristã' },
  { id: 'estagio', sigla: 'ET', name: 'Estágio' },
  { id: 'extensao', sigla: 'EX', name: 'Projeto de Extensão' },
]

/** Disciplinas do sistema (não cadastradas à mão) — sigla/nome sempre sincronizados com DEFAULT_DISCIPLINES. */
const SYSTEM_DISCIPLINE_IDS = new Set(['estagio', 'extensao'])

/**
 * Garante Estágio/Extensão mesmo em dados já salvos antes delas existirem, e
 * mantém sigla/nome delas em dia (ex.: troca de sigla) sem mexer em nenhuma
 * disciplina que o usuário cadastrou à mão.
 */
export function ensureDefaultDisciplines(disciplines: Discipline[]): Discipline[] {
  let changed = false
  const synced = disciplines.map((d) => {
    if (!SYSTEM_DISCIPLINE_IDS.has(d.id)) return d
    const canonical = DEFAULT_DISCIPLINES.find((def) => def.id === d.id)
    if (!canonical || (d.sigla === canonical.sigla && d.name === canonical.name)) return d
    changed = true
    return canonical
  })
  const missing = DEFAULT_DISCIPLINES.filter((d) => !synced.some((existing) => existing.id === d.id))
  if (missing.length === 0 && !changed) return disciplines
  return [...synced, ...missing]
}

export function disciplineLabel(disciplines: Discipline[], id: string): string {
  const d = disciplines.find((x) => x.id === id)
  return d ? `${d.sigla} — ${d.name}` : id
}
