# Evolução do app → sistema estilo bullet journal (v2)

Especificação para implementação com o Claude Code. Implementar uma fase por vez e confirmar o resultado com o usuário antes de seguir.

> Substitui a v1 deste arquivo. A v1 ainda existe no histórico do git
> (`git log -- BULLET_JOURNAL_SPEC.md`) caso seja preciso consultar.

## 0. Contexto e regras gerais

- App pessoal, um único usuário (Thiago). Hospedado no GitHub Pages, com banco de dados gratuito já em uso. Vai substituir o bullet journal em papel.
- Uso típico: abre o app uma vez, de manhã, organiza o dia e, ao longo do dia, só tica as atividades. Nada deve exigir interação constante.
- O app não precisa de nome na interface (sem "Roteiro de férias" no topo).
- No futuro vai reunir também o trabalho, mas isso foi adiado para depois das férias (seção 9). Por ora o app trata apenas de vida pessoal, faculdade e projetos.

Antes de escrever código:

1. Leia o código atual e descreva em poucas linhas o modelo de dados existente (itens, dias, backlog, hábitos, banco).
2. Proponha as mudanças de esquema e migre os dados existentes sem perdê-los (migração versionada e reversível). Antes da primeira migração, exporte um backup em JSON.
3. Adapte esta especificação ao que já existe, sem reescrever o que funciona. Se algo for ambíguo, pergunte ao usuário em vez de adivinhar.

Transversal: botão de exportar/importar tudo em JSON; datas sempre no fuso `America/Sao_Paulo`; funcionar bem no celular; commits pequenos; testes para a lógica de datas, migrações e geração de revisões.

## 1. Navegação e identidade visual

### 1.1 Barra superior

Itens, nesta ordem: Semana · Mês · Ano · Hábitos · Backlog · Projetos · Retrospectiva. Mais: setas de navegação do período atual, alternância claro/escuro e estado da conexão com o Google. No celular, a barra vira um menu.

### 1.2 Visual

- Abandonar a paleta amarelada/quente atual. Direção: claro e frio, com opção de tema escuro.
- Tokens sugeridos (tema claro): fundo `#F6F8FA`, cartões `#FFFFFF` com borda `#D8DEE4`, texto `#1F2328` (secundário `#59636E`), acento principal `#2F6FEB`, concluído/hábito `#2DA44E`, atenção `#CF7B00`.
- Os itens não têm cor própria e o contexto também não pinta as linhas (ver 2.8). Cores e tons existem apenas como variáveis CSS (tokens) do tema claro/escuro, nunca como cores soltas no código.

## 2. Fase 1 — Núcleo: tipos, contextos, agendamento, nova Semana

### 2.1 Tipo de item

Apenas tarefa e evento. Símbolos estilo bullet journal: tarefa = caixa, evento = losango/círculo, feita = ✕, migrada = `>`, agendada = `<`. Os tipos antigos (AULA, PREPARO, TAREFA) viram contexto.

### 2.2 Contexto

- Lista editável. Valores iniciais: Pessoal, Faculdade, GAEB, Conexão, Acampamento, Estágio. Não criar o contexto "Trabalho" agora (seção 9).
- Migração sugerida: AULA → Faculdade; TAREFA → Pessoal; PREPARO → GAEB se o título citar GAEB, senão Pessoal. Mostre o mapeamento ao usuário antes de aplicar.
- O tamanho P/M/G existe somente para aulas do contexto Faculdade (ligado à unidade, seção 3). Em qualquer outro item, não há campo nem exibição de tamanho. Na migração, tamanhos de itens fora da Faculdade deixam de ser exibidos (os dados antigos ficam apenas no backup).

### 2.3 Visão Semana

- Mantém o layout atual de dias lado a lado, com ontem, hoje e amanhã como padrão (3 colunas). Setas deslocam a janela.
- Cada dia: ícones de hábito no topo e períodos (manhã, tarde, noite, sem período), como hoje. A estrutura de colunas e períodos é preservada. O que muda é a aparência dos itens (ver 2.8): deixam de ser cards/caixas coloridas e passam a ser linhas escritas.
- Backlog compacto fixo na lateral direita da Semana: lista curta com filtro rápido de contexto e arrastar para o dia. O backlog completo é uma página própria (Fase 5).
- Sem painel de "pendentes de ontem". Em vez disso, itens não ticados de dias passados recebem destaque visual (por exemplo, borda de atenção) na coluna do dia anterior e na lista do Mês.
- Como mover um pendente: arrastar para outro dia ou o backlog, ou usar as ações do modal de edição (2.7). Ao migrar, o item guarda o dia de origem (`migrated_from`) e mostra `>`.

