// Tela "Manutenção" (aba superior do app) — antes vivia dentro do módulo
// Ronda como um modal ("🔧 Manutenção"). Agora é uma página própria, para
// que o manutentor sinalize em qual equipamento está atuando (setor →
// grupo → máquina → estação) sem precisar abrir a Ronda inteira.
//
// Reaproveita a MESMA hierarquia de equipamentos da Ronda (ronda/remoto.js)
// e a MESMA tabela de atendimentos (ronda/manutencao.js) — então o que
// acontece aqui aparece também no relatório de WhatsApp da Ronda, e
// vice-versa.
//
// Ao concluir um atendimento, cria automaticamente um rascunho de
// ocorrência no Passagem de Turno (ver ronda/ocorrenciaAutomatica.js) e
// dispara as notificações de início/conclusão (useNotificacoesManutencaoTempoReal,
// já ligado globalmente em App.jsx).

import { useState, useEffect, useCallback, useMemo } from 'react'
import { buscarEstruturaRemota } from '../ronda/remoto.js'
import {
  listarAtendimentosAtivos, iniciarAtendimento, criarPendencia,
  atribuirManutentor, encerrarAtendimento, obterOuCriarManutentor,
} from '../ronda/manutencao.js'
import { criarOcorrenciaAutomatica } from '../ronda/ocorrenciaAutomatica.js'
import BotoesAlternancia from '../componentes/BotoesAlternancia.jsx'
import { MODOS_FALHA } from '../utilitarios/constantes.js'

