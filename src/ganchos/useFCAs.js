// Gancho para gerenciar FCAs — criar, editar, excluir e validar

import { useState, useEffect, useCallback } from 'react'
import { bd, TABELA_FCAS } from '../utilitarios/supabase'

export function useFCAs(estaLogado) {
  const [fcas, setFcas]             = useState([])
  const [carregando, setCarregando] = useState(false)

  // Carrega todos os FCAs ordenados por data
  const recarregar = useCallback(async () => {
    if (!estaLogado) return
    setCarregando(true)
    try {
      const { data } = await bd
        .from(TABELA_FCAS)
        .select('*')
        .order('criado_em', { ascending: false })
      setFcas(data || [])
    } catch (e) {
      console.error('useFCAs:', e)
    }
    setCarregando(false)
  }, [estaLogado])

  useEffect(() => {
    recarregar()

    // Realtime — atualiza quando qualquer FCA mudar
    const canal = bd
      .channel('canal-fcas-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_FCAS }, recarregar)
      .subscribe()

    return () => bd.removeChannel(canal)
  }, [recarregar])

  // Cria novo FCA
  async function criar(dados, autor) {
    try {
      const { error } = await bd.from(TABELA_FCAS).insert({
        ...dados, criado_por: autor, criado_em: Date.now(),
      })
      if (error) return { ok: false, erro: error.message }
      return { ok: true }
    } catch (e) {
      return { ok: false, erro: String(e) }
    }
  }

  // Atualiza FCA existente
  async function atualizar(id, dados) {
    try {
      const { error } = await bd.from(TABELA_FCAS).update(dados).eq('id', id)
      if (error) return { ok: false, erro: error.message }
      return { ok: true }
    } catch (e) {
      return { ok: false, erro: String(e) }
    }
  }

  // Exclui um FCA
  async function excluir(id) {
    await bd.from(TABELA_FCAS).delete().eq('id', id)
  }

  // Validacao pela producao — aprova ou reprova
  async function validar(id, tipo, autor) {
    await bd.from(TABELA_FCAS).update({
      validacao_tipo:  tipo,
      validacao_autor: autor,
      validacao_em:    Date.now(),
    }).eq('id', id)
  }

  return { fcas, carregando, recarregar, criar, atualizar, excluir, validar }
}
