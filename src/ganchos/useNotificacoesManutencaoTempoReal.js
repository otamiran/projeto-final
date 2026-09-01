// Gancho para notificar (localmente, sem depender de push/FCM) quando um
// manutentor INICIA ou CONCLUI o atendimento de um equipamento na tela de
// Manutenção — mesma técnica e mesmo helper de exibição usados em
// useNotificacoesTempoReal.js para ocorrências/atividades novas.
//
// Ao contrário daquele gancho (que compara o array `itens` recebido via
// props), este escuta diretamente a tabela `ronda_atendimentos_manutencao`
// no Supabase Realtime, porque essa tabela não faz parte do payload de
// `abertos` já carregado pelo resto do app.
//
// IMPORTANTE: para o UPDATE conseguir comparar o valor antigo (`payload.old`)
// com o novo (ex.: `finalizado_em` que passou de nulo para preenchido), a
// tabela precisa estar com REPLICA IDENTITY FULL no Supabase — ver
// supabase/sql/ronda_manutencao_replica_identity.sql.

import { useEffect } from 'react'
import { bd } from '../utilitarios/supabase.js'

async function mostrarNotificacaoLocal(titulo, opcoes) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    if ('serviceWorker' in navigator) {
      const registro = await navigator.serviceWorker.ready
      await registro.showNotification(titulo, opcoes)
    } else {
      new Notification(titulo, opcoes)
    }
  } catch (erro) {
    console.warn('Não foi possível mostrar a notificação local:', erro)
  }
}

function notificarInicio(row) {
  const equipamento = row.estacao_nome || 'equipamento'
  mostrarNotificacaoLocal(`🔧 Atendimento iniciado`, {
    body: `${row.manutentor_nome || 'Manutentor'} começou a atender ${equipamento}${row.descricao ? `\n${row.descricao}` : ''}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [120, 60, 120],
    tag: `atendimento-${row.id}`,
    renotify: true,
    data: { url: '/', atendimentoId: row.id },
  })
}

function notificarConclusao(row) {
  mostrarNotificacaoLocal(`✅ Atendimento concluído`, {
    body: `${row.manutentor_nome || 'Manutentor'} concluiu o atendimento${row.estacao_nome ? ` — ${row.estacao_nome}` : ''}. Ocorrência criada no Passagem de Turno para preenchimento.`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [120, 60, 120],
    tag: `atendimento-${row.id}`,
    renotify: true,
    data: { url: '/', atendimentoId: row.id },
  })
}

export function useNotificacoesManutencaoTempoReal(ativo) {
  useEffect(() => {
    if (!ativo) return

    const canal = bd
      .channel('canal-atendimentos-manutencao')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ronda_atendimentos_manutencao' }, ({ new: row }) => {
        // só notifica "iniciado" quando já nasce com manutentor (autoatendimento);
        // uma pendência sem manutentor ainda não é um atendimento em curso.
        if (row.manutentor_id && row.iniciado_em) notificarInicio(row)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ronda_atendimentos_manutencao' }, ({ old: antes, new: agora }) => {
        if (!antes?.finalizado_em && agora.finalizado_em) {
          notificarConclusao(agora)
        } else if (!antes?.manutentor_id && agora.manutentor_id) {
          // pendência que acabou de ser assumida por alguém = início
          notificarInicio(agora)
        }
      })
      .subscribe()

    return () => bd.removeChannel(canal)
  }, [ativo])
}
