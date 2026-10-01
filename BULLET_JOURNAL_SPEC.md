# Roteiro de férias → sistema estilo bullet journal

Especificação de evolução do app. Implementar uma fase por vez.

## 0. Contexto e regras gerais

- App pessoal, um único usuário (Thiago). Hospedado no GitHub Pages, com banco de dados gratuito já em uso.
- Vai substituir o bullet journal em papel.
- Uso típico: abre o app uma vez, de manhã, de forma intencional, organiza o dia e, ao longo do dia, só tica as atividades. Nada deve exigir interação constante.
- O que já existe e deve ser preservado: grade de dias (quarta, quinta, sexta…), períodos (manhã, tarde, noite, sem período), tipo de dia (ESTUDO, LAZER), ícones de hábitos no topo de cada dia, cards coloridos com tamanho P/M/G, backlog lateral com arrastar-e-soltar, tema claro/escuro.

Antes de escrever código:

1. Leia o código atual e descreva em poucas linhas o modelo de dados existente (itens, dias, backlog, hábitos, banco).
2. Proponha as mudanças de esquema e migre os dados existentes sem perdê-los (migração versionada e reversível). Antes da primeira migração, exporte um backup em JSON.
3. Adapte esta especificação ao que já existe, em vez de reescrever o que funciona. Se algo for ambíguo, pergunte ao usuário em vez de adivinhar.

Transversal: botão de exportar/importar tudo em JSON; datas sempre no fuso `America/Sao_Paulo` (cuidado com aritmética de datas e horário de verão); funcionar bem no celular; commits pequenos; testes para a lógica de datas, migrações e geração de revisões.

## 1. Fase 1 — Núcleo: tipos, contextos, agendamento, pendentes, nota do dia

### 1.1 Tipo de item

- Apenas dois tipos: tarefa e evento. Símbolos no estilo bullet journal: tarefa = ponto/caixa, evento = círculo, feita = ✕, migrada = `>`, agendada = `<`.
- Os tipos antigos (AULA, PREPARO, TAREFA) deixam de ser tipo e passam a ser contexto.

### 1.2 Contexto

- Lista editável de contextos. Valores iniciais: Pessoal, Faculdade, GAEB, Conexão, Acampamento, Estágio.
- Migração sugerida: AULA → Faculdade; TAREFA → Pessoal; PREPARO → GAEB se o título citar GAEB, senão Pessoal. Mostre o mapeamento ao usuário antes de aplicar.
- O tamanho P/M/G continua existindo e é independente do contexto.

### 1.3 Backlog

- Item de backlog ganha mês de referência (YYYY-MM, opcional). O backlog mostra por padrão o mês atual e permite ver outros meses.
- Itens podem ser agrupados por contexto e ter subitens (checklist simples).

### 1.4 Tarefas agendadas

- Item com data futura aparece no dia escolhido (e na lista do mês), sem ocupar o backlog. Ao agendar, o item sai do backlog.

### 1.5 Revisão matinal de pendentes

- Ao abrir o app, se houver itens de dias passados não ticados e não migrados, mostrar um painel "Pendentes de ontem" (ou dos últimos dias).
- Cada pendente tem 4 ações: hoje, escolher outra data, voltar ao backlog, descartar.
- Não bloqueia o uso: pode ser fechado e reaberto por um contador/botão.
- Ao migrar, o item guarda o dia de origem (`migrated_from`) e exibe o símbolo `>`.
- Critério de aceite: nenhum item passado não ticado fica "esquecido" sem uma decisão registrada.

### 1.6 Nota do dia

- Um campo de texto livre opcional por dia, recolhido por padrão (ícone discreto no card do dia). Sem prompts e sem obrigatoriedade.
- Serve ao diário do usuário; não faz parte do fluxo de tarefas.

## 2. Fase 2 — Faculdade

### 2.1 Modelo

- Disciplina: sigla, nome. Valores atuais: HB (Hebraico Bíblico), HC (História da Igreja Moderna e Contemporânea), AT (Livros Poéticos, Sapienciais e Proféticos), NT (Cartas e Apocalipse), EC (Educação Cristã).
- Unidade (UN3, UN4, UN5…): disciplina, número, tamanho (p/m/g), número de páginas, estado.
- Cada unidade tem apenas aula e revisão.

### 2.2 Regra de revisão (automática)

- Ao ticar a aula de uma unidade, o app cria 3 tarefas de revisão (contexto Faculdade, vinculadas à unidade): +1 dia, +7 dias e +30 dias a partir da data em que a aula foi concluída.
- Título sugerido: `[HC3] Revisão 1/3`. As revisões entram como tarefas agendadas no dia correspondente.
- Operação idempotente: não duplicar se ticar de novo; se a aula for desticada, remover as revisões ainda não feitas.
- Revisão não feita cai na revisão matinal de pendentes (1.5).
- Itens já existentes com o formato `[UN 4] Novo Testamento` devem ser vinculados à unidade correta na migração (por título), com confirmação do usuário.

