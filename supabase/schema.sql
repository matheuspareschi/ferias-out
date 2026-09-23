-- Cole isto no SQL Editor do seu projeto Supabase (Database > SQL Editor > New query)
-- e clique em "Run". Cria uma única tabela com uma linha guardando todo o estado
-- do planner como JSON — suficiente para um app pessoal de um usuário só.

create table if not exists planner_state (
  id text primary key default 'default',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table planner_state enable row level security;

-- Sem autenticação de usuário aqui (app pessoal, sem login), então liberamos
-- leitura/escrita pra quem tiver a anon key pública do projeto. Essa key já
-- fica visível no código do app (é assim que Supabase funciona no client),
-- então isso não abre uma porta a mais — só não use essa tabela para dados
-- sensíveis de terceiros.
create policy "allow anon read" on planner_state
  for select using (true);

create policy "allow anon write" on planner_state
  for insert with check (true);

create policy "allow anon update" on planner_state
  for update using (true) with check (true);

-- Habilita o realtime (sincronização instantânea entre abas/aparelhos abertos)
alter publication supabase_realtime add table planner_state;
