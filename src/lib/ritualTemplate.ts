/**
 * Ritual de abertura/encerramento do Trabalho — o arquivo (.md) é um texto
 * fixo com "lacunas" marcadas por tokens (`= resposta tipo texto =` etc.).
 * Este módulo é só ida-e-volta texto↔dados: nunca decide layout. O texto
 * fixo (orações, frase do meio, separadores) nunca muda — só o conteúdo das
 * lacunas é lido/escrito, âncorado pelo texto fixo ao redor de cada uma.
 */

export type RitualFieldType = 'text' | 'tasks' | 'rating'

export interface RitualTask {
  title: string
  done: boolean
}

export interface RitualTextValue {
  type: 'text'
  value: string
}

export interface RitualTasksValue {
  type: 'tasks'
  value: RitualTask[]
}

export interface RitualRatingValue {
  type: 'rating'
  rating: number | null
  comment: string
}

export type RitualFieldValue = RitualTextValue | RitualTasksValue | RitualRatingValue

export type RitualAnswers = Record<string, RitualFieldValue>

interface RitualFieldDef {
  id: string
  type: RitualFieldType
  /** Token original do arquivo — usado como "vazio" na escrita e pra detectar campo ainda não respondido na leitura. */
  placeholder: string
}

function text(id: string): string {
  return `{{${id}}}`
}

const PLACEHOLDER_TEXT = '= resposta tipo texto ='
const PLACEHOLDER_TASKS = '= resposta tipo tarefa ='
const PLACEHOLDER_TASKS_NA = '= resposta tipo tarefa ou N/A = '
const PLACEHOLDER_TASKS_CAPS = '= resposta tipo TAREFAS ='
const PLACEHOLDER_RATING = '= PONTOS DE 1 ATÉ 5 = -= resposta tipo texto ='

/** Definição de cada campo, na ordem em que aparece no arquivo. */
const FIELDS: RitualFieldDef[] = [
  { id: 'abertura_ontem', type: 'text', placeholder: PLACEHOLDER_TEXT },
  { id: 'abertura_foco_manha', type: 'tasks', placeholder: PLACEHOLDER_TASKS },
  { id: 'abertura_foco_tarde', type: 'tasks', placeholder: PLACEHOLDER_TASKS },
  { id: 'abertura_proximas', type: 'tasks', placeholder: PLACEHOLDER_TASKS_NA },
  { id: 'abertura_fora_padrao', type: 'text', placeholder: PLACEHOLDER_TEXT },
  { id: 'abertura_chegada_pessoal', type: 'rating', placeholder: PLACEHOLDER_RATING },
  { id: 'abertura_chegada_trabalho', type: 'rating', placeholder: PLACEHOLDER_RATING },
  { id: 'abertura_chegada_espiritual', type: 'rating', placeholder: PLACEHOLDER_RATING },
  { id: 'abertura_chegada_comentario', type: 'text', placeholder: PLACEHOLDER_TEXT },
  { id: 'encerramento_entregue', type: 'text', placeholder: PLACEHOLDER_TEXT },
  { id: 'encerramento_impedimento', type: 'text', placeholder: PLACEHOLDER_TEXT },
  { id: 'encerramento_objetivos', type: 'text', placeholder: PLACEHOLDER_TEXT },
  { id: 'encerramento_aberto_amanha', type: 'tasks', placeholder: PLACEHOLDER_TASKS_CAPS },
  { id: 'encerramento_nao_funcionou', type: 'text', placeholder: PLACEHOLDER_TEXT },
  { id: 'encerramento_funcionou', type: 'text', placeholder: PLACEHOLDER_TEXT },
  { id: 'encerramento_fechamento_pessoal', type: 'rating', placeholder: PLACEHOLDER_RATING },
  { id: 'encerramento_fechamento_trabalho', type: 'rating', placeholder: PLACEHOLDER_RATING },
  { id: 'encerramento_fechamento_espiritual', type: 'rating', placeholder: PLACEHOLDER_RATING },
  { id: 'encerramento_fechamento_comentario', type: 'text', placeholder: PLACEHOLDER_TEXT },
]

