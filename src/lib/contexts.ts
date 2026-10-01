import type { Context } from './types'

/** Lista inicial de contextos — editável depois pelo usuário (ver usePlanner.addContext). */
export const DEFAULT_CONTEXTS: Context[] = [
  { id: 'pessoal', label: 'Pessoal' },
  { id: 'faculdade', label: 'Faculdade' },
  { id: 'gaeb', label: 'GAEB' },
  { id: 'conexao', label: 'Conexão' },
  { id: 'acampamento', label: 'Acampamento' },
  { id: 'estagio', label: 'Estágio' },
]

export const DEFAULT_CONTEXT_ID = 'pessoal'

export function contextLabel(contexts: Context[], id: string): string {
  return contexts.find((c) => c.id === id)?.label ?? id
}
