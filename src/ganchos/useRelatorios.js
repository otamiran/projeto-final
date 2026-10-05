// Gancho React para buscar relatórios do banco e escutar atualizações em tempo real

import { useState, useEffect, useCallback } from 'react'
import { bd, TABELA_ABERTOS, TABELA_HISTORICO } from '../utilitarios/supabase'

// Proteção contra itens `null` dentro de `itens` (lacunas gravadas no banco).
// Um único null derrubava as telas com "Cannot read properties of null
// (reading 'tipo')". Em vez de REMOVER o item, troca por um item "vazio":
// assim os índices continuam iguais aos do banco (edição, exclusão,
// validações e comentários dependem da posição do item) e o admin ainda
// consegue excluir a linha vazia pela tela. Itens do tipo 'vazio' não são
// contados nem entram em PDFs/textos (que filtram por tipo).
function limparItens(relatorios) {
  return (relatorios || []).map(r => (
    Array.isArray(r?.itens) && r.itens.some(i => !i)
      ? { ...r, itens: r.itens.map(i => i || { tipo: 'vazio', descricao: '(item vazio — pode ser excluído)', _vazio: true }) }
      : r
  ))
}

export function useRelatorios(estaLogado) {
  const [abertos, setAbertos] = useState([]) // lista de relatórios abertos
  const [historico, setHistorico] = useState([]) // lista do histórico
  const [status, setStatus] = useState({ tipo: 'carregando', mensagem: 'Conectando...' })

  // Busca todos os dados do banco
  const recarregar = useCallback(async () => {
    setStatus({ tipo: 'carregando', mensagem: 'Carregando...' })

    // Busca as duas tabelas ao mesmo tempo (mais rápido)
    const [resAbertos, resHistorico] = await Promise.all([
      bd.from(TABELA_ABERTOS).select('*').order('criado_em', { ascending: false }),
      bd.from(TABELA_HISTORICO).select('*').order('criado_em', { ascending: false }),
    ])

    // Se der erro em qualquer uma das buscas
    if (resAbertos.error || resHistorico.error) {
      setStatus({ tipo: 'erro', mensagem: 'Erro ao conectar com o banco.' })
      return
    }

    // Atualiza os estados com os dados recebidos
    setAbertos(limparItens(resAbertos.data))
    setHistorico(limparItens(resHistorico.data))
    setStatus({
      tipo: 'ok',
      mensagem: `Conectado — ${(resAbertos.data || []).length} aberto(s)`,
    })
  }, [])

  useEffect(() => {
    // Só carrega se o usuário estiver logado
    if (!estaLogado) {
      setAbertos([])
      setHistorico([])
      return
    }

    recarregar() // carrega os dados ao entrar

    // Escuta mudanças em tempo real na tabela de abertos
    // Qualquer insert/update/delete atualiza a tela de todos os usuários
    const canalAbertos = bd
      .channel('canal-abertos')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_ABERTOS }, recarregar)
      .subscribe()

    // Escuta mudanças na tabela de histórico
    const canalHistorico = bd
      .channel('canal-historico')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_HISTORICO }, recarregar)
      .subscribe()

    // Cancela as escutas quando o componente desmonta ou o usuário desloga
    return () => {
      bd.removeChannel(canalAbertos)
      bd.removeChannel(canalHistorico)
    }
  }, [estaLogado, recarregar])

  return { abertos, historico, status, recarregar }
}