### 2.3 Visão da faculdade

- Grade disciplina × unidade mostrando: aula (feita ou não), as 3 revisões (feitas ou não), tamanho e páginas.
- Lista "revisões dos próximos 30 dias".
- Marcadores do caderno atual: aula assistida, revisão, ao vivo (evento) e entrega (prazo; marcador ★ na tarefa). Confirme com o usuário o significado exato da legenda antes de implementar.
- Aulas da faculdade alimentam o backlog (mês de referência) e os dias, como qualquer outra tarefa.

## 3. Fase 3 — Hábitos

- Hábitos: devocional, alongamento, exercício, leitura, sem internet/notícias/redes.
- Todos funcionam igual: o dia só conta se o hábito for ticado. Sem crédito automático e sem penalização visual por dia não marcado, nem sequência/streak.
- Reaproveite os ícones de hábito que já existem no topo de cada dia (inspecione o código para ver como estão modelados). O hábito de abstinência entra como mais um ícone.
- Visualização estilo GitHub: uma grade por hábito (semanas × dias), com as últimas semanas por padrão, mais uma grade agregada (intensidade = quantos hábitos foram cumpridos no dia).
- Tela simples e leve, sem análises nem gráficos extras.

## 4. Fase 4 — Mês em lista + Google Agenda

### 4.1 Mês em lista

- Uma linha por dia (como a página "Calendário de Setembro" do caderno): eventos, tarefas agendadas e marcadores. Hoje destacado, navegação entre meses.

### 4.2 Integração com o Google Agenda

- Site estático no GitHub Pages: usar Google Identity Services (token model) direto no navegador, sem backend. Escopo mínimo necessário para ler e criar eventos.
- O projeto no Google Cloud fica em modo de teste, com o usuário como único testador. Sem client secret no repositório. O client ID é configurável.
- O token dura cerca de 1h e não há refresh em segundo plano: ao abrir o app, um botão "Conectar ao Google" (um clique) reautentica. O token fica só em memória ou `sessionStorage`.
- Ler: eventos do calendário principal (configurável) aparecem no dia certo e na lista do mês, marcados como "Google", somente leitura.
- Criar/editar/apagar: itens do tipo evento criados no app são enviados ao Google. O app guarda apenas o `googleEventId`. Editar ou apagar no app reflete no Google. Mudanças feitas no Google são captadas na próxima abertura (comparar `updated`/`etag`).
- Suporte a evento de dia inteiro e com horário. Tarefas não vão para o Google.
- Falhas de rede ou de autenticação nunca impedem o uso do app: mostrar o estado "Google desconectado" e continuar.

## 5. Fase 5 — Projetos (GAEB, Conexão, Acampamento, Estágio/Extensão)

- Página de projeto genérica com: texto livre, tarefas (ligadas ao contexto, que alimenta backlog e dias) e, opcionalmente, uma tabela simples.
- GAEB: registro de encontros com data, tema, número de pessoas, comida e comentário depois do encontro, mais uma lista de ideias. O GAEB é majoritariamente anotação e não alimenta o backlog.
- Conexão e Acampamento: começam apenas como contextos de backlog, com uma página simples de notas. O acampamento ainda não tem formato definido: não inventar.
- Estágio / projeto de extensão: página livre com tabela opcional (por exemplo, horas por atividade). Não tentar reproduzir toda a liberdade do papel.

## 6. Fase 6 — Retrospectiva mensal

- Tela de fim de mês com 3 campos de texto: "De onde venho?", "O que está vivo agora?", "O que quero que apareça?".
- Acima dos campos, um resumo automático do mês: hábitos cumpridos, tarefas feitas, tarefas migradas.
- Uma retrospectiva por mês, guardada e consultável.

## 7. Fase 7 — Ritual de abertura e encerramento do trabalho (módulo separado)

Fora do escopo agora; só reservar o ponto de extensão (uma rota ou aba vazia).

Restrições para quando for implementado:

- Os dados são do trabalho: não vão para o banco de dados nem para o repositório. Leitura e escrita em arquivo JSON local, via File System Access API (usuário escolhe o arquivo; guardar o handle no IndexedDB; funciona só em navegador Chromium).
- Nunca sincronizar esse módulo com nada externo, nem registrar seu conteúdo em logs.
- O desenho detalhado será definido depois, com o usuário.

## 8. Fora de escopo

- Captura rápida de comentários/ideias separada das tarefas.
- Streaks, estatísticas avançadas de hábitos, notificações.
- Sincronização contínua em segundo plano com o Google.
- Multiusuário.

## 9. Pontos a confirmar com o usuário durante a implementação

- Significado exato da legenda da faculdade (aula assistida, revisão, ao vivo, entrega).
- Mapeamento de contextos na migração (1.2).
- Se a data-base das revisões é o dia em que a aula foi ticada (assumido) ou a data da aula ao vivo.
- Qual banco de dados está em uso e como o acesso é feito (para desenhar o esquema na fase 1).
