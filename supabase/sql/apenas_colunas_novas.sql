-- Rode só isto (as partes de create table/policy já foram criadas antes,
-- rodar elas de novo dá erro de "já existe" — é normal e não tem problema).

alter table push_inscricoes
  add column if not exists usuario_id text;

alter table usuarios
  add column if not exists notificacoes_ativas boolean not null default true;
