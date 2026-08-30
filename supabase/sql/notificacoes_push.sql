-- Execute este SQL no Supabase: Dashboard → SQL Editor → New query → Run
-- Cria a tabela que guarda a "inscrição" de push de cada aparelho.

create table if not exists push_inscricoes (
  id            uuid primary key default gen_random_uuid(),
  endpoint      text unique not null,   -- identifica o aparelho/navegador
  p256dh        text not null,          -- chave pública da inscrição (gerada pelo navegador)
  auth          text not null,          -- segredo da inscrição (gerado pelo navegador)
  usuario       text,                   -- nome/login de quem ativou (apenas informativo)
  criado_em     timestamptz not null default now(),
  atualizado_em bigint
);

-- Habilita RLS (Row Level Security)
alter table push_inscricoes enable row level security;

-- O app usa a chave "anon" no navegador (mesmo padrão das outras tabelas
-- deste projeto, como relatorios_abertos), então liberamos leitura/escrita
-- para o papel anon. Ajuste depois se quiser restringir por usuário.
create policy "anon pode inserir/atualizar sua inscricao"
  on push_inscricoes for insert
  to anon
  with check (true);

create policy "anon pode atualizar inscricoes (upsert)"
  on push_inscricoes for update
  to anon
  using (true);

create policy "anon pode remover sua inscricao"
  on push_inscricoes for delete
  to anon
  using (true);

create policy "anon pode listar (necessário para o upsert funcionar)"
  on push_inscricoes for select
  to anon
  using (true);

-- A Edge Function usa a service_role key (não passa pelo RLS), então ela
-- consegue ler todas as inscrições para enviar as notificações.

-- ── Gerenciamento por usuário (rodar depois da tabela acima) ────────────────
-- Liga cada inscrição a um usuário (para o Admin poder ativar/desativar por
-- pessoa). Usamos "text" em vez de referenciar o tipo da coluna usuarios.id
-- diretamente, pra funcionar independente do tipo (uuid, bigint, etc.).
alter table push_inscricoes
  add column if not exists usuario_id text;

-- Permite ao admin desativar notificações de uma pessoa específica sem
-- precisar que ela desinstale o app. Todo mundo começa habilitado.
alter table usuarios
  add column if not exists notificacoes_ativas boolean not null default true;
