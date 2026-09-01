-- ============================================================
-- Necessário para: notificações de "atendimento iniciado" /
-- "atendimento concluído" (useNotificacoesManutencaoTempoReal.js)
--
-- O gancho escuta UPDATEs em ronda_atendimentos_manutencao e compara
-- o valor ANTIGO de finalizado_em/manutentor_id com o NOVO, para saber
-- se um atendimento acabou de ser concluído (ou assumido). Por padrão o
-- Postgres só manda a chave primária no "old" de um UPDATE via Realtime;
-- REPLICA IDENTITY FULL manda a linha inteira, permitindo essa comparação.
--
-- Rode este arquivo uma vez no SQL Editor do Supabase (idempotente).
-- ============================================================

alter table ronda_atendimentos_manutencao replica identity full;

-- Garante que a tabela está na publicação usada pelo Realtime do Supabase
-- (normalmente "supabase_realtime"). Se já estiver, este comando é
-- ignorado sem erro.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ronda_atendimentos_manutencao'
  ) then
    alter publication supabase_realtime add table ronda_atendimentos_manutencao;
  end if;
end $$;

-- ── bônus: mesma garantia para a hierarquia de equipamentos ──────
-- Necessário para o gancho useEstruturaEquipamentos.js (usado tanto pelo
-- Admin quanto, indiretamente, pela Ronda) atualizar em tempo real quando
-- alguém edita a estrutura em outra aba/aparelho. Sem isso o app ainda
-- funciona normalmente (recarrega manualmente após cada ação), só não
-- sincroniza sozinho entre abas.
do $$
declare
  t text;
begin
  foreach t in array array['ronda_setores', 'ronda_grupos', 'ronda_maquinas', 'ronda_estacoes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
