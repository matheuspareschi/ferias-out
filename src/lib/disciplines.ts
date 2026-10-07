import type { Discipline } from './types'

/** Lista inicial de disciplinas da Faculdade — editável depois pelo usuário. */
export const DEFAULT_DISCIPLINES: Discipline[] = [
  { id: 'hb', sigla: 'HB', name: 'Hebraico Bíblico' },
  { id: 'hc', sigla: 'HC', name: 'História da Igreja Moderna e Contemporânea' },
  { id: 'at', sigla: 'AT', name: 'Livros Poéticos, Sapienciais e Proféticos' },
  { id: 'nt', sigla: 'NT', name: 'Cartas e Apocalipse' },
  { id: 'ec', sigla: 'EC', name: 'Educação Cristã' },
  { id: 'estagio', sigla: 'EST', name: 'Estágio' },
  { id: 'extensao', sigla: 'EXT', name: 'Projeto de Extensão' },
]

/** Garante Estágio/Extensão mesmo em dados já salvos antes delas existirem (não mexe no resto). */
export function ensureDefaultDisciplines(disciplines: Discipline[]): Discipline[] {
  const missing = DEFAULT_DISCIPLINES.filter((d) => !disciplines.some((existing) => existing.id === d.id))
  return missing.length === 0 ? disciplines : [...disciplines, ...missing]
}

export function disciplineLabel(disciplines: Discipline[], id: string): string {
  const d = disciplines.find((x) => x.id === id)
  return d ? `${d.sigla} — ${d.name}` : id
}