function tempoDecorrido(desde) {
  if (!desde) return ''
  const ms = Date.now() - new Date(desde).getTime()
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60}min`
}

export default function PaginaManutencao({ sessao, mostrarAviso }) {
  const nomeAtual = (sessao?.tecnico || sessao?.nome || sessao?.login || '').trim() || 'Manutenção'

  const [setores, setSetores]   = useState([])
  const [grupos, setGrupos]     = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [estacoes, setEstacoes] = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // ── seleção do equipamento (formulário de sinalização) ────────
  const [setorId, setSetorId]     = useState('')
  const [grupoId, setGrupoId]     = useState('')
  const [maquinaId, setMaquinaId] = useState('')
  const [estacaoId, setEstacaoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando]   = useState(false)

  // ── campos opcionais — se preenchidos, já vêm pré-selecionados na
  // ocorrência criada automaticamente ao concluir (ver ocorrenciaAutomatica.js)
  const [modoFalha, setModoFalha]           = useState(null)
  const [executor, setExecutor]             = useState('')
  const [horarioInicio, setHorarioInicio]   = useState('')
  const [horarioFim, setHorarioFim]         = useState('')

  const carregar = useCallback(async () => {
    try {
      const [estrutura, atds] = await Promise.all([buscarEstruturaRemota(), listarAtendimentosAtivos()])
      setSetores(estrutura.setores || [])
      setGrupos(estrutura.grupos || [])
      setMaquinas(estrutura.maquinas || [])
      setEstacoes(estrutura.estacoes || [])
      setAtendimentos(atds)
      setErro('')
    } catch (e) {
      setErro(`Não foi possível carregar os dados de manutenção: ${e.message}`)
    }
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const gruposDoSetor    = useMemo(() => grupos.filter(g => g.setor_id === setorId), [grupos, setorId])
  const maquinasDoSetor  = useMemo(() => {
    if (grupoId) return maquinas.filter(m => m.grupo_id === grupoId)
    if (setorId) return maquinas.filter(m => m.setor_id === setorId && !m.grupo_id)
    return []
  }, [maquinas, setorId, grupoId])
  const estacoesDaMaquina = useMemo(() => estacoes.filter(e => e.maquina_id === maquinaId), [estacoes, maquinaId])

  function nomeCompleto(a) {
    const maq   = maquinas.find(m => m.id === a.maquina_id)
    const grupo = maq ? grupos.find(g => g.id === maq.grupo_id) : null
    const setor = maq ? setores.find(s => s.id === maq.setor_id) : null
    const caminho = [setor?.nome, grupo?.nome, maq?.nome].filter(Boolean).join(' › ')
    return a.estacao_nome ? `${caminho} › ${a.estacao_nome}` : caminho
  }

  function limparFormulario() {
    setSetorId(''); setGrupoId(''); setMaquinaId(''); setEstacaoId(''); setDescricao('')
    setModoFalha(null); setExecutor(''); setHorarioInicio(''); setHorarioFim('')
  }

  const opcionaisAtuais = useMemo(() => ({
    modoFalha: modoFalha || null,
    executor: executor.trim() || null,
    horarioInicio: horarioInicio || null,
    horarioFim: horarioFim || null,
  }), [modoFalha, executor, horarioInicio, horarioFim])

  // ── sinalizar que estou atendendo agora ────────────────────────
  async function handleIniciar() {
    if (!maquinaId) { mostrarAviso('Selecione ao menos a máquina.', true); return }
    setEnviando(true)
    try {
      const manutentor = await obterOuCriarManutentor(nomeAtual)
      const estacao = estacaoId ? estacoes.find(e => e.id === estacaoId) : null
      await iniciarAtendimento(maquinaId, manutentor.id, manutentor.nome, estacaoId || null, estacao?.nome || null, descricao || null, opcionaisAtuais)
      mostrarAviso('🔧 Atendimento iniciado — você já pode ver na lista abaixo.')
      limparFormulario()
      await carregar()
    } catch (e) {
      mostrarAviso(e.message, true)
    } finally {
      setEnviando(false)
    }
  }

  // ── registrar como pendência (sem assumir agora) ────────────────
  async function handleRegistrarPendencia() {
    if (!maquinaId) { mostrarAviso('Selecione ao menos a máquina.', true); return }
    setEnviando(true)
    try {
      const estacao = estacaoId ? estacoes.find(e => e.id === estacaoId) : null
      await criarPendencia(maquinaId, estacaoId || null, estacao?.nome || null, descricao || null, opcionaisAtuais)
      mostrarAviso('📋 Pendência registrada — alguém pode assumir depois.')
      limparFormulario()
      await carregar()
    } catch (e) {
      mostrarAviso(e.message, true)
    } finally {
      setEnviando(false)
    }
  }

  // ── assumir uma pendência já registrada por outra pessoa ────────
  async function handleAssumir(atendimentoId) {
    setEnviando(true)
    try {
      const manutentor = await obterOuCriarManutentor(nomeAtual)
      await atribuirManutentor(atendimentoId, manutentor.id, manutentor.nome)
      mostrarAviso('🔧 Você assumiu este atendimento.')
      await carregar()
    } catch (e) {
      mostrarAviso(e.message, true)
    } finally {
      setEnviando(false)
    }
  }

  // ── concluir um atendimento em andamento ─────────────────────────
  async function handleConcluir(atendimento) {
    setEnviando(true)
    try {
      await encerrarAtendimento(atendimento.id)
      const maq   = maquinas.find(m => m.id === atendimento.maquina_id)
      const setor = maq ? setores.find(s => s.id === maq.setor_id) : null
      await criarOcorrenciaAutomatica(atendimento, {
        setorNome: setor?.nome, maquinaNome: maq?.nome, estacaoNome: atendimento.estacao_nome,
      })
      mostrarAviso('✅ Atendimento concluído — ocorrência criada no Passagem de Turno para você completar.')
      await carregar()
    } catch (e) {
      mostrarAviso(e.message, true)
    } finally {
      setEnviando(false)
    }
  }

  const meusAtendimentos = atendimentos.filter(a => a.manutentor_id && a.manutentor_nome?.toLowerCase() === nomeAtual.toLowerCase())
  const outrosAtendimentos = atendimentos.filter(a => a.manutentor_id && a.manutentor_nome?.toLowerCase() !== nomeAtual.toLowerCase())
  const pendencias = atendimentos.filter(a => !a.manutentor_id)

  if (carregando) {
    return <div className="pagina"><div className="container"><p className="texto-apagado">Carregando…</p></div></div>
  }

  return (
    <div className="pagina">
      <div className="container">

        {erro && <div className="erro" style={{ marginBottom: 12 }}>{erro}</div>}

        {/* ── Sinalizar em qual equipamento estou atuando ── */}
        <div className="card">
          <div className="card-cabecalho"><span className="card-rotulo">🔧 Sinalizar atendimento</span></div>
          <div className="card-corpo" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={setorId} onChange={e => { setSetorId(e.target.value); setGrupoId(''); setMaquinaId(''); setEstacaoId('') }} style={{ flex: '1 1 160px' }}>
                <option value="">Setor...</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <select value={grupoId} onChange={e => { setGrupoId(e.target.value); setMaquinaId(''); setEstacaoId('') }} disabled={!setorId || gruposDoSetor.length === 0} style={{ flex: '1 1 160px' }}>
                <option value="">{gruposDoSetor.length ? 'Grupo (opcional)...' : 'Sem grupos neste setor'}</option>
                {gruposDoSetor.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
              </select>
              <select value={maquinaId} onChange={e => { setMaquinaId(e.target.value); setEstacaoId('') }} disabled={!setorId} style={{ flex: '1 1 160px' }}>
                <option value="">Máquina...</option>
                {maquinasDoSetor.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
              <select value={estacaoId} onChange={e => setEstacaoId(e.target.value)} disabled={!maquinaId || estacoesDaMaquina.length === 0} style={{ flex: '1 1 160px' }}>
                <option value="">{estacoesDaMaquina.length ? 'Estação (opcional)...' : 'Sem estações'}</option>
                {estacoesDaMaquina.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <textarea
              rows={2}
              placeholder="O que foi observado / o que você vai fazer (opcional)..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />

            {/* Campos opcionais — se preenchidos, já vêm prontos na ocorrência
                automática criada ao concluir o atendimento (mesmos campos do
                formulário de Ocorrência do Passagem de Turno). */}
            <div className="campo" style={{ marginBottom: 0 }}>
              <label>
                Tipologia de falha
                <span style={{ color: 'var(--cor-apagado)', fontWeight: 'normal', fontSize: 11, marginLeft: 6 }}>(opcional)</span>
              </label>
              <BotoesAlternancia opcoes={MODOS_FALHA} valor={modoFalha} aoMudar={setModoFalha} />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div className="campo" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                <label>
                  Executor
                  <span style={{ color: 'var(--cor-apagado)', fontWeight: 'normal', fontSize: 11, marginLeft: 6 }}>(opcional — se vazio, usa seu nome)</span>
                </label>
                <input
                  type="text"
                  placeholder={nomeAtual}
                  value={executor}
                  onChange={e => setExecutor(e.target.value)}
                />
              </div>
              <div className="campo" style={{ flex: '0 0 auto', marginBottom: 0 }}>
                <label>Início <span style={{ color: 'var(--cor-apagado)', fontWeight: 'normal', fontSize: 11 }}>(opcional)</span></label>
                <input type="time" value={horarioInicio} onChange={e => setHorarioInicio(e.target.value)} style={{ padding: '6px 8px' }} />
              </div>
              <div className="campo" style={{ flex: '0 0 auto', marginBottom: 0 }}>
                <label>Fim <span style={{ color: 'var(--cor-apagado)', fontWeight: 'normal', fontSize: 11 }}>(opcional)</span></label>
                <input type="time" value={horarioFim} onChange={e => setHorarioFim(e.target.value)} style={{ padding: '6px 8px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="botao botao-destaque" onClick={handleIniciar} disabled={enviando || !maquinaId}>
                🔧 Estou atendendo agora
              </button>
              <button className="botao botao-azul" onClick={handleRegistrarPendencia} disabled={enviando || !maquinaId}>
                📋 Registrar pendência (sem assumir)
              </button>
            </div>
          </div>
        </div>

        {/* ── Meus atendimentos em andamento ── */}
        <div className="card">
          <div className="card-cabecalho">
            <span className="card-rotulo">Meus atendimentos em andamento</span>
            {meusAtendimentos.length > 0 && <span className="nav-badge badge-azul">{meusAtendimentos.length}</span>}
          </div>
          <div className="card-corpo">
            {meusAtendimentos.length === 0 ? (
              <p className="texto-apagado" style={{ textAlign: 'center', padding: '12px 0' }}>Nenhum atendimento seu em andamento.</p>
            ) : meusAtendimentos.map(a => (
              <div key={a.id} className="linha-usuario">
                <div className="usuario-info">
                  <span className="usuario-nome">{nomeCompleto(a)}</span>
                  <span className="usuario-meta">
                    {a.descricao ? `${a.descricao} · ` : ''}
                    {a.modo_falha ? `${a.modo_falha} · ` : ''}
                    iniciado há {tempoDecorrido(a.iniciado_em)}
                    {a.executor ? ` · executor: ${a.executor}` : ''}
                  </span>
                </div>
                <div className="usuario-acoes">
                  <button className="botao botao-verde botao-pequeno" onClick={() => handleConcluir(a)} disabled={enviando}>
                    ✅ Concluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pendências (sem manutentor ainda) ── */}
        <div className="card">
          <div className="card-cabecalho">
            <span className="card-rotulo">Pendências aguardando manutentor</span>
            {pendencias.length > 0 && <span className="nav-badge badge-vermelho">{pendencias.length}</span>}
          </div>
          <div className="card-corpo">
            {pendencias.length === 0 ? (
              <p className="texto-apagado" style={{ textAlign: 'center', padding: '12px 0' }}>Nenhuma pendência registrada.</p>
            ) : pendencias.map(a => (
              <div key={a.id} className="linha-usuario">
                <div className="usuario-info">
                  <span className="usuario-nome">{nomeCompleto(a)}</span>
                  {(a.descricao || a.modo_falha) && (
                    <span className="usuario-meta">
                      {[a.descricao, a.modo_falha].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
                <div className="usuario-acoes">
                  <button className="botao botao-azul botao-pequeno" onClick={() => handleAssumir(a.id)} disabled={enviando}>
                    Assumir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Outros atendimentos em andamento (visibilidade) ── */}
        {outrosAtendimentos.length > 0 && (
          <div className="card">
            <div className="card-cabecalho"><span className="card-rotulo">Outros atendimentos em andamento</span></div>
            <div className="card-corpo">
              {outrosAtendimentos.map(a => (
                <div key={a.id} className="linha-usuario">
                  <div className="usuario-info">
                    <span className="usuario-nome">{nomeCompleto(a)}</span>
                    <span className="usuario-meta">{a.manutentor_nome} · há {tempoDecorrido(a.iniciado_em)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
