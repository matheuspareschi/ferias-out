import type { Discipline } from './types'

/** Lista inicial de disciplinas da Faculdade — editável depois pelo usuário. */
export const DEFAULT_DISCIPLINES: Discipline[] = [
  { id: 'hb', sigla: 'HB', name: 'Hebraico Bíblico' },
  { id: 'hc', sigla: 'HC', name: 'História da Igreja Moderna e Contemporânea' },
  { id: 'at', sigla: 'AT', name: 'Livros Poéticos, Sapienciais e Proféticos' },
  { id: 'nt', sigla: 'NT', name: 'Cartas e Apocalipse' },
  { id: 'ec', sigla: 'EC', name: 'Educação Cristã' },
]

export function disciplineLabel(disciplines: Discipline[], id: string): string {
  const d = disciplines.find((x) => x.id === id)
  return d ? `${d.sigla} — ${d.name}` : id
}