### 2.4 Tarefas agendadas

Item com data futura aparece no dia escolhido (e no Mês e no Ano) sem ocupar o backlog.

### 2.5 Nota do dia

Campo de texto livre opcional por dia, recolhido por padrão (ícone discreto no card do dia). Sem prompts e sem obrigatoriedade.

### 2.6 Tarefa principal e subtarefas

Uma tarefa pode ser principal (pai) e ter subtarefas, para dividir um foco grande em passos menores. Exemplo: o pai "Preparar o GAEB" com as subtarefas "Escolher música", "Preparar estudo", "Preparar material".

- Um nível apenas: subtarefa não tem subtarefa.
- Cada subtarefa é um item de verdade: pode ter sua própria data e período, ir para o backlog e ser movida de forma independente (ações de 2.7). O pai pode ter data própria (por exemplo, o dia do encontro) ou ficar sem data.
- O pai mostra o progresso (ex.: `2/4`). Quando todas as subtarefas forem concluídas, o pai é concluído automaticamente (e pode ser desmarcado). Ticar o pai manualmente não tica as subtarefas pendentes sem confirmação.
- Quando uma subtarefa aparece em um dia, mostra o nome do pai como um pequeno prefixo ("GAEB › Escolher música"), para não perder o contexto fora da lista do pai.
- No backlog, o pai aparece com as subtarefas recolhíveis abaixo; subtarefas podem ser arrastadas individualmente para um dia.
- O campo "Checklist (opcional) / adicionar subitem" do modal atual vira adicionar subtarefa. Checklists já existentes são migrados para subtarefas.

### 2.7 Modal de edição: ações de mover e excluir

Hoje o modal "Editar item" só permite excluir (e, quando o item está agendado, "voltar ao backlog"). Ele deve oferecer, em uma área de ações bem visível:

- Amanhã: move o item para o dia seguinte ao dia atual do item, mantendo o período.
- Outro dia: abre um seletor de data e move o item para a data escolhida.
- Voltar ao backlog: remove a data e devolve o item ao backlog (mantendo o contexto e as subtarefas).
- Excluir: com confirmação.

Regras:

- As três primeiras ações são migrações: guardam `migrated_from` (dia de origem) e o item exibe o símbolo `>` no dia em que ficou. Excluir não deixa rastro.
- Ao mover para outro dia, o item mantém o período (manhã/tarde/noite); se for para outro dia, perguntar o período só se o usuário quiser (padrão: o mesmo).
- Itens de dias passados não ticados (destacados) usam exatamente estas ações; não existe outro fluxo.
- Em eventos sincronizados com o Google, mover o dia também atualiza o evento no Google (fase 4).
- As mesmas ações devem estar disponíveis rapidamente na própria linha do item (menu ao passar o mouse; toque longo ou menu "⋯" no celular), sem precisar abrir o modal.

### 2.8 Aparência dos itens: escritos na tela, não em caixas

Os itens não são cards. Devem parecer escritos à mão no caderno: uma linha de texto, sem caixa, sem fundo preenchido e sem sombra.

- Formato de cada item: `símbolo + texto` em uma linha. Exemplo: `□ Escolher música`. Evento usa o símbolo de evento; feito usa ✕; migrado usa `>`.
- Concluído: texto com leve risco e cor atenuada, símbolo ✕. Não some da tela.
- Identificação clara de três tipos, só por forma (símbolo, peso e indentação), sem cor:
  - Evento: símbolo próprio (círculo/losango), com o horário quando houver.
  - Tarefa principal (pai): símbolo de tarefa, texto em negrito e contador de progresso das subtarefas (`2/4`), com seta para recolher/expandir.
  - Subtarefa: indentada sob o pai, símbolo menor/mais leve (por exemplo, traço), texto em peso normal.
  - Tarefa simples (sem subtarefas): símbolo de tarefa, texto em peso normal.
