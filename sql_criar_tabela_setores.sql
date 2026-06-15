-- Execute isto no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/_/sql/new)

create table if not exists public.setores (
  id         bigint generated always as identity primary key,
  nome       text not null unique,
  criado_em  bigint
);

-- Habilita Row Level Security (mesmo padrão das outras tabelas do app)
alter table public.setores enable row level security;

-- Permite que o app (chave anônima) leia, insira, atualize e remova setores
create policy "permitir leitura de setores"
  on public.setores for select
  using (true);

create policy "permitir insercao de setores"
  on public.setores for insert
  with check (true);

create policy "permitir exclusao de setores"
  on public.setores for delete
  using (true);

-- Habilita realtime (atualização automática da lista entre usuários)
alter publication supabase_realtime add table public.setores;
