// Gancho para validações e comentários da produção em um relatório

import { useState, useEffect, useRef } from 'react'
import { bd, TABELA_VALIDACOES, TABELA_COMENTARIOS } from '../utilitarios/supabase'

export function useValidacoes(relatorioId) {
  const [validacoes, setValidacoes]   = useState([])
  const [comentarios, setComentarios] = useState([])
  const canaisRef = useRef([])

  async function recarregar() {
    if (!relatorioId) return
    try {
      const [resV, resC] = await Promise.all([
        bd.from(TABELA_VALIDACOES).select('*').eq('relatorio_id', relatorioId),
        bd.from(TABELA_COMENTARIOS).select('*').eq('relatorio_id', relatorioId)
          .order('criado_em', { ascending: true }),
      ])
      setValidacoes(resV.data || [])
      setComentarios(resC.data || [])
    } catch (e) {
      console.error('useValidacoes:', e)
    }
  }

  useEffect(() => {
    if (!relatorioId) return
    recarregar()

    // Nome único por relatorio para evitar conflitos entre múltiplos componentes
    const nomeV = `val-${relatorioId}-${Math.random().toString(36).slice(2)}`
    const nomeC = `com-${relatorioId}-${Math.random().toString(36).slice(2)}`

    const canalV = bd.channel(nomeV)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_VALIDACOES }, recarregar)
      .subscribe()
    const canalC = bd.channel(nomeC)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_COMENTARIOS }, recarregar)
      .subscribe()

    return () => {
      bd.removeChannel(canalV)
      bd.removeChannel(canalC)
    }
  }, [relatorioId])

  function validacaoDo(indice) {
    return validacoes.find(v => v.item_indice === indice) || null
  }

  function comentariosDo(indice) {
    return comentarios.filter(c => c.item_indice === indice)
  }

  async function validar(indice, tipo, autor) {
    if (!relatorioId) return
    try {
      await bd.from(TABELA_VALIDACOES)
        .delete().eq('relatorio_id', relatorioId).eq('item_indice', indice)
      await bd.from(TABELA_VALIDACOES).insert({
        relatorio_id: relatorioId, item_indice: indice,
        tipo, autor, criado_em: Date.now(),
      })
      await recarregar()
    } catch (e) { console.error('validar:', e) }
  }

  async function comentar(indice, texto, autor) {
    if (!relatorioId || !texto.trim()) return
    try {
      await bd.from(TABELA_COMENTARIOS).insert({
        relatorio_id: relatorioId, item_indice: indice,
        texto: texto.trim(), autor, criado_em: Date.now(),
      })
      await recarregar()
    } catch (e) { console.error('comentar:', e) }
  }

  return { validacoes, comentarios, validacaoDo, comentariosDo, validar, comentar }
}
