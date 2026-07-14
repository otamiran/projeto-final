// Painel do administrador
// Gerencia usuários (aprovar/bloquear/excluir), setores permanentes e
// acompanha relatórios por usuário

import { useState, useRef } from 'react'
import { useAdmin } from '../ganchos/useAdmin'
import { useSetores } from '../ganchos/useSetores'
import SecaoColapsavel from '../componentes/SecaoColapsavel'

// Formata timestamp em data legível
function formatarData(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('pt-BR')
}

export default function PaginaAdmin({ sessao, historico, pedir, mostrarAviso, aoVerRelatorio, equipamentosGancho = {} }) {
  const {
    pendentes, aprovados, bloqueados,
    aprovar, bloquear, excluir, recarregar,
  } = useAdmin(!!sessao, sessao?.grupo === 'admin')

  const { setores, adicionar: adicionarSetor, remover: removerSetor, atualizarResponsavel, TURNOS } = useSetores(!!sessao)
  const [novoSetor, setNovoSetor] = useState('')
  // Controla qual setor está com os campos de responsável abertos para edição
  const [editandoResponsavel, setEditandoResponsavel] = useState(null)   // id do setor
  const [valoresResponsavel, setValoresResponsavel]   = useState({})     // { turno: nome }

  // ── Equipamentos (tag + nome) — cadastro manual e importação via Excel ────
  const {
    equipamentos = [],
    adicionar: adicionarEquipamento,
    importarLista: importarEquipamentos,
    remover: removerEquipamento,
  } = equipamentosGancho
  const [tagNovoEquip, setTagNovoEquip]   = useState('')
  const [nomeNovoEquip, setNomeNovoEquip] = useState('')
  const [importando, setImportando]       = useState(false)
  const inputExcelRef = useRef()

  // Cadastra um equipamento manualmente
  async function handleAdicionarEquipamento() {
    const resultado = await adicionarEquipamento(tagNovoEquip, nomeNovoEquip)
    if (resultado.error) {
      mostrarAviso(resultado.error, true)
      return
    }
    setTagNovoEquip('')
    setNomeNovoEquip('')
    mostrarAviso('✓ Equipamento cadastrado!')
  }

  // Remove um equipamento (com confirmação)
  function handleRemoverEquipamento(eq) {
    pedir(`Remover o equipamento "${eq.nome}"?`, async () => {
      const resultado = await removerEquipamento(eq.id)
      if (resultado.error) {
        mostrarAviso(resultado.error, true)
        return
      }
      mostrarAviso('Equipamento removido.')
    })
  }

  // Importa uma lista de equipamentos a partir de um arquivo Excel (.xlsx/.xls)
  // Espera colunas "tag" e "nome" (aceita também "equipamento"/"descrição" no lugar de "nome")
  async function handleUploadExcel(evento) {
    const arquivo = evento.target.files[0]
    evento.target.value = '' // permite selecionar o mesmo arquivo de novo depois
    if (!arquivo) return

    setImportando(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await arquivo.arrayBuffer()
      const planilha = XLSX.read(buffer, { type: 'array' })
      const primeiraAba = planilha.SheetNames[0]
      const linhas = XLSX.utils.sheet_to_json(planilha.Sheets[primeiraAba], { defval: '' })

      if (linhas.length === 0) {
        mostrarAviso('A planilha está vazia.', true)
        return
      }

      // Identifica as colunas de tag e nome de forma flexível (não faz diferença maiúsc./minúsc.)
      const colunas = Object.keys(linhas[0])
      const colTag  = colunas.find(c => /^tag$/i.test(c.trim()))
      const colNome = colunas.find(c => /^(nome|equipamento|descri[cç][aã]o)$/i.test(c.trim()))

      if (!colNome) {
        mostrarAviso('Não encontrei uma coluna "nome" (ou "equipamento") na planilha.', true)
        return
      }

      const itens = linhas.map(l => ({
        tag:  colTag ? String(l[colTag] ?? '').trim() : '',
        nome: String(l[colNome] ?? '').trim(),
      }))

      const resultado = await importarEquipamentos(itens)
      if (resultado.error) {
        mostrarAviso(resultado.error, true)
        return
      }

      const partes = [`✓ ${resultado.inseridos} equipamento(s) importado(s)`]
      if (resultado.duplicados) partes.push(`${resultado.duplicados} já existiam`)
      if (resultado.semNome)    partes.push(`${resultado.semNome} sem nome (ignorados)`)
      mostrarAviso(partes.join(' · '))
    } catch (e) {
      mostrarAviso('Erro ao ler a planilha: ' + e.message, true)
    } finally {
      setImportando(false)
    }
  }

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

        {/* ── Equipamentos permanentes (tag + nome) ── */}
        <SecaoColapsavel
          titulo="Equipamentos"
          badge={equipamentos.length > 0 && <span className="nav-badge badge-azul">{equipamentos.length}</span>}
        >

            {/* Cadastro manual: tag + nome */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={tagNovoEquip}
                onChange={e => setTagNovoEquip(e.target.value)}
                placeholder="Tag (opcional, ex: MR6034)"
                style={{ flex: '0 1 160px' }}
              />
              <input
                type="text"
                value={nomeNovoEquip}
                onChange={e => setNomeNovoEquip(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdicionarEquipamento()}
                placeholder="Nome do equipamento..."
                style={{ flex: '1 1 220px' }}
              />
              <button className="botao botao-destaque" onClick={handleAdicionarEquipamento}>
                + Adicionar
              </button>
            </div>

            {/* Importação em massa via planilha Excel */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              background: 'var(--cor-fundo-3)', border: '1px dashed var(--cor-borda-2)',
              borderRadius: 'var(--raio)', padding: '10px 12px', marginBottom: 12,
            }}>
              <button
                className="botao botao-azul"
                onClick={() => inputExcelRef.current.click()}
                disabled={importando}
              >
                {importando ? 'Importando...' : '📥 Importar planilha Excel'}
              </button>
              <span className="texto-apagado" style={{ fontSize: 11 }}>
                Colunas esperadas: <strong>tag</strong> e <strong>nome</strong> (ou "equipamento"). Uma linha por equipamento.
              </span>
              <input
                ref={inputExcelRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleUploadExcel}
              />
            </div>

            {equipamentos.length === 0 ? (
              <p className="texto-apagado" style={{ textAlign: 'center', padding: '12px 0' }}>
                Nenhum equipamento cadastrado.
              </p>
            ) : (
              equipamentos.map(eq => (
                <div key={eq.id} className="linha-usuario">
                  <div className="usuario-info">
                    <span className="usuario-nome">
                      {eq.tag && <span style={{ color: 'var(--ambar)', fontFamily: 'var(--fonte-mono)', fontSize: 12, marginRight: 8 }}>{eq.tag}</span>}
                      {eq.nome}
                    </span>
                  </div>
                  <div className="usuario-acoes">
                    <button className="botao botao-vermelho botao-pequeno" onClick={() => handleRemoverEquipamento(eq)}>
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
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