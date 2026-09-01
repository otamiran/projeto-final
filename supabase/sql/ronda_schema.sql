-- ============================================================
-- Módulo RONDA — schema para rodar no MESMO Supabase do
-- Passagem de Turno (banco único).
--
-- Todas as tabelas usam o prefixo "ronda_" para nunca colidir
-- com tabelas já existentes do Passagem de Turno (em especial
-- "setores", que já existe com um schema diferente e não tem
-- nenhuma relação com este módulo).
--
-- É seguro rodar mais de uma vez: tudo usa "if not exists" e as
-- policies são recriadas (drop + create). Nada aqui apaga dados
-- que já existam nas tabelas.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase do projeto
-- "Passagem de Turno".
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1) ESTRUTURA DE EQUIPAMENTOS DA RONDA
--    setores → grupos → máquinas → estações
--    (status/observação/histórico da ronda continuam 100% locais
--    no aparelho de quem faz a ronda — ver src/ronda/db.js — só a
--    estrutura/hierarquia fica aqui no banco)
-- ============================================================

create table if not exists ronda_setores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists ronda_grupos (
  id         uuid primary key default gen_random_uuid(),
  setor_id   uuid not null references ronda_setores(id) on delete cascade,
  nome       text not null,
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists ronda_maquinas (
  id         uuid primary key default gen_random_uuid(),
  setor_id   uuid not null references ronda_setores(id) on delete cascade,
  grupo_id   uuid references ronda_grupos(id) on delete cascade, -- nulo = máquina solta no setor, sem grupo
  nome       text not null,
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists ronda_estacoes (
  id         uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references ronda_maquinas(id) on delete cascade,
  nome       text not null,
  criado_em  timestamptz not null default now()
);

create index if not exists idx_ronda_grupos_setor_id    on ronda_grupos(setor_id);
create index if not exists idx_ronda_maquinas_setor_id   on ronda_maquinas(setor_id);
create index if not exists idx_ronda_maquinas_grupo_id   on ronda_maquinas(grupo_id);
create index if not exists idx_ronda_estacoes_maquina_id on ronda_estacoes(maquina_id);

-- ============================================================
-- 2) MANUTENÇÃO DA RONDA
--    manutentores cadastrados + quem está atendendo qual
--    máquina/estação agora. Compartilhado entre aparelhos.
-- ============================================================

create table if not exists ronda_manutentores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  criado_em  timestamptz not null default now()
);

create table if not exists ronda_atendimentos_manutencao (
  id               uuid primary key default gen_random_uuid(),
  maquina_id       uuid references ronda_maquinas(id) on delete cascade,
  estacao_id       uuid references ronda_estacoes(id) on delete set null,
  estacao_nome     text,
  manutentor_id    uuid references ronda_manutentores(id) on delete set null,
  manutentor_nome  text, -- nulo enquanto pendente (nenhum manutentor atribuído ainda)
  descricao        text, -- problema relatado / o que está sendo atendido no momento
  -- Campos OPCIONAIS preenchidos já no início do atendimento — quando
  -- preenchidos, pré-selecionam os mesmos campos na ocorrência automática
  -- criada ao concluir (ver src/ronda/ocorrenciaAutomatica.js). Espelham
  -- "Modo de falha" e "Executor" do formulário de Ocorrência.
  modo_falha             text, -- um de MODOS_FALHA (Elétrico/Mecânico/Automação/Operacional/Outro)
  executor               text, -- se vazio, a ocorrência usa manutentor_nome
  horario_inicio_manual  text, -- "HH:MM", opcional — sobrepõe iniciado_em na ocorrência
  horario_fim_manual     text, -- "HH:MM", opcional — sobrepõe o horário de conclusão na ocorrência
  iniciado_em      timestamptz, -- nulo enquanto pendente; preenchido quando um manutentor é atribuído
  finalizado_em    timestamptz, -- nulo enquanto o atendimento está ativo (pendente ou em andamento)
  criado_em        timestamptz not null default now()
);

