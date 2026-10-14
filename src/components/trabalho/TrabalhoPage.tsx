import { Plus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useRitualFile } from '@/hooks/useRitualFile'
import type { RitualAnswers, RitualRatingValue, RitualTask, RitualTextValue } from '@/lib/ritualTemplate'
import { cn } from '@/lib/utils'

const inputClass =
  'rounded-sm border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-accent'
const sectionClass = 'flex flex-col gap-2 rounded-sm border border-line bg-paper-raised/40 p-3'

function TaskListField({ value, onChange }: { value: RitualTask[]; onChange: (v: RitualTask[]) => void }) {
  const [draft, setDraft] = useState('')

  function add(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    onChange([...value, { title: draft.trim(), done: false }])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      {value.map((t, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={t.done}
            onChange={() => onChange(value.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it)))}
            className="size-3.5 accent-accent"
          />
          <span className={cn('flex-1', t.done && 'text-ink-faint line-through')}>{t.title}</span>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="text-ink-faint hover:text-attention"
            aria-label={`Remover ${t.title}`}
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      <form onSubmit={add} className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="nova tarefa…"
          className={cn(inputClass, 'flex-1 text-sm')}
        />
        <button type="submit" className="flex shrink-0 items-center justify-center rounded-sm border border-line px-2 text-ink-dim hover:border-line-strong" aria-label="Adicionar tarefa">
          <Plus className="size-3.5" />
        </button>
      </form>
    </div>
  )
}

function TextField({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={cn(inputClass, 'w-full resize-y font-serif text-sm italic text-ink-dim')}
    />
  )
}

/** 0 a 5 em passos de meio ponto — mesma faixa que a régua pedida (0, 0.5, 1, 1.5 … 5). */
function roundToHalf(n: number): number {
  return Math.min(5, Math.max(0, Math.round(n * 2) / 2))
}

function RatingRow({ label, value, onChange }: { label: string; value: RitualRatingValue; onChange: (v: RitualRatingValue) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-semibold text-ink-dim">{label}</span>
      <input
        type="number"
        min={0}
        max={5}
        step={0.5}
        value={value.rating ?? ''}
        onChange={(e) => {
          const raw = e.target.value
          onChange({ ...value, rating: raw === '' ? null : roundToHalf(Number(raw)) })
        }}
        placeholder="0–5"
        className={cn(inputClass, 'w-16 text-center font-mono text-sm')}
      />
      <input
        value={value.comment}
        onChange={(e) => onChange({ ...value, comment: e.target.value })}
        placeholder="comentário…"
        className={cn(inputClass, 'min-w-32 flex-1 text-sm')}
      />
    </div>
  )
}

function Question({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-3 first:border-0 first:pt-0">
      <p className="text-sm font-semibold text-ink">{children}</p>
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  )
}

export function TrabalhoPage() {
  const ritual = useRitualFile()
  const [draft, setDraft] = useState<RitualAnswers | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (ritual.answers) setDraft(ritual.answers)
  }, [ritual.answers])

  function set<T extends RitualAnswers[string]>(id: string, value: T) {
    setDraft((d) => (d ? { ...d, [id]: value } : d))
  }

  function textOf(id: string): RitualTextValue {
    const v = draft?.[id]
    return v && v.type === 'text' ? v : { type: 'text', value: '' }
  }

  function tasksOf(id: string): RitualTask[] {
    const v = draft?.[id]
    return v && v.type === 'tasks' ? v.value : []
  }

  function ratingOf(id: string): RitualRatingValue {
    const v = draft?.[id]
    return v && v.type === 'rating' ? v : { type: 'rating', rating: null, comment: '' }
  }

  async function handleSave() {
    if (!draft) return
    const ok = await ritual.save(draft)
    if (ok) setSavedAt(new Date())
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4 pb-24">
      <h1 className="font-serif text-lg font-semibold">Trabalho — ritual</h1>

      {ritual.status === 'checking' && <p className="font-mono text-xs text-ink-faint">verificando acesso ao arquivo…</p>}

      {ritual.status === 'unsupported' && (
        <div className={sectionClass}>
          <p className="text-sm text-ink-dim">
            Esse recurso precisa do Chrome ou do Edge (é o navegador que sabe ler/escrever um arquivo direto do seu
            computador). Abra essa página num desses pra usar o ritual.
          </p>
        </div>
      )}

      {ritual.status === 'no-file' && (
        <div className={sectionClass}>
          <p className="text-sm text-ink-dim">
            Selecione o arquivo <code className="font-mono text-xs">_rituais.md</code> uma vez — o navegador lembra
            depois, sem precisar escolher de novo.
          </p>
          <button
            type="button"
            onClick={() => void ritual.pickFile()}
            className="self-start rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-accent"
          >
            Selecionar arquivo de rituais…
          </button>
        </div>
      )}

      {ritual.status === 'needs-permission' && (
        <div className={sectionClass}>
          <p className="text-sm text-ink-dim">
            Achei <code className="font-mono text-xs">{ritual.fileName}</code>, mas o Chrome pede pra confirmar o
            acesso de novo nesta sessão.
          </p>
          <button
            type="button"
            onClick={() => void ritual.reconnect()}
            className="self-start rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-accent"
          >
            Reconectar ao arquivo
          </button>
        </div>
      )}

      {ritual.status === 'error' && (
        <div className={sectionClass}>
          <p className="text-sm text-attention">{ritual.error ?? 'Algo deu errado.'}</p>
          <button
            type="button"
            onClick={() => void ritual.pickFile()}
            className="self-start rounded-sm border border-line px-3 py-1.5 text-xs text-ink-dim hover:border-line-strong hover:text-ink"
          >
            Selecionar arquivo de novo
          </button>
        </div>
      )}

      {ritual.status === 'ready' && draft && (
        <>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-ink-faint">{ritual.fileName}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void ritual.reload()}
                className="font-mono text-[10px] text-ink-faint hover:text-ink"
                title="Recarrega o conteúdo direto do arquivo, descartando alterações não salvas"
              >
                recarregar do arquivo
              </button>
              <button type="button" onClick={() => void ritual.forget()} className="font-mono text-[10px] text-ink-faint hover:text-attention">
                trocar arquivo
              </button>
            </div>
          </div>

          <section className={sectionClass}>
            <h2 className="font-serif text-base font-semibold">Abertura</h2>

            <Question>O que ficou aberto de ontem?</Question>
            <TextField value={textOf('abertura_ontem').value} onChange={(v) => set('abertura_ontem', { type: 'text', value: v })} />

            <Question hint="Manhã">Qual é o foco do dia?</Question>
            <TaskListField value={tasksOf('abertura_foco_manha')} onChange={(v) => set('abertura_foco_manha', { type: 'tasks', value: v })} />
            <p className="text-xs font-semibold text-ink-dim">Tarde</p>
            <TaskListField value={tasksOf('abertura_foco_tarde')} onChange={(v) => set('abertura_foco_tarde', { type: 'tasks', value: v })} />

            <Question>Próximas atividades a realizar</Question>
            <TaskListField value={tasksOf('abertura_proximas')} onChange={(v) => set('abertura_proximas', { type: 'tasks', value: v })} />

            <Question>Tem algo fora do padrão hoje?</Question>
            <TextField value={textOf('abertura_fora_padrao').value} onChange={(v) => set('abertura_fora_padrao', { type: 'text', value: v })} />

            <Question>Como você está chegando?</Question>
            <RatingRow label="Pessoal" value={ratingOf('abertura_chegada_pessoal')} onChange={(v) => set('abertura_chegada_pessoal', v)} />
            <RatingRow label="Trabalho" value={ratingOf('abertura_chegada_trabalho')} onChange={(v) => set('abertura_chegada_trabalho', v)} />
            <RatingRow label="Espiritual" value={ratingOf('abertura_chegada_espiritual')} onChange={(v) => set('abertura_chegada_espiritual', v)} />
            <TextField
              value={textOf('abertura_chegada_comentario').value}
              onChange={(v) => set('abertura_chegada_comentario', { type: 'text', value: v })}
              rows={2}
            />
          </section>

          <section className={sectionClass}>
            <h2 className="font-serif text-base font-semibold">Encerramento</h2>

            <Question>O que foi entregue hoje?</Question>
            <TextField value={textOf('encerramento_entregue').value} onChange={(v) => set('encerramento_entregue', { type: 'text', value: v })} />

            <Question>O que me impediu hoje?</Question>
            <TextField value={textOf('encerramento_impedimento').value} onChange={(v) => set('encerramento_impedimento', { type: 'text', value: v })} />

            <Question>Os objetivos do dia foram atingidos?</Question>
            <TextField value={textOf('encerramento_objetivos').value} onChange={(v) => set('encerramento_objetivos', { type: 'text', value: v })} />

            <Question>O que ficou em aberto e precisa ir para amanhã?</Question>
            <TaskListField value={tasksOf('encerramento_aberto_amanha')} onChange={(v) => set('encerramento_aberto_amanha', { type: 'tasks', value: v })} />

            <Question>Uma coisa que não funcionou hoje?</Question>
            <TextField value={textOf('encerramento_nao_funcionou').value} onChange={(v) => set('encerramento_nao_funcionou', { type: 'text', value: v })} />

            <Question>Uma coisa que funcionou bem hoje?</Question>
            <TextField value={textOf('encerramento_funcionou').value} onChange={(v) => set('encerramento_funcionou', { type: 'text', value: v })} />

            <Question>Como você encerra o dia?</Question>
            <RatingRow label="Pessoal" value={ratingOf('encerramento_fechamento_pessoal')} onChange={(v) => set('encerramento_fechamento_pessoal', v)} />
            <RatingRow label="Trabalho" value={ratingOf('encerramento_fechamento_trabalho')} onChange={(v) => set('encerramento_fechamento_trabalho', v)} />
            <RatingRow label="Espiritual" value={ratingOf('encerramento_fechamento_espiritual')} onChange={(v) => set('encerramento_fechamento_espiritual', v)} />
            <TextField
              value={textOf('encerramento_fechamento_comentario').value}
              onChange={(v) => set('encerramento_fechamento_comentario', { type: 'text', value: v })}
              rows={2}
            />
          </section>
        </>
      )}
      </div>

      {ritual.status === 'ready' && draft && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper px-3 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] sm:px-4">
          <div className="mx-auto flex w-full max-w-[800px] items-center justify-between gap-3">
            <span className="font-mono text-[10px] text-ink-faint">
              {ritual.saving ? 'salvando…' : savedAt ? `salvo às ${savedAt.toLocaleTimeString('pt-BR')}` : ''}
            </span>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={ritual.saving}
              className="rounded-sm bg-ink px-4 py-2 text-xs text-paper hover:bg-accent disabled:opacity-50"
            >
              Salvar no arquivo
            </button>
          </div>
        </div>
      )}
    </>
  )
}
