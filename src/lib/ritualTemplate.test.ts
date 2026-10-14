import { describe, expect, it } from 'vitest'
import { emptyRitualAnswers, parseRitualFile, renderRitualFile, RITUAL_FIELD_IDS, type RitualAnswers } from './ritualTemplate'

describe('renderRitualFile', () => {
  it('reproduces the exact fixed text when every field is empty — prayers, dashes and the middle phrase untouched', () => {
    const out = renderRitualFile(emptyRitualAnswers())
    expect(out).toContain('#### Ore e agradeça pelo dia iniciado')
    expect(out).toContain('#### + Ao sentir um impulso, respire por dez segundos — este não é o momento para distrações. +')
    expect(out).toContain('#### Ore e agradeça pelo trabalho concluído')
    expect(out).toContain('# Abertura')
    expect(out).toContain('# Encerramento')
    // placeholders for every field are present when nothing was answered
    expect(out).toContain('= resposta tipo texto =')
    expect(out).toContain('= resposta tipo tarefa =')
    expect(out).toContain('= resposta tipo tarefa ou N/A =')
    expect(out).toContain('= resposta tipo TAREFAS =')
    expect(out).toContain('= PONTOS DE 1 ATÉ 5 = -= resposta tipo texto =')
  })

  it('fills in a text field and leaves everything else as placeholders', () => {
    const answers = emptyRitualAnswers()
    answers.abertura_ontem = { type: 'text', value: 'Nada pendente do Jira.' }
    const out = renderRitualFile(answers)
    expect(out).toContain('Nada pendente do Jira.')
    expect(out).not.toContain('= resposta tipo texto =\n#### Qual')
  })

  it('renders a task list as GFM checkboxes, done and pending', () => {
    const answers = emptyRitualAnswers()
    answers.abertura_foco_manha = {
      type: 'tasks',
      value: [
        { title: 'Revisar HB1', done: true },
        { title: 'Reunião 10h', done: false },
      ],
    }
    const out = renderRitualFile(answers)
    expect(out).toContain('- [x] Revisar HB1')
    expect(out).toContain('- [ ] Reunião 10h')
  })

  it('renders a rating with comment as "N - comentário", and rating alone without the dash', () => {
    const answers = emptyRitualAnswers()
    answers.abertura_chegada_pessoal = { type: 'rating', rating: 4, comment: 'Disposto' }
    answers.abertura_chegada_trabalho = { type: 'rating', rating: 3, comment: '' }
    const out = renderRitualFile(answers)
    expect(out).toContain('4 - Disposto')
    expect(out).toMatch(/Traballho:\*\* 3\n/)
  })
})

describe('parseRitualFile', () => {
  it('round-trips: render → parse gives back the exact same answers', () => {
    const answers: RitualAnswers = {
      ...emptyRitualAnswers(),
      abertura_ontem: { type: 'text', value: 'Revisei o Jira, nada crítico.' },
      abertura_foco_manha: { type: 'tasks', value: [{ title: 'Call com time', done: false }] },
      abertura_foco_tarde: { type: 'tasks', value: [] },
      abertura_proximas: { type: 'tasks', value: [{ title: 'Follow-up cliente X', done: true }] },
      abertura_chegada_pessoal: { type: 'rating', rating: 5, comment: 'Ótimo' },
      abertura_chegada_trabalho: { type: 'rating', rating: 2, comment: '' },
      abertura_chegada_espiritual: { type: 'rating', rating: 4, comment: 'Em paz' },
      abertura_chegada_comentario: { type: 'text', value: 'Dia tranquilo' },
      encerramento_aberto_amanha: { type: 'tasks', value: [{ title: 'Fechar PR', done: false }] },
    }
    const rendered = renderRitualFile(answers)
    const parsed = parseRitualFile(rendered)
    expect(parsed).toEqual(answers)
  })

  it('a freshly unfilled template parses back to all-empty answers', () => {
    const fresh = renderRitualFile(emptyRitualAnswers())
    const parsed = parseRitualFile(fresh)
    expect(parsed).toEqual(emptyRitualAnswers())
  })

  it('every declared field id round-trips independently with a distinct value', () => {
    const answers = emptyRitualAnswers()
    for (const id of RITUAL_FIELD_IDS) {
      const field = answers[id]
      if (field.type === 'text') answers[id] = { type: 'text', value: `valor-${id}` }
      else if (field.type === 'tasks') answers[id] = { type: 'tasks', value: [{ title: `tarefa-${id}`, done: false }] }
      else answers[id] = { type: 'rating', rating: 3, comment: `nota-${id}` }
    }
    const parsed = parseRitualFile(renderRitualFile(answers))
    expect(parsed).toEqual(answers)
  })

  it('tolerates the real file the user pasted (literal placeholders throughout) and returns all-empty', () => {
    const raw = `# Abertura
----
#### Ore e agradeça pelo dia iniciado
----
#### O que ficou aberto de ontem? Revise o Jira, anotações ou mensagens; não para resolver - só para ter consciência.
= resposta tipo texto =
#### Qual é o foco do dia? Antecipe sem ansiar
**Manhã**
= resposta tipo tarefa =
**Tarde**
= resposta tipo tarefa =

#### Próximas atividades a realizar:
= resposta tipo tarefa ou N/A =
#### Tem algo fora do padrão hoje? Existe algo na agenda para hoje?
= resposta tipo texto =
#### Como você está chegando?
- **Pessoal:** = PONTOS DE 1 ATÉ 5 = -= resposta tipo texto =
- **Traballho:** = PONTOS DE 1 ATÉ 5 = -= resposta tipo texto =
- **Espiritual:** = PONTOS DE 1 ATÉ 5 = -= resposta tipo texto =
- **Comentário:** = resposta tipo texto =


---

#### + Ao sentir um impulso, respire por dez segundos — este não é o momento para distrações. +

---


# Encerramento

#### O que foi entregue hoje?  O que foi feito? O que não foi? O que chegou de surpresa e consumiu tempo? _Revise o Toggl e o Jira. Não avalie — só observe._
= resposta tipo texto =


#### O que me impediu hoje foi meu / ambiente / dependência / agenda / sem impedimentos?
= resposta tipo texto =


#### Os objetivos do dia foram atingidos?
= resposta tipo texto =


#### O que ficou em aberto e precisa ir para amanhã? Alguma demanda ou contexto que vai influencia amanhã? Registre no Jira ou em uma nota. Isso esvazia a cabeça - você não precisa guardar o que está escrito.
= resposta tipo TAREFAS =


#### Uma coisa que não funcionou hoje?
= resposta tipo texto =


#### Uma coisa que funcionou bem hoje?
= resposta tipo texto =


#### Como você encerra o dia?
- **Pessoal:** = PONTOS DE 1 ATÉ 5 = -= resposta tipo texto =
- **Traballho:** = PONTOS DE 1 ATÉ 5 = -= resposta tipo texto =
- **Espiritual:** = PONTOS DE 1 ATÉ 5 = -= resposta tipo texto =
- **Comentário:** = resposta tipo texto =

----
#### Ore e agradeça pelo trabalho concluído
----
`
    expect(parseRitualFile(raw)).toEqual(emptyRitualAnswers())
  })
})