- Tamanho P/M/G só aparece em aulas do contexto Faculdade, como pequeno sufixo discreto. Nos demais itens, não há tamanho.
- Itens agrupados sob o título do período (MANHÃ, TARDE, NOITE) em fonte pequena, sem molduras. Pode haver uma linha divisória fina entre períodos, nada além disso.
- Sem cor por item: remover o campo "Cor" do modal de edição e qualquer preenchimento, marcador ou tonalidade por item ou contexto. A distinção é só pela forma descrita acima.
- Pendente de dia passado: destacar com cor de atenção no símbolo ou no texto, sem caixa.
- Ao passar o mouse sobre a linha, aparece um fundo muito sutil e o menu de ações (2.7). Clicar no texto abre o modal de edição; clicar no símbolo tica/destica.
- Mesma aparência de linha vale no backlog (compacto e página própria), no Mês, na página de projetos e em qualquer lista de itens.
- Fonte: priorizar legibilidade e um ar de caderno (ex.: uma fonte de texto limpa, com os símbolos em destaque); definir como variável de tema.

## 3. Fase 2 — Faculdade (dentro de Projetos)

### 3.1 Modelo

- Disciplina: sigla e nome. Valores atuais: HB (Hebraico Bíblico), HC (História da Igreja Moderna e Contemporânea), AT (Livros Poéticos, Sapienciais e Proféticos), NT (Cartas e Apocalipse), EC (Educação Cristã).
- Unidade (UN3, UN4, UN5…): disciplina, número, tamanho (p/m/g), número de páginas, estado. Cada unidade tem apenas aula e revisão.
- Aula ao vivo: data/hora (é um evento) e um estado "vou assistir / não vou / assisti".
- Entrega: título, disciplina, data, feita ou não. Aparece como marcador ★ no dia, no Mês e no Ano.

### 3.2 Regra de revisão (automática)

- Ao ticar a aula de uma unidade, o app cria 3 tarefas de revisão (contexto Faculdade, vinculadas à unidade): +1, +7 e +30 dias depois da data em que a aula foi ticada.
- Título: `[HC3] Revisão 1/3`. Entram como tarefas agendadas no dia correspondente.
- Idempotente: não duplicar se ticar de novo; se a aula for desticada, remover as revisões ainda não feitas.
- Itens existentes no formato `[UN 4] Novo Testamento` devem ser vinculados à unidade correta na migração (por título), com confirmação do usuário.

### 3.3 Página da Faculdade

- Grade disciplina × unidade: aula (feita ou não), 3 revisões (feitas ou não), tamanho e páginas. Aprovada pelo usuário.
- Não incluir lista de "próximas revisões" (o agendamento automático já resolve).
- Seção de aulas ao vivo (com o estado de assistir) e seção de entregas (com datas).
- Espaço de anotações: texto livre geral da faculdade e, se simples, por disciplina.
- Aulas e revisões alimentam o backlog (mês de referência) e os dias como qualquer outra tarefa.

## 4. Fase 3 — Hábitos (página própria)

- Hábitos: devocional, alongamento, exercício, leitura, sem internet/notícias/redes. Todos funcionam igual: o dia só conta se o hábito for ticado. Sem crédito automático, sem penalização visual por dia não marcado.
- Continuam aparecendo como ícones no topo de cada dia da Semana (reaproveitar o que existe) e como faixa resumida na lista do Mês.
- Página Hábitos com várias formas de visualização, alternáveis:
  - Mês: uma linha por hábito × dias do mês.
  - Ano: grade estilo GitHub (semanas × dias), por hábito e agregada (intensidade = quantos hábitos cumpridos no dia).
  - Por hábito: foco em um hábito, com mês a mês.
  - Resumo: contagens simples por semana e por mês.
- Sem streaks e sem análises avançadas.
- A visão Ano da navegação não mostra hábitos.

## 5. Fase 4 — Mês, Ano e Google Agenda

### 5.1 Mês (lista)

Mantido como está: uma linha por dia (como a página "Calendário de Setembro" do caderno) com eventos, tarefas agendadas e marcadores, hoje destacado, navegação entre meses, faixa de hábitos do mês. No fim do mês, link para a Retrospectiva.

### 5.2 Ano (calendário)

- Calendário de 12 meses. Serve para lançar compromissos futuros: clicar em uma data abre um formulário rápido (título, tipo tarefa/evento, data inicial e final, horário opcional). Exemplos: consulta em 10/10, casamento, viagem (intervalo de dias).
- Datas com algo agendado são marcadas (ponto para evento, barra para intervalo, ★ para entrega). Clicar no nome do mês abre o Mês.
- O que for lançado ali vira item agendado e, se for evento, vai para o Google Agenda.

### 5.3 Google Agenda

