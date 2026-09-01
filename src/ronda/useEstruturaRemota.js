// Hook simples pra buscar a hierarquia de equipamentos da Ronda
// (setores › grupos › máquinas › estações) direto do Supabase, SEM
// mesclar com o status local de nenhum aparelho — é o que a tela de
// Admin (lista de equipamentos) e a tela de autoatendimento de
// manutenção precisam: só a estrutura, sempre atualizada.
//
// Diferente do RondaApp.jsx, que guarda uma cópia local (offline) da
// estrutura + status de cada máquina/estação (ver db.js) — isso aqui é
// só leitura/gestão de estrutura, sempre online.
import { useState, useEffect, useCallback } from 'react'
import { buscarEstruturaRemota, criarRemoto, atualizarRemoto, excluirRemoto } from './remoto.js'

export function useEstruturaRemota() {
  const [setores, setSetores]   = useState([])
  const [grupos, setGrupos]     = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [estacoes, setEstacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      const remoto = await buscarEstruturaRemota()
      setSetores(remoto.setores || [])
      setGrupos(remoto.grupos || [])
      setMaquinas(remoto.maquinas || [])
      const estacoesOrdenadas = (remoto.estacoes || []).slice().sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' })
      )
      setEstacoes(estacoesOrdenadas)
      setErro('')
    } catch (e) {
      setErro(`Não foi possível buscar a lista de equipamentos (${e.message}).`)
    }
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const addSetor = async nome => {
    if (!nome.trim()) return
    try {
      await criarRemoto('setores', { nome: nome.trim(), ordem: setores.length })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const addGrupo = async (setorId, nome) => {
    if (!nome.trim()) return
    try {
      await criarRemoto('grupos', { setor_id: setorId, nome: nome.trim(), ordem: grupos.filter(g => g.setor_id === setorId).length })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const addMaquina = async (grupoId, nome) => {
    if (!nome.trim()) return
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    try {
      await criarRemoto('maquinas', {
        setor_id: grupo.setor_id,
        grupo_id: grupoId,
        nome: nome.trim(),
        ordem: maquinas.filter(m => m.grupo_id === grupoId).length,
      })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const addEstacao = async (maquinaId, nome) => {
    if (!nome.trim()) return
    try {
      await criarRemoto('estacoes', { maquina_id: maquinaId, nome: nome.trim() })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const renomear = async (tabela, id, nome) => {
    try {
      await atualizarRemoto(tabela, id, { nome })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const reordenarLista = async (tabela, lista, id, direcao) => {
    const ordenados = lista.slice().sort((a, b) =>
      (a.ordem ?? 0) - (b.ordem ?? 0) || (a.criado_em || '').localeCompare(b.criado_em || '')
    )
    const idx = ordenados.findIndex(i => i.id === id)
    const novoIdx = idx + direcao
    if (idx === -1 || novoIdx < 0 || novoIdx >= ordenados.length) return
    const trocado = ordenados.slice()
    ;[trocado[idx], trocado[novoIdx]] = [trocado[novoIdx], trocado[idx]]
    try {
      await Promise.all(trocado.map((item, i) => atualizarRemoto(tabela, item.id, { ordem: i })))
      await carregar()
    } catch (e) { setErro(`Erro ao reordenar: ${e.message}`) }
  }

  const moverGrupo = (grupoId, direcao) => {
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    const irmaos = grupos.filter(g => g.setor_id === grupo.setor_id)
    reordenarLista('grupos', irmaos, grupoId, direcao)
  }

  const moverMaquina = (maquinaId, direcao) => {
    const maquina = maquinas.find(m => m.id === maquinaId)
    if (!maquina) return
    const irmas = maquina.grupo_id
      ? maquinas.filter(m => m.grupo_id === maquina.grupo_id)
      : maquinas.filter(m => !m.grupo_id && m.setor_id === maquina.setor_id)
    reordenarLista('maquinas', irmas, maquinaId, direcao)
  }

  const excluir = async (tabela, id) => {
    try {
      await excluirRemoto(tabela, id)
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  return {
    setores, grupos, maquinas, estacoes, carregando, erro, setErro, carregar,
    addSetor, addGrupo, addMaquina, addEstacao, renomear, excluir, moverGrupo, moverMaquina,
  }
}
