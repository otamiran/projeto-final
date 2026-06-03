// Painel do administrador
// Gerencia usuários (aprovar/bloquear/excluir) e acompanha relatórios por usuário

import { useAdmin } from '../ganchos/useAdmin'

// Formata timestamp em data legível
function formatarData(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('pt-BR')
}

export default function PaginaAdmin({ sessao, historico, pedir, mostrarAviso, aoVerRelatorio }) {
  const {
    pendentes, aprovados, bloqueados,
    aprovar, bloquear, excluir, recarregar,
  } = useAdmin(!!sessao, sessao?.grupo === 'admin')

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

  // Exclusão permanente
  function handleExcluir(u) {
    pedir(`Excluir permanentemente "${u.username}"? Esta ação não pode ser desfeita.`, async () => {
      await excluir(u.id)
      mostrarAviso('Usuário excluído.')
    })
  }

  // Label do grupo para exibição
  const labelGrupo = g => ({ manutencao: '🔧 Manutenção', producao: '🏭 Produção', admin: '👑 Admin' })[g] || g

  return (
    <div className="pagina">
      <div className="container">

        {/* ── Pendentes (destaque no topo) ── */}
        <div className="card">
          <div className="card-cabecalho">
            <span className="card-rotulo">Aguardando Aprovação</span>
            {pendentes.length > 0 && (
              <span className="nav-badge badge-vermelho">{pendentes.length}</span>
            )}
          </div>
          <div className="card-corpo">
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
          </div>
        </div>

        {/* ── Usuários aprovados ── */}
        <div className="card">
          <div className="card-cabecalho">
            <span className="card-rotulo">Usuários Ativos</span>
          </div>
          <div className="card-corpo">
            {aprovados.length === 0 ? (
              <p className="texto-apagado" style={{ textAlign: 'center', padding: '12px 0' }}>Nenhum usuário cadastrado.</p>
            ) : (
              aprovados.map(u => {
                // Quantidade de relatórios fechados por esse usuário
                const qtd = (historico || []).filter(r => r.criado_por === u.username).length
                return (
                  <div key={u.id} className="linha-usuario">
                    <div className="usuario-info">
                      <span className="usuario-nome">👤 {u.username}</span>
                      <span className="usuario-meta">
                        {labelGrupo(u.grupo)} · {qtd} relatório(s) · último acesso: {formatarData(u.ultimo_acesso)}
                      </span>
                    </div>
                    <div className="usuario-acoes">
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
          </div>
        </div>

        {/* ── Usuários bloqueados ── */}
        {bloqueados.length > 0 && (
          <div className="card">
            <div className="card-cabecalho">
              <span className="card-rotulo">Bloqueados</span>
            </div>
            <div className="card-corpo">
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
            </div>
          </div>
        )}

        {/* ── Relatórios por usuário ── */}
        <div className="card">
          <div className="card-cabecalho">
            <span className="card-rotulo">Relatórios por Usuário</span>
          </div>
          <div className="card-corpo">
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
          </div>
        </div>

      </div>
    </div>
  )
}
