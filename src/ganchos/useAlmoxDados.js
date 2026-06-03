// Gancho responsável por carregar e mutar os dados do Almoxarifado no Supabase.
// Segue o padrão de useRelatorios.js do app principal.

import { useState, useEffect, useCallback } from 'react'
import {
  carregarTudo,
  importarPlanilha,
  limparTudo,
  salvarObs as salvarObsServico,
} from '../utilitarios/almoxServico'

export function useAlmoxDados({ mostrarAviso }) {
  const [status, setStatus]         = useState({ tipo: 'carregando', msg: 'Conectando...' })
  const [lista, setLista]           = useState([])       // linhas da tabela
  const [cabecalhos, setCabecalhos] = useState([])       // colunas da planilha
  const [obs, setObs]               = useState({})       // { row_idx -> {id, descricao, autor} }
  const [carregado, setCarregado]   = useState(false)
  const [progresso, setProgresso]   = useState(null)     // { atual, total } durante importação

  // ── Carrega tudo do banco ─────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setStatus({ tipo: 'carregando', msg: 'Carregando lista...' })
    try {
      const { lista: linhas, obs: mapaObs } = await carregarTudo(msg =>
        setStatus({ tipo: 'carregando', msg })
      )

      if (linhas.length) {
        setCabecalhos(linhas[0].headers || [])
        setLista(linhas)
      } else {
        setCabecalhos([])
        setLista([])
      }
      setObs(mapaObs)
      setCarregado(true)
      setStatus({
        tipo: 'ok',
        msg: linhas.length ? `${linhas.length} itens carregados` : 'Nenhuma planilha carregada',
      })
    } catch (erro) {
      setStatus({ tipo: 'erro', msg: 'Erro: ' + erro.message })
      mostrarAviso('Erro ao carregar: ' + erro.message, true)
    }
  }, [mostrarAviso])

  // Carrega ao montar o componente
  useEffect(() => { carregar() }, [carregar])

  // ── Importar Excel/CSV ────────────────────────────────────────────────
  async function importar(arquivo) {
    if (!arquivo) return
    try {
      mostrarAviso('Enviando para o servidor...')
      setProgresso({ atual: 0, total: 1 })
      const total = await importarPlanilha(arquivo, (atual, tot) => {
        setProgresso({ atual, total: tot })
      })
      setProgresso(null)
      setCarregado(false)
      await carregar()
      mostrarAviso(`✓ ${total} itens importados para todos!`)
    } catch (erro) {
      setProgresso(null)
      mostrarAviso('Erro: ' + erro.message, true)
    }
  }

  // ── Limpar lista ──────────────────────────────────────────────────────
  async function limpar() {
    try {
      await limparTudo()
      setLista([]); setCabecalhos([]); setObs({})
      setCarregado(false)
      setStatus({ tipo: 'ok', msg: 'Nenhuma planilha carregada' })
      mostrarAviso('Lista excluída.')
    } catch (erro) {
      mostrarAviso('Erro: ' + erro.message, true)
    }
  }

  // ── Salvar / editar / remover observação ──────────────────────────────
  async function salvarObservacao(rowIdx, texto, nomeAutor) {
    const existente = obs[rowIdx]
    const resultado = await salvarObsServico(rowIdx, texto, nomeAutor, existente)
    if (resultado) {
      // Criou ou atualizou
      setObs(o => ({ ...o, [rowIdx]: resultado }))
    } else {
      // Removeu
      setObs(o => { const n = { ...o }; delete n[rowIdx]; return n })
    }
  }

  return {
    status, lista, cabecalhos, obs,
    carregado, progresso,
    carregar, importar, limpar, salvarObservacao,
  }
}
