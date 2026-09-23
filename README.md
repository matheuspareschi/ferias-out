# Roteiro de férias — 24/09 a 12/10/2026

Planner pessoal de férias: backlog editável de tarefas flutuantes + grade de
horário por dia, navegável em janela deslizante de 3 dias.

## Stack

React + TypeScript + Vite + Tailwind CSS v4 + dnd-kit. Persistência via
`localStorage`, com sincronização opcional entre aparelhos via Supabase
(veja abaixo).

## Rodando localmente

```sh
npm install
npm run dev
```

## Sincronizar entre aparelhos (opcional)

Sem configuração nenhuma, o app funciona só com `localStorage` — cada
aparelho tem seus próprios dados. Para sincronizar entre desktop e celular:

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e um novo
   projeto (pode entrar com o GitHub).
2. No projeto, abra **SQL Editor → New query**, cole o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) e rode.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public
   key**.
4. Localmente: copie `.env.example` para `.env` e preencha as duas
   variáveis. No GitHub Pages: adicione as mesmas duas variáveis em
   **Settings → Secrets and variables → Actions** do repositório
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), pra elas entrarem no
   build automático.

Com isso, abrir o app em qualquer aparelho (mesmo link) mostra os mesmos
dados, e uma mudança feita em um aparelho aparece nos outros sozinha.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builda e publica no GitHub Pages a cada push
na branch de desenvolvimento. Só precisa habilitar uma vez: **Settings →
Pages → Source: GitHub Actions**. Depois disso o link fica em
`https://<usuário>.github.io/ferias-out/`.

## Modelo

- **AgendaItem** — compromissos "fixos" do roteiro (podem ou não ter
  horário definido; sem horário aparecem na mini-lista "sem horário" no
  topo da coluna do dia).
- **BacklogItem** — tarefas flutuantes (aula / preparo / tarefa), com
  tamanho P/M/G. Podem ser arrastadas para um dia/horário como sugestão
  visual (`allocation`); isso não remove o item do backlog nem trava sua
  conclusão — ele só some da lista quando marcado como feito.

Dias anteriores ao dia atual são somente leitura; hoje em diante é editável.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (`tsc -b && vite build`)
- `npm run lint` — oxlint
- `npm run preview` — preview do build
