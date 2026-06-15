// Gancho para a lista permanente de setores
// Usado no formulário "Novo" (selecionar setor) e na tela Admin (gerenciar setores)

import { useState, useEffect, useCallback } from 'react'
import { bd, TABELA_SETORES } from '../utilitarios/supabase'

export function useSetores(estaLogado) {
  const [setores, setSetores] = useState([])
  const [carregando, setCarregando] = useState(false)

  // Busca todos os setores cadastrados, em ordem alfabética
  const recarregar = useCallback(async () => {
    if (!estaLogado) return
    setCarregando(true)
    const { data } = await bd
      .from(TABELA_SETORES)
      .select('*')
      .order('nome', { ascending: true })
    setSetores(data || [])
    setCarregando(false)
  }, [estaLogado])

  useEffect(() => {
    if (!estaLogado) { setSetores([]); return }
    recarregar()

    // Realtime: atualiza a lista quando alguém cadastra/remove um setor
    const canal = bd
      .channel('canal-setores')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_SETORES }, recarregar)
      .subscribe()

    return () => bd.removeChannel(canal)
  }, [estaLogado, recarregar])

  // Cadastra um novo setor permanente
  async function adicionar(nome) {
    const nomeFinal = nome.trim()
    if (!nomeFinal) return { error: 'Informe o nome do setor.' }

    // Evita duplicados (case-insensitive)
    if (setores.some(s => s.nome.toLowerCase() === nomeFinal.toLowerCase())) {
      return { error: 'Esse setor já está cadastrado.' }
    }

    const { error } = await bd.from(TABELA_SETORES).insert({ nome: nomeFinal, criado_em: Date.now() })
    if (error) return { error: error.message }
    return { ok: true }
  }

  // Remove um setor permanente
  async function remover(id) {
    const { error } = await bd.from(TABELA_SETORES).delete().eq('id', id)
    if (error) return { error: error.message }
    return { ok: true }
  }

  return { setores, carregando, adicionar, remover, recarregar }
}