export const RITUAL_FIELD_IDS = FIELDS.map((f) => f.id)

const FIELD_BY_ID = new Map(FIELDS.map((f) => [f.id, f]))

/**
 * Texto fixo do ritual, exatamente como o usuário mandou (orações, frase do
 * meio, separadores `----`/`---`, nunca mexe). As lacunas viram tokens
 * `{{id}}` aqui, substituídos de verdade em `renderRitualFile`.
 */
const TEMPLATE = `# Abertura
----
#### Ore e agradeça pelo dia iniciado
----
#### O que ficou aberto de ontem? Revise o Jira, anotações ou mensagens; não para resolver - só para ter consciência.
${text('abertura_ontem')}
#### Qual é o foco do dia? Antecipe sem ansiar
**Manhã**
${text('abertura_foco_manha')}
**Tarde**
${text('abertura_foco_tarde')}

#### Próximas atividades a realizar:
${text('abertura_proximas')}
#### Tem algo fora do padrão hoje? Existe algo na agenda para hoje?
${text('abertura_fora_padrao')}
#### Como você está chegando?
- **Pessoal:** ${text('abertura_chegada_pessoal')}
- **Traballho:** ${text('abertura_chegada_trabalho')}
- **Espiritual:** ${text('abertura_chegada_espiritual')}
- **Comentário:** ${text('abertura_chegada_comentario')}


---

#### + Ao sentir um impulso, respire por dez segundos — este não é o momento para distrações. +

---


# Encerramento

#### O que foi entregue hoje?  O que foi feito? O que não foi? O que chegou de surpresa e consumiu tempo? _Revise o Toggl e o Jira. Não avalie — só observe._
${text('encerramento_entregue')}


#### O que me impediu hoje foi meu / ambiente / dependência / agenda / sem impedimentos?
${text('encerramento_impedimento')}


#### Os objetivos do dia foram atingidos?
${text('encerramento_objetivos')}


#### O que ficou em aberto e precisa ir para amanhã? Alguma demanda ou contexto que vai influencia amanhã? Registre no Jira ou em uma nota. Isso esvazia a cabeça - você não precisa guardar o que está escrito.
${text('encerramento_aberto_amanha')}


#### Uma coisa que não funcionou hoje?
${text('encerramento_nao_funcionou')}


#### Uma coisa que funcionou bem hoje?
${text('encerramento_funcionou')}


#### Como você encerra o dia?
- **Pessoal:** ${text('encerramento_fechamento_pessoal')}
- **Traballho:** ${text('encerramento_fechamento_trabalho')}
- **Espiritual:** ${text('encerramento_fechamento_espiritual')}
- **Comentário:** ${text('encerramento_fechamento_comentario')}

----
#### Ore e agradeça pelo trabalho concluído
----
`

/** Divide o template em segmentos alternados: literal (texto fixo) e campo (id). */
function splitTemplate(): { literal: string; fieldId: string | null }[] {
  const parts: { literal: string; fieldId: string | null }[] = []
  const re = /\{\{(\w+)\}\}/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(TEMPLATE))) {
    parts.push({ literal: TEMPLATE.slice(last, match.index), fieldId: match[1] })
    last = match.index + match[0].length
  }
  parts.push({ literal: TEMPLATE.slice(last), fieldId: null })
  return parts
}

const SEGMENTS = splitTemplate()

export function emptyRitualAnswers(): RitualAnswers {
  const answers: RitualAnswers = {}
  for (const field of FIELDS) {
    answers[field.id] =
      field.type === 'text'
        ? { type: 'text', value: '' }
        : field.type === 'tasks'
          ? { type: 'tasks', value: [] }
          : { type: 'rating', rating: null, comment: '' }
  }
  return answers
}

