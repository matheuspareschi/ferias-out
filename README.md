# Roteiro de férias — 24/09 a 12/10/2026

Planner pessoal de férias: backlog editável de tarefas flutuantes + grade de
horário por dia, navegável em janela deslizante de 3 dias.

## Stack

React + TypeScript + Vite + Tailwind CSS v4 + dnd-kit. Persistência via
`localStorage` (uso pessoal, sem sync entre dispositivos).

## Rodando localmente

```sh
npm install
npm run dev
```

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
