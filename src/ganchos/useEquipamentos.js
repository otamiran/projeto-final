// Gancho para a lista permanente de equipamentos (tag + nome)
// Usado no autocomplete dos formulários de Ocorrência/Atividade e na tela Admin
// (cadastro manual ou importação em massa via planilha Excel)

import { useState, useEffect, useCallback } from 'react'
import { bd, TABELA_EQUIPAMENTOS } from '../utilitarios/supabase'

export function useEquipamentos(estaLogado) {
  const [equipamentos, setEquipamentos] = useState([])
  const [carregando, setCarregando]     = useState(false)

  // Busca todos os equipamentos cadastrados, em ordem alfabética pelo nome
  const recarregar = useCallback(async () => {
    if (!estaLogado) return
    setCarregando(true)
    const { data } = await bd
      .from(TABELA_EQUIPAMENTOS)
      .select('*')
      .order('nome', { ascending: true })
    setEquipamentos(data || [])
    setCarregando(false)
  }, [estaLogado])

  useEffect(() => {
    if (!estaLogado) { setEquipamentos([]); return }
    recarregar()

    // Realtime: atualiza a lista quando alguém cadastra/remove/importa equipamentos
    const canal = bd
      .channel('canal-equipamentos')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_EQUIPAMENTOS }, recarregar)
      .subscribe()

    return () => bd.removeChannel(canal)
  }, [estaLogado, recarregar])

  // Cadastra um único equipamento manualmente
  async function adicionar(tag, nome) {
    const nomeFinal = nome.trim()
    const tagFinal  = (tag || '').trim()
    if (!nomeFinal) return { error: 'Informe o nome do equipamento.' }

    // Evita duplicados (mesma tag + nome, case-insensitive)
    const duplicado = equipamentos.some(e =>
      e.nome.toLowerCase() === nomeFinal.toLowerCase() &&
      (e.tag || '').toLowerCase() === tagFinal.toLowerCase()
    )
    if (duplicado) return { error: 'Esse equipamento já está cadastrado.' }

    const { error } = await bd.from(TABELA_EQUIPAMENTOS).insert({
      tag: tagFinal || null,
      nome: nomeFinal,
      criado_em: Date.now(),
    })
    if (error) return { error: error.message }
    // Atualiza a lista local imediatamente — não depende só do Realtime do Supabase
    // (que precisa estar habilitado na tabela; veja instruções no chat)
    await recarregar()
    return { ok: true }
  }

  // Importa uma lista de equipamentos de uma vez (ex: vindos de uma planilha Excel)
  // itens = [{ tag, nome }, ...]
  // Ignora linhas sem nome e pula duplicados (mesma tag + nome já cadastrados)
  async function importarLista(itens) {
    const existentes = new Set(
      equipamentos.map(e => `${(e.tag || '').toLowerCase()}|${e.nome.toLowerCase()}`)
    )

    const vistos = new Set() // evita duplicados dentro da própria planilha
    const paraInserir = []
    let semNome = 0

    for (const item of itens) {
      const nome = (item.nome || '').trim()
      const tag  = (item.tag  || '').trim()
      if (!nome) { semNome++; continue }

      const chave = `${tag.toLowerCase()}|${nome.toLowerCase()}`
      if (existentes.has(chave) || vistos.has(chave)) continue
      vistos.add(chave)

      paraInserir.push({ tag: tag || null, nome, criado_em: Date.now() })
    }

    if (paraInserir.length === 0) {
      return { ok: true, inseridos: 0, duplicados: itens.length - semNome - 0, semNome }
    }

    const { error } = await bd.from(TABELA_EQUIPAMENTOS).insert(paraInserir)
    if (error) return { error: error.message }

    // Atualiza a lista local imediatamente — não depende só do Realtime
    await recarregar()

    return {
      ok: true,
      inseridos: paraInserir.length,
      duplicados: itens.length - paraInserir.length - semNome,
      semNome,
    }
  }

  // Remove um equipamento permanente
  async function remover(id) {
    const { error } = await bd.from(TABELA_EQUIPAMENTOS).delete().eq('id', id)
    if (error) return { error: error.message }
    // Atualiza a lista local imediatamente — não depende só do Realtime
    await recarregar()
    return { ok: true }
  }

  return { equipamentos, carregando, adicionar, importarLista, remover, recarregar }
}