function parseTasks(raw: string): RitualTask[] {
  return raw
    .split('\n')
    .map((line) => /^\s*-\s*\[( |x|X)\]\s*(.*)$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ done: m[1].toLowerCase() === 'x', title: m[2].trim() }))
    .filter((t) => t.title.length > 0)
}

function renderTasks(tasks: RitualTask[]): string {
  return tasks.map((t) => `- [${t.done ? 'x' : ' '}] ${t.title}`).join('\n')
}

/** Nota de 0 a 5 em passos de meio ponto (0, 0.5, 1, 1.5 … 5). */
function isValidRating(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= 5 && Math.round(n * 2) === n * 2
}

function parseRating(raw: string): RitualRatingValue {
  const trimmed = raw.trim()
  const withComment = /^(\d+(?:\.5)?)\s*-\s*(.*)$/s.exec(trimmed)
  if (withComment && isValidRating(Number(withComment[1]))) {
    return { type: 'rating', rating: Number(withComment[1]), comment: withComment[2].trim() }
  }
  const onlyNumber = /^(\d+(?:\.5)?)$/.exec(trimmed)
  if (onlyNumber && isValidRating(Number(onlyNumber[1]))) {
    return { type: 'rating', rating: Number(onlyNumber[1]), comment: '' }
  }
  return { type: 'rating', rating: null, comment: trimmed }
}

function renderRating(v: RitualRatingValue): string {
  const parts = [v.rating != null ? String(v.rating) : '', v.comment.trim()].filter(Boolean)
  return parts.join(' - ')
}

/**
 * Lê um arquivo de ritual: ancora cada campo pelo texto fixo ao redor (na
 * ordem do template) e extrai o que estiver entre as âncoras. Campo cujo
 * conteúdo ainda é o placeholder original volta vazio. Pura.
 */
export function parseRitualFile(raw: string): RitualAnswers {
  const answers = emptyRitualAnswers()
  let cursor = 0
  for (let i = 0; i < SEGMENTS.length; i++) {
    const { literal, fieldId } = SEGMENTS[i]
    const idx = raw.indexOf(literal, cursor)
    if (idx === -1) break
    cursor = idx + literal.length
    if (!fieldId) break
    const next = SEGMENTS[i + 1]
    const endIdx = next ? raw.indexOf(next.literal, cursor) : raw.length
    if (endIdx === -1) break
    const rawValue = raw.slice(cursor, endIdx)
    const field = FIELD_BY_ID.get(fieldId)
    if (!field) continue
    const isUnanswered = rawValue.trim() === field.placeholder.trim()
    if (field.type === 'text') {
      answers[fieldId] = { type: 'text', value: isUnanswered ? '' : rawValue.trim() }
    } else if (field.type === 'tasks') {
      answers[fieldId] = { type: 'tasks', value: isUnanswered ? [] : parseTasks(rawValue) }
    } else {
      answers[fieldId] = isUnanswered ? { type: 'rating', rating: null, comment: '' } : parseRating(rawValue)
    }
    cursor = endIdx
  }
  return answers
}

/** Reconstrói o arquivo inteiro a partir das respostas — texto fixo sempre idêntico ao template. Pura. */
export function renderRitualFile(answers: RitualAnswers): string {
  let out = ''
  for (const { literal, fieldId } of SEGMENTS) {
    out += literal
    if (!fieldId) continue
    const field = FIELD_BY_ID.get(fieldId)
    const value = answers[fieldId]
    if (!field || !value) continue
    if (value.type === 'text') {
      out += value.value.trim() ? value.value : field.placeholder
    } else if (value.type === 'tasks') {
      out += value.value.length > 0 ? renderTasks(value.value) : field.placeholder
    } else if (value.type === 'rating') {
      const rendered = renderRating(value)
      out += rendered ? rendered : field.placeholder
    }
  }
  return out
}
