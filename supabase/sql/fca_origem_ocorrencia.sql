-- Vincula cada FCA à ocorrência que o originou.
--
-- Toda ocorrência nova lançada em "Novo" agora gera automaticamente um FCA
-- (aba FCA) pronto para ser preenchido pela manutenção. Guardamos um SNAPSHOT
-- (jsonb) dos dados da ocorrência no momento da criação — e não apenas uma
-- referência (foreign key) — porque o relatório de origem pode depois ser
-- fechado no Histórico, editado ou até excluído, e mesmo assim o FCA precisa
-- continuar mostrando a ocorrência original lado a lado na tela de FCA.
--
-- Rode este script uma vez no SQL editor do Supabase.

alter table public.fcas
  add column if not exists ocorrencia_origem jsonb,
  add column if not exists gerado_automaticamente boolean default false,
  add column if not exists preenchido boolean default true;

comment on column public.fcas.ocorrencia_origem is
  'Snapshot dos dados da ocorrência que gerou este FCA (equipamento, sintoma, setor/turno/data, fotos etc.) — usado para exibir a ocorrência ao lado do FCA na tela de preenchimento.';

comment on column public.fcas.gerado_automaticamente is
  'true quando o FCA foi criado automaticamente a partir de uma ocorrência (aba Novo); false quando criado manualmente na aba FCA.';

comment on column public.fcas.preenchido is
  'false enquanto o FCA gerado automaticamente ainda não foi preenchido pela manutenção (usado no número-indicador da aba FCA); true assim que alguém salva o formulário (criação manual sempre nasce true).';

-- Índice opcional, útil se um dia quisermos consultar "o FCA da ocorrência X do relatório Y"
create index if not exists idx_fcas_ocorrencia_relatorio
  on public.fcas (((ocorrencia_origem->>'relatorio_id')));
