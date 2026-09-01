-- ============================================================
-- Adiciona à tabela ronda_atendimentos_manutencao os campos opcionais
-- preenchidos já no início do atendimento (tela "Manutenção" →
-- "Sinalizar atendimento"): modo de falha, executor e horário manual
-- de início/fim. Quando preenchidos, esses valores são usados para
-- pré-selecionar os mesmos campos na ocorrência criada automaticamente
-- ao concluir o atendimento (src/ronda/ocorrenciaAutomatica.js).
--
-- Seguro rodar mais de uma vez (usa "if not exists").
-- Rode no SQL Editor do Supabase.
-- ============================================================

alter table ronda_atendimentos_manutencao
  add column if not exists modo_falha            text,
  add column if not exists executor              text,
  add column if not exists horario_inicio_manual text,
  add column if not exists horario_fim_manual    text;
