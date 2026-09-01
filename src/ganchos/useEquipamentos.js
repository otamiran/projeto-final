// Gancho para a lista de equipamentos usada no autocomplete dos
// formulários de Ocorrência/Atividade.
//
// Não existe mais um cadastro de equipamentos separado (tag + nome):
// a lista agora É a mesma hierarquia setor › grupo › máquina › estação
// cadastrada no módulo Ronda (tabelas ronda_setores/ronda_grupos/
// ronda_maquinas/ronda_estacoes — ver src/ronda/remoto.js), pra existir
// um único lugar onde os equipamentos da fábrica são cadastrados
// (a tela "Equipamentos" do Admin, que edita essa mesma hierarquia).
// Aqui ela só é lida e "achatada" num formato de lista simples
// { id, tag, nome } — o mesmo formato que os componentes já esperavam.

import { useState, useEffect, useCallback } from 'react'
import { buscarEstruturaRemota } from '../ronda/remoto.js'

function achatarHierarquia({ setores = [], grupos = [], maquinas = [], estacoes = [] }) {
  const linhas = []
  maquinas.forEach(m => {
    const grupo = m.grupo_id ? grupos.find(g => g.id === m.grupo_id) : null
    const setor = setores.find(s => s.id === m.setor_id)
    const caminho = grupo ? `${setor?.nome || ''} › ${grupo.nome} › ${m.nome}` : `${setor?.nome || ''} › ${m.nome}`
    const estacoesDaMaquina = estacoes.filter(e => e.maquina_id === m.id)

    if (estacoesDaMaquina.length === 0) {
      linhas.push({ id: m.id, tag: setor?.nome || '', nome: caminho })
    } else {
      estacoesDaMaquina.forEach(e => {
        linhas.push({ id: `${m.id}:${e.id}`, tag: setor?.nome || '', nome: `${caminho} — ${e.nome}` })
      })
    }
  })
  linhas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }))
  return linhas
}

export function useEquipamentos(estaLogado) {
  const [equipamentos, setEquipamentos] = useState([])
  const [carregando, setCarregando]     = useState(false)

  const recarregar = useCallback(async () => {
    if (!estaLogado) return
    setCarregando(true)
    try {
      const remoto = await buscarEstruturaRemota()
      setEquipamentos(achatarHierarquia(remoto))
    } catch (e) {
      console.warn('Não foi possível carregar a lista de equipamentos:', e.message)
      setEquipamentos([])
    }
    setCarregando(false)
  }, [estaLogado])

  useEffect(() => {
    if (!estaLogado) { setEquipamentos([]); return }
    recarregar()
  }, [estaLogado, recarregar])

  return { equipamentos, carregando, recarregar }
}
