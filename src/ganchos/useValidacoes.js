// Gancho para validações e comentários da produção em um relatório
// Usado tanto pela tela de produção quanto pela tela de manutenção (para exibir)

import { useState, useEffect } from 'react'
import { bd, TABELA_VALIDACOES, TABELA_COMENTARIOS } from '../utilitarios/supabase'

export function useValidacoes(relatorioId) {
  const [validacoes, setValidacoes]   = useState([]) // [{item_indice, tipo, autor}]
  const [comentarios, setComentarios] = useState([]) // [{item_indice, texto, autor, criado_em}]

  // Busca validações e comentários do relatório
  async function recarregar() {
    if (!relatorioId) return
    const [resV, resC] = await Promise.all([
      bd.from(TABELA_VALIDACOES).select('*').eq('relatorio_id', relatorioId),
      bd.from(TABELA_COMENTARIOS).select('*').eq('relatorio_id', relatorioId).order('criado_em', { ascending: true }),
    ])
    setValidacoes(resV.data || [])
    setComentarios(resC.data || [])
  }

  useEffect(() => {
    recarregar()

    // Realtime: atualiza quando produção valida ou comenta
    const canalV = bd.channel('canal-val-' + relatorioId)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_VALIDACOES,
          filter: `relatorio_id=eq.${relatorioId}` }, recarregar)
      .subscribe()
    const canalC = bd.channel('canal-com-' + relatorioId)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_COMENTARIOS,
          filter: `relatorio_id=eq.${relatorioId}` }, recarregar)
      .subscribe()

    return () => { bd.removeChannel(canalV); bd.removeChannel(canalC) }
  }, [relatorioId])

  // Retorna a validação de um item específico (ou null se não tiver)
  function validacaoDo(indice) {
    return validacoes.find(v => v.item_indice === indice) || null
  }

  // Retorna os comentários de um item específico
  function comentariosDo(indice) {
    return comentarios.filter(c => c.item_indice === indice)
  }

  // Salva uma validação — se já existe, atualiza (upsert pelo índice)
  async function validar(indice, tipo, autor) {
    // Remove validação anterior do mesmo item, se existir
    await bd.from(TABELA_VALIDACOES)
      .delete()
      .eq('relatorio_id', relatorioId)
      .eq('item_indice', indice)

    // Insere a nova validação
    await bd.from(TABELA_VALIDACOES).insert({
      relatorio_id: relatorioId,
      item_indice: indice,
      tipo,          // 'aprovado' | 'reprovado'
      autor,
      criado_em: Date.now(),
    })
  }

  // Adiciona um comentário
  async function comentar(indice, texto, autor) {
    if (!texto.trim()) return
    await bd.from(TABELA_COMENTARIOS).insert({
      relatorio_id: relatorioId,
      item_indice: indice,
      texto: texto.trim(),
      autor,
      criado_em: Date.now(),
    })
  }

  return { validacoes, comentarios, validacaoDo, comentariosDo, validar, comentar }
}