create index if not exists idx_ronda_atend_maquina_id    on ronda_atendimentos_manutencao(maquina_id);
create index if not exists idx_ronda_atend_manutentor_id on ronda_atendimentos_manutencao(manutentor_id);
create index if not exists idx_ronda_atend_ativos        on ronda_atendimentos_manutencao(finalizado_em) where finalizado_em is null;
create index if not exists idx_ronda_atend_pendentes     on ronda_atendimentos_manutencao(manutentor_id) where finalizado_em is null and manutentor_id is null;

-- ============================================================
-- 3) SEGURANÇA (RLS)
--    Mesmo modelo do schema original da ronda: o app usa a chave
--    anônima do Supabase no navegador, então o acesso é liberado
--    por policy (o controle de quem pode "Gerenciar" a estrutura
--    já é feito no próprio app, via login/ehAdmin do Passagem de
--    Turno). Ajuste aqui se quiser restringir mais no futuro.
-- ============================================================

alter table ronda_setores                 enable row level security;
alter table ronda_grupos                  enable row level security;
alter table ronda_maquinas                enable row level security;
alter table ronda_estacoes                enable row level security;
alter table ronda_manutentores            enable row level security;
alter table ronda_atendimentos_manutencao enable row level security;

drop policy if exists "ronda_setores: leitura publica"  on ronda_setores;
drop policy if exists "ronda_setores: escrita publica"  on ronda_setores;
create policy "ronda_setores: leitura publica" on ronda_setores for select using (true);
create policy "ronda_setores: escrita publica" on ronda_setores for all    using (true) with check (true);

drop policy if exists "ronda_grupos: leitura publica"  on ronda_grupos;
drop policy if exists "ronda_grupos: escrita publica"  on ronda_grupos;
create policy "ronda_grupos: leitura publica" on ronda_grupos for select using (true);
create policy "ronda_grupos: escrita publica" on ronda_grupos for all    using (true) with check (true);

drop policy if exists "ronda_maquinas: leitura publica"  on ronda_maquinas;
drop policy if exists "ronda_maquinas: escrita publica"  on ronda_maquinas;
create policy "ronda_maquinas: leitura publica" on ronda_maquinas for select using (true);
create policy "ronda_maquinas: escrita publica" on ronda_maquinas for all    using (true) with check (true);

drop policy if exists "ronda_estacoes: leitura publica"  on ronda_estacoes;
drop policy if exists "ronda_estacoes: escrita publica"  on ronda_estacoes;
create policy "ronda_estacoes: leitura publica" on ronda_estacoes for select using (true);
create policy "ronda_estacoes: escrita publica" on ronda_estacoes for all    using (true) with check (true);

drop policy if exists "ronda_manutentores: leitura publica" on ronda_manutentores;
drop policy if exists "ronda_manutentores: escrita publica" on ronda_manutentores;
create policy "ronda_manutentores: leitura publica" on ronda_manutentores for select using (true);
create policy "ronda_manutentores: escrita publica" on ronda_manutentores for all    using (true) with check (true);

drop policy if exists "ronda_atendimentos: leitura publica" on ronda_atendimentos_manutencao;
drop policy if exists "ronda_atendimentos: escrita publica" on ronda_atendimentos_manutencao;
create policy "ronda_atendimentos: leitura publica" on ronda_atendimentos_manutencao for select using (true);
create policy "ronda_atendimentos: escrita publica" on ronda_atendimentos_manutencao for all    using (true) with check (true);

-- ============================================================
-- Pronto. Depois de rodar, confira em Table Editor se as 6
-- tabelas apareceram: ronda_setores, ronda_grupos, ronda_maquinas,
-- ronda_estacoes, ronda_manutentores, ronda_atendimentos_manutencao.
--
-- MIGRAÇÃO DE DADOS: se o banco antigo da ronda (projeto Supabase
-- separado) já tinha setores/grupos/máquinas/estações cadastrados
-- e você quer trazê-los para cá, exporte cada tabela em CSV pelo
-- Table Editor do projeto antigo e importe aqui usando "Insert via
-- CSV" nas tabelas ronda_* correspondentes (os IDs em uuid são
-- preservados, então os vínculos entre setor/grupo/máquina/estação
-- continuam corretos).
-- ============================================================