- Site estático: usar Google Identity Services (token model) direto no navegador, sem backend. Escopo mínimo necessário para ler e criar eventos.
- Projeto no Google Cloud em modo de teste, com o usuário como único testador. Sem client secret no repositório. O client ID é configurável.
- O token dura cerca de 1h e não há refresh em segundo plano: ao abrir o app, um botão "Conectar ao Google" (um clique) reautentica. Token apenas em memória ou `sessionStorage`.
- Ler: eventos do calendário principal (configurável) aparecem no dia certo, no Mês e no Ano, marcados como "Google", somente leitura.
- Criar/editar/apagar: eventos do app são enviados ao Google; o app guarda só o `googleEventId`. Mudanças feitas no Google são captadas na próxima abertura (comparar `updated`/`etag`). Tarefas não vão para o Google.
- Suportar dia inteiro, com horário e intervalo de dias.
- Falhas de rede ou autenticação nunca impedem o uso: mostrar "Google desconectado" e seguir.

## 6. Fase 5 — Backlog (página própria, mais complexo)

- Página dedicada com conjunto de filtros combináveis: por semana, por mês (mês de referência), por projeto/contexto. O filtro por trabalho fica para depois (seção 9), mas a estrutura de filtros deve permitir adicioná-lo sem refatoração.
- Agrupamento por contexto, tarefa principal com subtarefas recolhíveis (2.6), arrastar para um dia ou agendar uma data. Sem campo de tamanho, exceto aulas da Faculdade.
- O mês de referência é opcional; o backlog mostra o mês atual por padrão.
- O backlog compacto da Semana (2.3) usa a mesma fonte de dados.

## 7. Fase 6 — Projetos (GAEB, Conexão, Acampamento, Estágio)

Página Projetos com barra lateral (Faculdade, GAEB, Conexão, Acampamento, Estágio) e a área de conteúdo à direita.

**GAEB**

- Canto superior esquerdo: painel de Ideias (lista simples de ideias soltas, recolhível).
- Calendário pequeno (um mês) com os dias de encontro marcados; clicar em um dia seleciona o encontro.
- Abaixo do calendário: a data selecionada como título grande e, embaixo, comentários daquele encontro em texto livre. Metadados pequenos e opcionais sob o título: tema, número de pessoas, comida.
- O GAEB é majoritariamente anotação e não alimenta o backlog.

**Conexão e Acampamento**

Começam como contextos de backlog (suas tarefas vão ao backlog) com uma página simples de notas. O acampamento ainda não tem formato definido: não inventar.

**Estágio / extensão**

Página livre com texto e tabela simples opcional (por exemplo, horas por atividade). Não tentar reproduzir toda a liberdade do papel.

## 8. Fase 7 — Retrospectiva mensal (página própria)

- Uma página dedicada, uma retrospectiva por mês, navegável por mês.
- Três campos de texto: "De onde venho?", "O que está vivo agora?", "O que quero que apareça?".
- Acima, um resumo automático do mês: hábitos cumpridos, tarefas feitas e migradas.

## 9. Trabalho e ritual de trabalho — ADIADOS (não implementar agora)

Tudo o que envolve dados de trabalho fica fora do escopo até o usuário voltar das férias: contexto Trabalho, filtro de trabalho no backlog, leitura de JSON local e o ritual de abertura e encerramento.

O que fazer agora, e só isso:

- Não criar o contexto Trabalho, não implementar leitura de arquivo local e não criar o módulo do ritual.
- Manter a arquitetura aberta: contextos e filtros do backlog configuráveis (para adicionar "Trabalho" depois) e uma rota/aba reservada e vazia para o futuro módulo.

Restrição que deve valer quando isso for retomado (registrada aqui para não se perder): dados de trabalho não vão para o banco de dados nem para o repositório; ficam em arquivo JSON local, com desenho a ser definido com o usuário na ocasião.

## 10. Fora de escopo

- Captura rápida de comentários/ideias separada das tarefas.
- Streaks, estatísticas avançadas de hábitos, notificações.
- Sincronização contínua em segundo plano com o Google.
- Multiusuário.

## 11. Pontos a confirmar com o usuário durante a implementação

- Significado exato da legenda da faculdade (aula assistida, revisão, ao vivo, entrega).
- Mapeamento de contextos na migração (2.2).
- Data-base das revisões: dia em que a aula foi ticada (assumido) ou data da aula ao vivo.
- Qual banco de dados está em uso e como o acesso é feito.
