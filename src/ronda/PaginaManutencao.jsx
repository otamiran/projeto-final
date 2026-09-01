import { useState, useEffect, useMemo, useCallback } from 'react'
import { useEstruturaRemota } from './useEstruturaRemota.js'
import {
  listarManutentores, criarManutentor, excluirManutentor,
  listarAtendimentosAtivos, criarPendencia, atribuirManutentor,
  encerrarAtendimento, iniciarAtendimentoPorNome,
} from './manutencao.js'
import { criarOcorrenciaAutomaticaDeAtendimento } from './ocorrenciaAutomatica.js'
import './estilos.css'

// Tela "🔧 Manutenção" — agora uma aba de primeiro nível do app (antes
// era um botão dentro da Ronda). Duas coisas acontecem aqui:
//
//  1) O manutentor sinaliza, sozinho, em qual equipamento está
//     trabalhando (usa o próprio nome da sessão já logada — sem
//     precisar escolher-se numa lista). Ao concluir, uma ocorrência
//     já é criada automaticamente no relatório de Passagem de Turno
//     do setor/turno/dia (ver ocorrenciaAutomatica.js), pronta pra
//     ele completar depois.
//  2) O que já existia no antigo painel de manutenção da Ronda:
//     cadastro de manutentores, pendências aguardando alguém assumir
//     e a lista de quem está atendendo o quê agora — útil pro
//     supervisor registrar uma pendência vista na ronda, mesmo que
//     não seja ele quem vai atender.
export default function PaginaManutencao({ sessao, mostrarAviso }) {
  const {
    setores, grupos, maquinas, estacoes, carregando: carregandoEstrutura, erro: erroEstrutura,
  } = useEstruturaRemota()

  const meuNome = sessao?.tecnico || sessao?.nome || sessao?.login || ''

  const [manutentores, setManutentores] = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [carregandoAtend, setCarregandoAtend] = useState(true)
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  const carregarManutencao = useCallback(async () => {
    try {
      const [mans, atds] = await Promise.all([listarManutentores(), listarAtendimentosAtivos()])
      setManutentores(mans)
      setAtendimentos(atds)
    } catch (e) {
      setErro(`Não foi possível carregar os dados de manutenção (${e.message}).`)
    }
    setCarregandoAtend(false)
  }, [])

  useEffect(() => { carregarManutencao() }, [carregarManutencao])

  // ── "meu atendimento" (autoatendimento) ───────────────────────
  const meusAtendimentos = useMemo(
    () => atendimentos.filter(a => (a.manutentor_nome || '').trim().toLowerCase() === meuNome.trim().toLowerCase()),
    [atendimentos, meuNome]
  )

  const maquinasOrdenadas = useMemo(() => {
    return maquinas
      .map(m => {
        const grupo = grupos.find(g => g.id === m.grupo_id)
        const setor = setores.find(s => s.id === m.setor_id)
        const caminho = grupo ? `${setor?.nome ?? ''} › ${grupo.nome}` : (setor?.nome || '')
        return { ...m, caminho }
      })
      .sort((a, b) =>
        a.caminho.localeCompare(b.caminho, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })
      )
  }, [maquinas, grupos, setores])

  const [maquinaSel, setMaquinaSel]   = useState('')
  const [estacaoSel, setEstacaoSel]   = useState('')
  const [descricaoSel, setDescricaoSel] = useState('')

  const estacoesDaMaquina = useMemo(
    () => (maquinaSel ? estacoes.filter(e => e.maquina_id === maquinaSel) : []),
    [estacoes, maquinaSel]
  )

  const selecionarMaquina = id => { setMaquinaSel(id); setEstacaoSel('') }

  const infoMaquina = a => {
    const maq = maquinas.find(m => m.id === a.maquina_id)
    const grupo = grupos.find(g => g.id === maq?.grupo_id)
    const setor = setores.find(s => s.id === maq?.setor_id)
    const caminho = grupo ? `${setor?.nome ?? ''} › ${grupo.nome}` : (setor?.nome || '')
    return { maq, nome: maq?.nome || '(equipamento removido)', caminho, setorNome: setor?.nome || '' }
  }

  const formatarHora = iso => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  async function iniciarMeuAtendimento() {
    if (!meuNome.trim()) {
      mostrarAviso ? mostrarAviso('Não foi possível identificar seu nome na sessão.', true) : setErro('Não foi possível identificar seu nome na sessão.')
      return
    }
    if (!maquinaSel) { setErro('Selecione o equipamento.'); return }
    setErro('')
    setProcessando(true)
    try {
      const estacao = estacaoSel ? estacoes.find(e => e.id === estacaoSel) : null
      await iniciarAtendimentoPorNome(maquinaSel, meuNome, estacaoSel || null, estacao?.nome || null, descricaoSel.trim() || null)
      setMaquinaSel(''); setEstacaoSel(''); setDescricaoSel('')
      await carregarManutencao()
      mostrarAviso?.('✓ Atendimento iniciado!')
    } catch (e) {
      setErro(e.message)
    }
    setProcessando(false)
  }

  async function concluirMeuAtendimento(atendimento) {
    setProcessando(true)
    setErro('')
    try {
      const { nome: maquinaNome, setorNome } = infoMaquina(atendimento)
      const finalizado = await encerrarAtendimento(atendimento.id)
      // A ocorrência automática não deve travar a conclusão do atendimento
      // caso falhe — o atendimento já foi encerrado com sucesso.
      try {
        await criarOcorrenciaAutomaticaDeAtendimento({
          setorNome,
          maquinaNome,
          estacaoNome: atendimento.estacao_nome,
          descricao: atendimento.descricao,
          manutentorNome: atendimento.manutentor_nome,
          iniciadoEm: atendimento.iniciado_em,
          finalizadoEm: finalizado?.finalizado_em || new Date().toISOString(),
        })
        mostrarAviso?.('✓ Atendimento concluído — ocorrência criada em Passagem de Turno.')
      } catch (eOcorrencia) {
        mostrarAviso?.(`Atendimento concluído, mas não deu pra criar a ocorrência automática (${eOcorrencia.message}).`, true)
      }
      await carregarManutencao()
    } catch (e) {
      setErro(e.message)
    }
    setProcessando(false)
  }

  // ── pendências / cadastro de manutentores (visão geral) ────────
  const pendentes   = useMemo(() => atendimentos.filter(a => !a.manutentor_id), [atendimentos])
  const emAndamento = useMemo(() => atendimentos.filter(a => a.manutentor_id), [atendimentos])

  const [novoNomeManut, setNovoNomeManut] = useState('')
  const [pendMaquinaSel, setPendMaquinaSel] = useState('')
  const [pendEstacaoSel, setPendEstacaoSel] = useState('')
  const [pendDescricao, setPendDescricao]   = useState('')
  const [atribuindoId, setAtribuindoId]     = useState(null)
  const [manutentorAtrib, setManutentorAtrib] = useState('')

  const pendEstacoesDaMaquina = useMemo(
    () => (pendMaquinaSel ? estacoes.filter(e => e.maquina_id === pendMaquinaSel) : []),
    [estacoes, pendMaquinaSel]
  )

  async function cadastrarManutentor() {
    if (!novoNomeManut.trim()) return
    setProcessando(true)
    try {
      await criarManutentor(novoNomeManut.trim())
      setNovoNomeManut('')
      await carregarManutencao()
    } catch (e) { setErro(e.message) }
    setProcessando(false)
  }

  async function removerManutentorCadastrado(id) {
    if (!window.confirm('Excluir este manutentor do cadastro?')) return
    setProcessando(true)
    try {
      await excluirManutentor(id)
      await carregarManutencao()
    } catch (e) { setErro(e.message) }
    setProcessando(false)
  }

  async function registrarPendencia() {
    if (!pendMaquinaSel) { setErro('Selecione o equipamento da pendência.'); return }
    setErro('')
    setProcessando(true)
    try {
      const estacao = pendEstacaoSel ? estacoes.find(e => e.id === pendEstacaoSel) : null
      await criarPendencia(pendMaquinaSel, pendEstacaoSel || null, estacao?.nome || null, pendDescricao.trim() || null)
      setPendMaquinaSel(''); setPendEstacaoSel(''); setPendDescricao('')
      await carregarManutencao()
      mostrarAviso?.('✓ Pendência registrada!')
    } catch (e) { setErro(e.message) }
    setProcessando(false)
  }

  async function confirmarAtribuicao(id) {
    if (!manutentorAtrib) return
    const manutentor = manutentores.find(m => m.id === manutentorAtrib)
    if (!manutentor) return
    setProcessando(true)
    try {
      await atribuirManutentor(id, manutentor.id, manutentor.nome)
      setAtribuindoId(null); setManutentorAtrib('')
      await carregarManutencao()
    } catch (e) { setErro(e.message) }
    setProcessando(false)
  }

  async function cancelarPendencia(id) {
    setProcessando(true)
    try {
      await encerrarAtendimento(id)
      await carregarManutencao()
    } catch (e) { setErro(e.message) }
    setProcessando(false)
  }

  return (
    <div className="ronda-modulo">
      <div className="pagina-manutencao">
        <div className="pagina-manutencao-corpo">

          {(erro || erroEstrutura) && (
            <div className="erro">
              {erro || erroEstrutura}
              <button className="fechar-erro" onClick={() => setErro('')}>✕</button>
            </div>
          )}

          {/* ── meu atendimento (autoatendimento) ──────────────── */}
          <div className="meu-atendimento-card">
            <div className="meu-atendimento-titulo">🔧 Meu atendimento{meuNome ? ` — ${meuNome}` : ''}</div>

            {meusAtendimentos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {meusAtendimentos.map(a => {
                  const { nome, caminho } = infoMaquina(a)
                  return (
                    <div key={a.id} className="meu-atendimento-ativo">
                      <div className="meu-atendimento-maquina">🏭 {nome}{a.estacao_nome ? ` — ${a.estacao_nome}` : ''}</div>
                      {caminho && <div className="meu-atendimento-caminho">{caminho}</div>}
                      <div className="meu-atendimento-meta">desde {formatarHora(a.iniciado_em)}</div>
                      {a.descricao && <div className="meu-atendimento-desc">📝 {a.descricao}</div>}
                      <div style={{ marginTop: 6 }}>
                        <button className="primario btn-salvar-rodape" disabled={processando} onClick={() => concluirMeuAtendimento(a)}>
                          ✓ Concluir atendimento
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="seletor-equipamento">
              <label>Setor / máquina</label>
              <select value={maquinaSel} onChange={e => selecionarMaquina(e.target.value)} disabled={processando || carregandoEstrutura}>
                <option value="">Selecione o equipamento…</option>
                {maquinasOrdenadas.map(m => (
                  <option key={m.id} value={m.id}>{m.caminho ? `${m.caminho} — ${m.nome}` : m.nome}</option>
                ))}
              </select>

              <label>Estação (opcional)</label>
              <select value={estacaoSel} onChange={e => setEstacaoSel(e.target.value)} disabled={processando || !maquinaSel || estacoesDaMaquina.length === 0}>
                <option value="">
                  {maquinaSel && estacoesDaMaquina.length === 0 ? 'Sem estações cadastradas' : 'Equipamento inteiro'}
                </option>
                {estacoesDaMaquina.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>

              <label>O que está sendo atendido (opcional)</label>
              <textarea
                value={descricaoSel}
                onChange={e => setDescricaoSel(e.target.value)}
                placeholder="Descreva rapidamente o problema…"
                rows={2}
                disabled={processando}
              />

              <button className="primario" onClick={iniciarMeuAtendimento} disabled={processando || !maquinaSel}>
                ▶ Iniciar atendimento neste equipamento
              </button>
            </div>
          </div>

          {/* ── pendências aguardando manutentor ────────────────── */}
          <div className="meu-atendimento-card">
            <div className="meu-atendimento-titulo">🕓 Pendências ({pendentes.length})</div>
            {carregandoAtend ? (
              <div className="carregando">Carregando…</div>
            ) : pendentes.length === 0 ? (
              <div className="manut-vazio-inline">Nenhuma pendência aguardando manutentor.</div>
            ) : (
              <div className="lista-pendentes-mini">
                {pendentes.map(a => {
                  const { nome, caminho } = infoMaquina(a)
                  return (
                    <div key={a.id} className="pendente-mini" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <div className="pendente-mini-info">
                        <span className="pendente-mini-maquina">🏭 {nome}</span>{caminho ? ` · ${caminho}` : ''}
                        {a.estacao_nome && ` · 🔩 ${a.estacao_nome}`}
                        {a.descricao && <div>📝 {a.descricao}</div>}
                      </div>
                      {atribuindoId === a.id ? (
                        <div className="manut-atribuir-inline">
                          <select className="manut-select" value={manutentorAtrib} onChange={e => setManutentorAtrib(e.target.value)} disabled={processando} autoFocus>
                            <option value="">Selecione o manutentor…</option>
                            {manutentores.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                          </select>
                          <button className="primario" disabled={processando || !manutentorAtrib} onClick={() => confirmarAtribuicao(a.id)}>✓</button>
                          <button className="secundario" disabled={processando} onClick={() => setAtribuindoId(null)}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="primario" disabled={processando} onClick={() => { setAtribuindoId(a.id); setManutentorAtrib('') }}>
                            👤 Atribuir
                          </button>
                          <button className="secundario" disabled={processando} onClick={() => cancelarPendencia(a.id)}>✕ Cancelar</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="seletor-equipamento" style={{ marginTop: 14 }}>
              <label>Registrar nova pendência (equipamento visto na ronda, ainda sem manutentor)</label>
              <select value={pendMaquinaSel} onChange={e => { setPendMaquinaSel(e.target.value); setPendEstacaoSel('') }} disabled={processando}>
                <option value="">Selecione o equipamento…</option>
                {maquinasOrdenadas.map(m => (
                  <option key={m.id} value={m.id}>{m.caminho ? `${m.caminho} — ${m.nome}` : m.nome}</option>
                ))}
              </select>
              <select value={pendEstacaoSel} onChange={e => setPendEstacaoSel(e.target.value)} disabled={processando || !pendMaquinaSel || pendEstacoesDaMaquina.length === 0}>
                <option value="">
                  {pendMaquinaSel && pendEstacoesDaMaquina.length === 0 ? 'Sem estações cadastradas' : 'Equipamento inteiro'}
                </option>
                {pendEstacoesDaMaquina.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <textarea value={pendDescricao} onChange={e => setPendDescricao(e.target.value)} placeholder="Problema relatado…" rows={2} disabled={processando} />
              <button className="primario" onClick={registrarPendencia} disabled={processando || !pendMaquinaSel}>+ Registrar pendência</button>
            </div>
          </div>

          {/* ── em atendimento agora (visão geral) ──────────────── */}
          <div className="meu-atendimento-card">
            <div className="meu-atendimento-titulo">🔧 Em atendimento agora ({emAndamento.length})</div>
            {emAndamento.length === 0 ? (
              <div className="manut-vazio-inline">Nenhuma máquina em manutenção no momento.</div>
            ) : (
              <div className="lista-pendentes-mini">
                {emAndamento.map(a => {
                  const { nome, caminho } = infoMaquina(a)
                  return (
                    <div key={a.id} className="pendente-mini">
                      <div className="pendente-mini-info">
                        <span className="pendente-mini-maquina">🏭 {nome}</span>{caminho ? ` · ${caminho}` : ''}
                        <div>👤 {a.manutentor_nome}{a.estacao_nome && ` · 🔩 ${a.estacao_nome}`} · desde {formatarHora(a.iniciado_em)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── cadastro de manutentores ─────────────────────────── */}
          <div className="meu-atendimento-card">
            <div className="meu-atendimento-titulo">👤 Manutentores cadastrados</div>
            <div className="manut-chips-manutentores">
              {manutentores.length === 0 && <span className="manut-vazio-inline">Nenhum manutentor cadastrado ainda.</span>}
              {manutentores.map(m => (
                <span key={m.id} className="chip-manutentor">
                  👤 {m.nome}
                  <button className="chip-manutentor-remover" title="Excluir do cadastro" disabled={processando} onClick={() => removerManutentorCadastrado(m.id)}>✕</button>
                </span>
              ))}
            </div>
            <div className="form-add" style={{ marginTop: 8 }}>
              <input
                value={novoNomeManut}
                onChange={e => setNovoNomeManut(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && cadastrarManutentor()}
                placeholder="Nome do manutentor…"
                disabled={processando}
              />
              <button className="primario" onClick={cadastrarManutentor} disabled={processando || !novoNomeManut.trim()}>+ Adicionar</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
