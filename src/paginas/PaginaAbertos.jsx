// Lista os relatórios que ainda estão sendo preenchidos

import { useState } from 'react'
import { bd, TABELA_ABERTOS, TABELA_HISTORICO } from '../utilitarios/supabase'
import { useSetores } from '../ganchos/useSetores'

const TURNOS = ['Turno 0', 'Manhã', 'Tarde', 'Noite']

export default function PaginaAbertos({ abertos, sessao, aoVer, pedir, mostrarAviso, recarregar, ehAdmin, aoGerarPDF }) {
  const { setores } = useSetores(ehAdmin)

  // ── corrigir setor/turno/data de um relatório já aberto (só admin) ──
  // Existe pra consertar um relatório aberto no setor/turno errado por
  // engano, sem precisar apagar e recomeçar do zero.
  const [editando, setEditando]   = useState(null)   // relatório sendo editado
  const [setorEdit, setSetorEdit] = useState('')
  const [turnoEdit, setTurnoEdit] = useState('')
  const [dataEdit, setDataEdit]   = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  function abrirEdicao(r) {
    setEditando(r)
    setSetorEdit(r.setor || '')
    setTurnoEdit(r.turno || '')
    setDataEdit(r.data || '')
  }

  async function salvarEdicao() {
    if (!editando) return
    if (!setorEdit || !turnoEdit || !dataEdit) {
      mostrarAviso('Preencha setor, turno e data.', true)
      return
    }
    // Evita criar sem querer uma duplicata de outro relatório já aberto
    const conflito = abertos.find(r =>
      r.id !== editando.id && r.setor === setorEdit && r.turno === turnoEdit && r.data === dataEdit
    )
    if (conflito) {
      mostrarAviso('Já existe outro relatório aberto para esse setor, turno e data. Use "Unificar relatórios" se quiser juntá-los.', true)
      return
    }
    setSalvandoEdit(true)
    const { error } = await bd.from(TABELA_ABERTOS)
      .update({ setor: setorEdit, turno: turnoEdit, data: dataEdit, updated_at: Date.now() })
      .eq('id', editando.id)
    setSalvandoEdit(false)
    if (error) {
      mostrarAviso('Erro ao corrigir: ' + error.message, true)
      return
    }
    mostrarAviso('✓ Relatório corrigido!')
    setEditando(null)
    recarregar()
  }

  // ── unificar relatórios abertos manualmente (só admin) ──────────────
  // Complementa a mescla automática de duplicatas (mesmo setor/turno/dia):
  // aqui o admin escolhe à mão quaisquer relatórios abertos pra juntar —
  // útil, por ex., quando dois relatórios foram abertos com pequenas
  // diferenças (setor digitado diferente) e o admin já sabe que são o
  // mesmo turno.
  const [unificando, setUnificando]     = useState(false)
  const [selecionados, setSelecionados] = useState([])   // ids marcados
  const [salvandoUnif, setSalvandoUnif] = useState(false)

  function alternarSelecionado(id) {
    setSelecionados(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id])
  }

  async function confirmarUnificacao() {
    if (selecionados.length < 2) {
      mostrarAviso('Selecione pelo menos 2 relatórios para unificar.', true)
      return
    }
    const escolhidos = abertos.filter(r => selecionados.includes(r.id))
    // o mais antigo vira o principal — os demais são fundidos nele e apagados
    const ordenados = [...escolhidos].sort((a, b) => (a.criado_em || 0) - (b.criado_em || 0))
    const [principal, ...outros] = ordenados

    setSalvandoUnif(true)
    try {
      const itensUnidos = [...(principal.itens || [])]
      for (const outro of outros) itensUnidos.push(...(outro.itens || []))

      const { error } = await bd.from(TABELA_ABERTOS)
        .update({ itens: itensUnidos, updated_at: Date.now() })
        .eq('id', principal.id)
      if (error) throw error

      for (const outro of outros) {
        await bd.from(TABELA_ABERTOS).delete().eq('id', outro.id)
      }

      mostrarAviso(`✓ ${escolhidos.length} relatórios unidos em um só!`)
      setUnificando(false)
      setSelecionados([])
      recarregar()
    } catch (e) {
      mostrarAviso('Erro ao unificar: ' + e.message, true)
    } finally {
      setSalvandoUnif(false)
    }
  }

  // Fecha o relatório e move para o histórico
  function fechar(relatorio) {
    pedir('Mover este relatório para o Histórico?', async () => {
      await bd.from(TABELA_ABERTOS).delete().eq('id', relatorio.id)
      await bd.from(TABELA_HISTORICO).insert({
        ...relatorio,
        id: undefined,
        fechado_por: sessao.nome,
        fechado_em: Date.now(),
      })
      mostrarAviso('Fechado e salvo no histórico!')
      recarregar()
    })
  }

  // Exclui permanentemente um relatório aberto (só admin)
  function excluir(id) {
    if (!ehAdmin) {
      mostrarAviso('Só o administrador pode excluir.', true)
      return
    }
    pedir('Excluir este relatório aberto?', async () => {
      await bd.from(TABELA_ABERTOS).delete().eq('id', id)
      mostrarAviso('Excluído.')
      recarregar()
    })
  }

  // Lista vazia
  if (!abertos.length)
    return (
      <div className="pagina">
        <div className="conteudo">
          <div className="vazio">
            <div className="icone-vazio">◉</div>
            <p>Nenhum relatório aberto.</p>
            <p>Preencha a aba Novo — salvo automaticamente.</p>
          </div>
        </div>
      </div>
    )

  return (
    <div className="pagina">
      <div className="conteudo">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <p className="label-pagina" style={{ margin: 0 }}>Relatórios em preenchimento — contribua ou feche</p>
          {ehAdmin && abertos.length >= 2 && (
            <button className="botao botao-azul botao-pequeno" onClick={() => { setUnificando(true); setSelecionados([]) }}>
              🔗 Unificar relatórios
            </button>
          )}
        </div>

        {/* Um card para cada relatório aberto */}
        {abertos.map(r => {
          const dataFormatada = r.data
            ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR')
            : 'Sem data'
          const qtdOcorrencias = (r.itens || []).filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ').length
          const qtdAtividades = (r.itens || []).filter(i => i.tipo === 'atividade'  || i.tipo === 'ativ').length

          return (
            <div key={r.id} className="card-aberto">
              {/* Cabeçalho do card */}
              <div className="card-aberto-cabecalho">
                <div>
                  <div className="card-aberto-setor">{r.setor || 'Sem setor'}</div>
                  <div className="card-aberto-meta">
                    {dataFormatada} · {r.turno || '?'} · por {r.criado_por || '—'}
                  </div>
                </div>
                {/* Tags de contagem */}
                <div className="tags">
                  {qtdOcorrencias > 0 && (
                    <span className="tag tag-ocorrencia">🔧 {qtdOcorrencias}</span>
                  )}
                  {qtdAtividades > 0 && (
                    <span className="tag tag-atividade">📅 {qtdAtividades}</span>
                  )}
                </div>
              </div>

              {/* Preview dos primeiros 3 itens */}
              {(r.itens || []).slice(0, 3).length > 0 && (
                <div className="card-aberto-itens">
                  {(r.itens || []).slice(0, 3).map((item, i) => (
                    <div
                      key={i}
                      className={`linha-item tipo-${item.tipo}`}
                      style={{ background: 'var(--cor-fundo-3)' }}
                    >
                      <span
                        className={`badge-tipo ${item.tipo === 'ocorrencia' || item.tipo === 'occ' ? 'badge-ocorrencia' : 'badge-atividade'}`}
                      >
                        {item.tipo === 'ocorrencia' || item.tipo === 'occ' ? '🔧' : '📅'}
                      </span>
                      <div className="item-texto">
                        <strong>{item.equipamento || item.equip || '—'}</strong>
                        <span>{item.tipo === 'ocorrencia' || item.tipo === 'occ' ? item.sintoma : item.descricao}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botões de ação */}
              <div className="card-aberto-acoes">
                <button className="botao botao-verde" onClick={() => aoVer(r)}>
                  👁 Ver
                </button>
                {aoGerarPDF && (
                  <button className="botao botao-pdf" onClick={() => aoGerarPDF(r)}>
                    📄 PDF
                  </button>
                )}
                {ehAdmin && (
                  <button className="botao botao-azul" onClick={() => abrirEdicao(r)}>
                    ✏️ Corrigir setor/turno
                  </button>
                )}
                {ehAdmin && (
                  <button className="botao botao-destaque" onClick={() => fechar(r)}>
                    ✓ Fechar
                  </button>
                )}
                {ehAdmin && (
                  <button className="botao botao-vermelho" onClick={() => excluir(r.id)}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modal: corrigir setor/turno/data ── */}
      {editando && (
        <div className="fundo-modal" onClick={e => e.target === e.currentTarget && setEditando(null)}>
          <div className="modal">
            <div className="modal-cabecalho">
              <h2>Corrigir relatório</h2>
              <button className="botao-fechar-modal" onClick={() => setEditando(null)}>✕</button>
            </div>
            <div className="modal-corpo">
              <div className="campo">
                <label>Setor</label>
                <select value={setorEdit} onChange={e => setSetorEdit(e.target.value)}>
                  <option value="">— Selecione o setor —</option>
                  {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                </select>
              </div>
              <div className="campo">
                <label>Turno</label>
                <div className="grupo-botoes">
                  {TURNOS.map(t => (
                    <button
                      key={t} type="button"
                      className={`botao-alternancia ${turnoEdit === t ? 'selecionado' : ''}`}
                      onClick={() => setTurnoEdit(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="campo">
                <label>Data</label>
                <input type="date" value={dataEdit} onChange={e => setDataEdit(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6 }}>
                <button className="botao botao-destaque" onClick={salvarEdicao} disabled={salvandoEdit}>
                  {salvandoEdit ? 'Salvando…' : '✓ Salvar correção'}
                </button>
                <button className="botao" onClick={() => setEditando(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: unificar relatórios manualmente ── */}
      {unificando && (
        <div className="fundo-modal" onClick={e => e.target === e.currentTarget && setUnificando(false)}>
          <div className="modal modal-grande">
            <div className="modal-cabecalho">
              <h2>Unificar relatórios</h2>
              <button className="botao-fechar-modal" onClick={() => setUnificando(false)}>✕</button>
            </div>
            <div className="modal-corpo">
              <p className="texto-apagado" style={{ fontSize: 12 }}>
                Selecione 2 ou mais relatórios para juntar em um só. Os itens de todos são somados no relatório
                mais antigo do grupo escolhido; os demais são apagados. Esta ação não pode ser desfeita.
              </p>
              {abertos.map(r => {
                const dataFormatada = r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : 'Sem data'
                const marcado = selecionados.includes(r.id)
                return (
                  <label
                    key={r.id}
                    className="linha-usuario"
                    style={{ cursor: 'pointer', border: marcado ? '1px solid var(--ambar)' : undefined }}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternarSelecionado(r.id)}
                      style={{ marginRight: 10 }}
                    />
                    <div className="usuario-info">
                      <span className="usuario-nome">{r.setor || 'Sem setor'}</span>
                      <span className="usuario-meta">{dataFormatada} · {r.turno || '?'} · {(r.itens || []).length} item(ns) · por {r.criado_por || '—'}</span>
                    </div>
                  </label>
                )
              })}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6 }}>
                <button className="botao botao-destaque" onClick={confirmarUnificacao} disabled={salvandoUnif || selecionados.length < 2}>
                  {salvandoUnif ? 'Unindo…' : `🔗 Unificar (${selecionados.length})`}
                </button>
                <button className="botao" onClick={() => setUnificando(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
