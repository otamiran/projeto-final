// Gancho compartilhado para a hierarquia de equipamentos (setor → grupo →
// máquina → estação). Antes existiam DUAS listas de equipamentos
// independentes: a "tag + nome" do Admin (tabela `equipamentos`) e a árvore
// da Ronda (tabelas `ronda_setores/grupos/maquinas/estacoes`). Agora as duas
// telas usam a MESMA fonte — este gancho — para que cadastrar/editar/excluir
// em qualquer uma das telas reflita automaticamente na outra.
//
// Reaproveita as funções de leitura/escrita já existentes em ronda/remoto.js
// (que fala só com a estrutura, nunca com status/observação) em vez de
// duplicar a lógica de acesso ao Supabase.

import { useState, useEffect, useCallback } from 'react'
import { bd } from '../utilitarios/supabase'
import {
  buscarEstruturaRemota, criarRemoto, atualizarRemoto, excluirRemoto,
} from '../ronda/remoto.js'

const TABELAS_FISICAS = ['ronda_setores', 'ronda_grupos', 'ronda_maquinas', 'ronda_estacoes']

export function useEstruturaEquipamentos(estaLogado) {
  const [setores, setSetores]   = useState([])
  const [grupos, setGrupos]     = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [estacoes, setEstacoes] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    if (!estaLogado) return
    setCarregando(true)
    try {
      const r = await buscarEstruturaRemota()
      setSetores((r.setores || []).slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)))
      setGrupos(r.grupos || [])
      setMaquinas(r.maquinas || [])
      setEstacoes(r.estacoes || [])
      setErro('')
    } catch (e) {
      setErro(e.message)
    }
    setCarregando(false)
  }, [estaLogado])

  useEffect(() => {
    if (!estaLogado) { setSetores([]); setGrupos([]); setMaquinas([]); setEstacoes([]); return }
    recarregar()

    // Realtime: qualquer alteração feita pela Ronda (ou por outro admin)
    // atualiza a lista aqui também, e vice-versa.
    const canal = bd.channel('canal-estrutura-equipamentos')
    TABELAS_FISICAS.forEach(tabela => {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, recarregar)
    })
    canal.subscribe()

    return () => bd.removeChannel(canal)
  }, [estaLogado, recarregar])

  // ── lista achatada (usada no autocomplete de Ocorrência/Atividade) ────
  // Uma entrada por máquina e por estação, com o caminho completo da
  // hierarquia como nome — assim o texto já mostra setor/grupo/máquina.
  // `tag` fica vazio de propósito: o caminho já inclui o setor, então
  // repeti-lo como prefixo (ver FormOcorrencia/FormAtividade) só duplicaria
  // a informação na lista.
  const equipamentos = []
  maquinas.forEach(m => {
    const setor = setores.find(s => s.id === m.setor_id)
    const grupo = grupos.find(g => g.id === m.grupo_id)
    const caminho = [setor?.nome, grupo?.nome, m.nome].filter(Boolean).join(' › ')
    equipamentos.push({ id: `m-${m.id}`, tag: '', nome: caminho })
    estacoes.filter(e => e.maquina_id === m.id).forEach(e => {
      equipamentos.push({ id: `e-${e.id}`, tag: '', nome: `${caminho} › ${e.nome}` })
    })
  })
  equipamentos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  // ── CRUD da estrutura (usado pelo <PainelHierarquia> embutido no Admin) ─
  const aoAddSetor = async nome => {
    if (!nome.trim()) return
    try { await criarRemoto('setores', { nome: nome.trim(), ordem: setores.length }); await recarregar() }
    catch (e) { setErro(e.message) }
  }
  const aoAddGrupo = async (setorId, nome) => {
    if (!nome.trim()) return
    try {
      await criarRemoto('grupos', { setor_id: setorId, nome: nome.trim(), ordem: grupos.filter(g => g.setor_id === setorId).length })
      await recarregar()
    } catch (e) { setErro(e.message) }
  }
  const aoAddMaquina = async (grupoId, nome) => {
    if (!nome.trim()) return
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    try {
      await criarRemoto('maquinas', {
        setor_id: grupo.setor_id, grupo_id: grupoId, nome: nome.trim(),
        ordem: maquinas.filter(m => m.grupo_id === grupoId).length,
      })
      await recarregar()
    } catch (e) { setErro(e.message) }
  }
  const aoAddEstacao = async (maquinaId, nome) => {
    if (!nome.trim()) return
    try { await criarRemoto('estacoes', { maquina_id: maquinaId, nome: nome.trim() }); await recarregar() }
    catch (e) { setErro(e.message) }
  }
  const aoRenomear = async (tabela, id, nome) => {
    try { await atualizarRemoto(tabela, id, { nome }); await recarregar() }
    catch (e) { setErro(e.message) }
  }
  const aoExcluir = async (tabela, id) => {
    try { await excluirRemoto(tabela, id); await recarregar() }
    catch (e) { setErro(e.message) }
  }

  const reordenarLista = async (tabela, lista, id, direcao) => {
    const ordenados = lista.slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || (a.criado_em || '').localeCompare(b.criado_em || ''))
    const idx = ordenados.findIndex(i => i.id === id)
    const novoIdx = idx + direcao
    if (idx === -1 || novoIdx < 0 || novoIdx >= ordenados.length) return
    const trocado = ordenados.slice()
    ;[trocado[idx], trocado[novoIdx]] = [trocado[novoIdx], trocado[idx]]
    try {
      await Promise.all(trocado.map((item, i) => atualizarRemoto(tabela, item.id, { ordem: i })))
      await recarregar()
    } catch (e) { setErro(e.message) }
  }
  const aoMoverGrupo = (grupoId, direcao) => {
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    reordenarLista('grupos', grupos.filter(g => g.setor_id === grupo.setor_id), grupoId, direcao)
  }
  const aoMoverMaquina = (maquinaId, direcao) => {
    const maquina = maquinas.find(m => m.id === maquinaId)
    if (!maquina) return
    const irmas = maquina.grupo_id
      ? maquinas.filter(m => m.grupo_id === maquina.grupo_id)
      : maquinas.filter(m => !m.grupo_id && m.setor_id === maquina.setor_id)
    reordenarLista('maquinas', irmas, maquinaId, direcao)
  }

  return {
    setores, grupos, maquinas, estacoes, equipamentos, carregando, erro, recarregar,
    aoAddSetor, aoAddGrupo, aoAddMaquina, aoAddEstacao, aoRenomear, aoExcluir,
    aoMoverGrupo, aoMoverMaquina,
  }
}
