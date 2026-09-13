// Painel do administrador
// Gerencia usuários (aprovar/bloquear/excluir), setores permanentes e
// acompanha relatórios por usuário

import { useState } from 'react'
import { useAdmin } from '../ganchos/useAdmin'
import { useSetores } from '../ganchos/useSetores'
import SecaoColapsavel from '../componentes/SecaoColapsavel'
import PainelHierarquia from '../ronda/componentes/PainelHierarquia.jsx'
import '../ronda/estilos.css'

// Formata timestamp em data legível
function formatarData(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('pt-BR')
}

export default function PaginaAdmin({ sessao, historico, pedir, mostrarAviso, aoVerRelatorio, equipamentosGancho = {} }) {
  const {
    pendentes, aprovados, bloqueados,
    aprovar, bloquear, excluir, alternarNotificacoes, tornarAdmin, removerAdmin, recarregar,
  } = useAdmin(!!sessao, sessao?.grupo === 'admin' || sessao?.admin === true)

  const { setores, adicionar: adicionarSetor, remover: removerSetor, atualizarResponsavel, TURNOS } = useSetores(!!sessao)
  const [novoSetor, setNovoSetor] = useState('')
  // Controla qual setor está com os campos de responsável abertos para edição
  const [editandoResponsavel, setEditandoResponsavel] = useState(null)   // id do setor
  const [valoresResponsavel, setValoresResponsavel]   = useState({})     // { turno: nome }

  // ── Equipamentos — MESMA hierarquia (setor › grupo › máquina › estação)
  // usada pelo módulo Ronda. Editar aqui (renomear, excluir, adicionar)
  // muda os dados que a Ronda usa, e vice-versa — é a mesma tabela.
  const {
    setores: setoresEquip = [], grupos: gruposEquip = [], maquinas: maquinasEquip = [], estacoes: estacoesEquip = [],
    aoAddSetor, aoAddGrupo, aoAddMaquina, aoAddEstacao, aoRenomear, aoExcluir, aoMoverGrupo, aoMoverMaquina,
  } = equipamentosGancho
  // Salva o mapa de responsáveis por turno de um setor
  async function handleSalvarResponsavel(s) {
    const resultado = await atualizarResponsavel(s.id, valoresResponsavel)
    if (resultado.error) {
      mostrarAviso(resultado.error, true)
      return
    }
    setEditandoResponsavel(null)
    mostrarAviso('✓ Responsáveis atualizados!')
  }

  // Cadastra um novo setor permanente
  async function handleAdicionarSetor() {
    const resultado = await adicionarSetor(novoSetor)
    if (resultado.error) {
      mostrarAviso(resultado.error, true)
      return
    }
    setNovoSetor('')
    mostrarAviso('✓ Setor cadastrado!')
  }

  // Remove um setor permanente (com confirmação)
  function handleRemoverSetor(s) {
    pedir(`Remover o setor "${s.nome}"? Relatórios já criados não são afetados.`, async () => {
      const resultado = await removerSetor(s.id)
      if (resultado.error) {
        mostrarAviso(resultado.error, true)
        return
      }
      mostrarAviso('Setor removido.')
    })
  }

  // Aprovação com feedback
  async function handleAprovar(u) {
    await aprovar(u.id)
    mostrarAviso(`✓ ${u.username} aprovado!`)
  }

  // Bloqueio com confirmação
  function handleBloquear(u) {
    pedir(`Bloquear o acesso de "${u.username}"?`, async () => {
      await bloquear(u.id)
      mostrarAviso(`${u.username} foi bloqueado.`)
    })
  }

  // Ativa/desativa notificações push desse usuário
  async function handleAlternarNotificacoes(u) {
    await alternarNotificacoes(u.id, u.notificacoes_ativas)
    mostrarAviso(
      u.notificacoes_ativas
        ? `🔕 Notificações desativadas para ${u.username}.`
        : `🔔 Notificações ativadas para ${u.username}.`
    )
  }

  // Exclusão permanente
  function handleExcluir(u) {
    pedir(`Excluir permanentemente "${u.username}"? Esta ação não pode ser desfeita.`, async () => {
      await excluir(u.id)
      mostrarAviso('Usuário excluído.')
    })
  }

  // Concede permissão de admin (mantém o grupo/setor original do usuário)
  function handleTornarAdmin(u) {
    pedir(`Dar permissão de administrador para "${u.username}"? Essa pessoa passará a ter acesso total ao painel Admin.`, async () => {
      await tornarAdmin(u.id)
      mostrarAviso(`👑 ${u.username} agora é administrador.`)
    })
  }

  // Remove permissão de admin concedida anteriormente
  function handleRemoverAdmin(u) {
    if (u.id === sessao?.id) {
      mostrarAviso('Você não pode remover sua própria permissão de admin por aqui.', true)
      return
    }
    pedir(`Remover a permissão de administrador de "${u.username}"?`, async () => {
      await removerAdmin(u.id)
      mostrarAviso(`${u.username} deixou de ser administrador.`)
    })
  }

  // Label do grupo para exibição
  const labelGrupo = g => ({ manutencao: '🔧 Manutenção', producao: '🏭 Produção', admin: '👑 Admin' })[g] || g

  return (
    <div className="pagina">
      <div className="container">

        {/* ── Pendentes (destaque no topo) ── */}
        <SecaoColapsavel
          titulo="Aguardando Aprovação"
          badge={pendentes.length > 0 && <span className="nav-badge badge-vermelho">{pendentes.length}</span>}
        >
            {pendentes.length === 0 ? (
              <p className="texto-apagado" style={{ textAlign: 'center', padding: '12px 0' }}>
                Nenhum cadastro pendente.
              </p>
            ) : (
              pendentes.map(u => (
                <div key={u.id} className="linha-usuario">
                  <div className="usuario-info">
                    <span className="usuario-nome">👤 {u.username}</span>
                    <span className="usuario-meta">{labelGrupo(u.grupo)} · solicitado em {formatarData(u.criado_em)}</span>
                  </div>
                  <div className="usuario-acoes">
                    <button className="botao botao-verde botao-pequeno" onClick={() => handleAprovar(u)}>
                      ✓ Aprovar
                    </button>
                    <button className="botao botao-vermelho botao-pequeno" onClick={() => handleBloquear(u)}>
                      ✕ Recusar
                    </button>
                  </div>
                </div>
              ))
            )}
        </SecaoColapsavel>

        {/* ── Usuários aprovados ── */}
        <SecaoColapsavel titulo="Usuários Ativos">
            {aprovados.length === 0 ? (
              <p className="texto-apagado" style={{ textAlign: 'center', padding: '12px 0' }}>Nenhum usuário cadastrado.</p>
            ) : (
              aprovados.map(u => {
                // Quantidade de relatórios fechados por esse usuário
                const qtd = (historico || []).filter(r => r.criado_por === u.username).length
                return (
                  <div key={u.id} className="linha-usuario">
                    <div className="usuario-info">
                      <span className="usuario-nome">
                        👤 {u.username}{u.admin && <span title="Administrador"> 👑</span>}
                      </span>
                      <span className="usuario-meta">
                        {labelGrupo(u.grupo)}{u.admin && ' · 👑 Admin'} · {qtd} relatório(s) · último acesso: {formatarData(u.ultimo_acesso)}
                      </span>
                    </div>
                    <div className="usuario-acoes">
                      <button
                        className="botao botao-pequeno"
                        onClick={() => handleAlternarNotificacoes(u)}
                        title={
                          u.notificacoes_ativas === false
                            ? 'Notificações desativadas — clique pra ativar'
                            : 'Notificações ativadas — clique pra desativar'
                        }
                      >
                        {u.notificacoes_ativas === false ? '🔕' : '🔔'}
                      </button>
                      {u.admin ? (
                        <button className="botao botao-pequeno" onClick={() => handleRemoverAdmin(u)}>
                          🔒 Remover Admin
                        </button>
                      ) : (
                        <button className="botao botao-pequeno" onClick={() => handleTornarAdmin(u)}>
                          👑 Tornar Admin
                        </button>
                      )}
                      <button className="botao botao-laranja botao-pequeno" onClick={() => handleBloquear(u)}>
                        🚫 Bloquear
                      </button>
                      <button className="botao botao-vermelho botao-pequeno" onClick={() => handleExcluir(u)}>
                        🗑
                      </button>
                    </div>
                  </div>
                )
              })
            )}
        </SecaoColapsavel>

        {/* ── Usuários bloqueados ── */}
        {bloqueados.length > 0 && (
          <SecaoColapsavel titulo="Bloqueados">
              {bloqueados.map(u => (
                <div key={u.id} className="linha-usuario">
                  <div className="usuario-info">
                    <span className="usuario-nome" style={{ opacity: 0.5 }}>👤 {u.username}</span>
                    <span className="usuario-meta">{labelGrupo(u.grupo)}</span>
                  </div>
                  <div className="usuario-acoes">
                    <button className="botao botao-verde botao-pequeno" onClick={() => handleAprovar(u)}>
                      ↩ Desbloquear
                    </button>
                    <button className="botao botao-vermelho botao-pequeno" onClick={() => handleExcluir(u)}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
          </SecaoColapsavel>
        )}

        {/* ── Setores permanentes ── */}
        <SecaoColapsavel titulo="Setores">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                type="text"
                value={novoSetor}
                onChange={e => setNovoSetor(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdicionarSetor()}
                placeholder="Nome do novo setor..."
                style={{ flex: 1 }}
              />
              <button className="botao botao-destaque" onClick={handleAdicionarSetor}>
                + Adicionar
              </button>
            </div>

            {setores.length === 0 ? (
              <p className="texto-apagado" style={{ textAlign: 'center', padding: '12px 0' }}>
                Nenhum setor cadastrado.
              </p>
            ) : (
              setores.map(s => (
                <div key={s.id} className="linha-usuario" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="usuario-info">
                      <span className="usuario-nome">🏭 {s.nome}</span>
                      {/* Mostra resumo dos responsáveis cadastrados */}
                      {s.responsaveis && editandoResponsavel !== s.id && (
                        <span className="usuario-meta">
                          {(TURNOS || ['Turno 0','Manhã','Tarde','Noite'])
                            .filter(t => s.responsaveis[t])
                            .map(t => `${t}: ${s.responsaveis[t]}`)
                            .join('  ·  ')
                          }
                        </span>
                      )}
                    </div>
                    <div className="usuario-acoes">
                      <button
                        className="botao botao-pequeno"
                        onClick={() => {
                          setEditandoResponsavel(s.id)
                          setValoresResponsavel(s.responsaveis || {})
                        }}
                      >
                        ✏️ Responsáveis
                      </button>
                      <button className="botao botao-vermelho botao-pequeno" onClick={() => handleRemoverSetor(s)}>
                        🗑
                      </button>
                    </div>
                  </div>
                  {editandoResponsavel === s.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(TURNOS || ['Turno 0','Manhã','Tarde','Noite']).map(t => (
                        <div key={t} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{
                            minWidth: 64, fontSize: 12, color: 'var(--cor-apagado)',
                            fontWeight: 600, textAlign: 'right'
                          }}>{t}</span>
                          <input
                            type="text"
                            value={valoresResponsavel[t] || ''}
                            onChange={e => setValoresResponsavel(v => ({ ...v, [t]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleSalvarResponsavel(s)}
                            placeholder={`Responsável ${t}...`}
                            style={{ flex: 1 }}
                          />
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="botao botao-destaque botao-pequeno" onClick={() => handleSalvarResponsavel(s)}>
                          ✓ Salvar
                        </button>
                        <button className="botao botao-pequeno" onClick={() => setEditandoResponsavel(null)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
        </SecaoColapsavel>

        {/* ── Equipamentos (setor › grupo › máquina › estação) ── */}
        {/* Mesma árvore usada pelo módulo Ronda — editar aqui reflete lá. */}
        <SecaoColapsavel titulo="Equipamentos">
          <div
            className="ronda-modulo"
            style={{ background: 'transparent', height: 480, display: 'flex', flexDirection: 'column' }}
          >
            <PainelHierarquia
              setores={setoresEquip}
              grupos={gruposEquip}
              maquinas={maquinasEquip}
              estacoes={estacoesEquip}
              gerenciar={true}
              bloqueado={true}
              operador=""
              aoSalvarLote={() => {}}
              aoAddSetor={aoAddSetor}
              aoAddGrupo={aoAddGrupo}
              aoAddMaquina={aoAddMaquina}
              aoAddEstacao={aoAddEstacao}
              aoExcluir={aoExcluir}
              aoRenomear={aoRenomear}
              aoMoverGrupo={aoMoverGrupo}
              aoMoverMaquina={aoMoverMaquina}
              aoMudarEstadoSalvar={() => {}}
            />
          </div>
        </SecaoColapsavel>

        {/* ── Relatórios por usuário ── */}
        <SecaoColapsavel titulo="Relatórios por Usuário">
            {(historico || []).length === 0 ? (
              <p className="texto-apagado" style={{ textAlign: 'center', padding: '12px 0' }}>Nenhum relatório no histórico.</p>
            ) : (
              // Agrupa os relatórios por criado_por e renderiza cada grupo
              Object.entries(
                (historico || []).reduce((acc, r) => {
                  const key = r.criado_por || '(desconhecido)'
                  acc[key] = acc[key] || []
                  acc[key].push(r)
                  return acc
                }, {})
              ).map(([usuario, rels]) => (
                <div key={usuario} className="grupo-relatorio-admin">
                  <div className="grupo-titulo-admin">👤 {usuario} — {rels.length} relatório(s)</div>
                  {rels.slice(0, 5).map(r => {
                    const df = r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : '—'
                    const oc = (r.itens || []).filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ').length
                    const at = (r.itens || []).filter(i => i.tipo === 'atividade'  || i.tipo === 'ativ').length
                    return (
                      <div
                        key={r.id}
                        className="linha-relatorio-admin"
                        onClick={() => aoVerRelatorio && aoVerRelatorio(r)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="rel-setor">{r.setor || '—'} — {df}</span>
                        <span className="rel-meta">{r.turno || '?'} · 🔧 {oc} · 📅 {at}</span>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
        </SecaoColapsavel>

      </div>
    </div>
  )
}