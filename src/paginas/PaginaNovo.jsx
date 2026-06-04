import { useState, useEffect } from 'react'
import { bd, TABELA_ABERTOS, TABELA_HISTORICO } from '../utilitarios/supabase'
import BarraStatus      from '../componentes/BarraStatus'
import LinhaItem        from '../componentes/LinhaItem'
import PrevisaoMensagem from '../componentes/PrevisaoMensagem'

export default function PaginaNovo({
  sessao, abertos, status, painel,
  pedir, mostrarAviso, recarregar, aoAbrirWhatsapp,
  atualizarIdentificacao, // função do hook de autenticação
}) {

  // ── Identificação do técnico (preenchida uma vez ao entrar) ───────────────
  // Pré-preenche o nome do técnico com o login do usuário — pode ser alterado depois
  const [tecnico,     setTecnico]     = useState(sessao.tecnico || sessao.login || sessao.nome || '')
  const [responsavel, setResponsavel] = useState(sessao.responsavel || '')
  const [idSalvou,    setIdSalvou]    = useState(!!(sessao.tecnico || sessao.login))  // true se veio do login

  // ── Dados do relatório ────────────────────────────────────────────────────
  const [data,     setData]     = useState(() => new Date().toISOString().split('T')[0])
  const [turno,    setTurno]    = useState(null)
  const [setor,    setSetor]    = useState('')
  const [idSel,    setIdSel]    = useState('')
  const [salvando, setSalvando] = useState(false)

  // Relatório atualmente selecionado no dropdown
  const relatorioAtivo = abertos.find(r => r.id === idSel) || null
  const itens = relatorioAtivo?.itens || []

  // Dados para a prévia da mensagem de texto
  const dadosPrevia = {
    data,
    turno,
    itens,
    setor:       setor || relatorioAtivo?.setor || '',
    tecnico,
    responsavel,
  }

  // Carrega data e turno ao selecionar um relatório existente
  useEffect(() => {
    if (!relatorioAtivo) return
    setData(relatorioAtivo.data || new Date().toISOString().split('T')[0])
    setTurno(relatorioAtivo.turno || null)
    setSetor('')
  }, [idSel])

  // Auto-salva data e turno quando mudam (só se há relatório aberto selecionado)
  useEffect(() => {
    if (!idSel) return
    bd.from(TABELA_ABERTOS)
      .update({ data, turno, updated_at: Date.now() })
      .eq('id', idSel)
      .then(() => {})
  }, [data, turno, idSel])

  // Salva o nome do técnico e responsável na sessão
  function confirmarIdentificacao() {
    if (!tecnico.trim()) {
      mostrarAviso('Informe seu nome.', true)
      return
    }
    atualizarIdentificacao(tecnico.trim(), responsavel.trim())
    setIdSalvou(true)
    mostrarAviso('✓ Identificação salva!')
  }

  // Cria um novo relatório no banco (se ainda não existir um ativo)
  async function garantirRelatorio() {
    if (idSel) return idSel

    const setorFinal = setor.trim()
    if (!setorFinal) {
      mostrarAviso('Informe o setor primeiro.', true)
      return null
    }

    // IMPORTANTE: só envia colunas que existem na tabela do Supabase
    const { data: novo, error } = await bd.from(TABELA_ABERTOS).insert({
      setor:      setorFinal,
      data:       data,
      turno:      turno,
      itens:      [],
      criado_em:  Date.now(),
      criado_por: tecnico || sessao.nome, // nome do técnico ou nome do login
    }).select().single()

    if (error) {
      console.error('Erro Supabase:', error)
      mostrarAviso('Erro ao criar relatório: ' + error.message, true)
      return null
    }

    setIdSel(novo.id)
    recarregar()
    return novo.id
  }

  // Abre o painel para adicionar ocorrência ou atividade
  async function adicionarItem(tipo) {
    if (!idSalvou) {
      mostrarAviso('Informe seu nome antes de adicionar itens.', true)
      return
    }
    const id = await garantirRelatorio()
    if (!id) return
    painel.setIdRelatorio(id)
    painel.abrirNovo(tipo)
  }

  // Abre o painel para editar um item existente
  function editarItem(item, indice) {
    if (!idSel) return
    painel.setIdRelatorio(idSel)
    painel.abrirEditar(item, indice)
  }

  // Remove um item da lista (com confirmação)
  function excluirItem(indice) {
    pedir('Remover este item?', async () => {
      const { data: atual } = await bd.from(TABELA_ABERTOS).select('itens').eq('id', idSel).single()
      const lista = [...(atual?.itens || [])]

      // Remove as fotos do storage antes de excluir o item
      for (const foto of (lista[indice]?.fotos || [])) {
        if (foto.path) await bd.storage.from('fotos').remove([foto.path])
      }

      lista.splice(indice, 1)
      await bd.from(TABELA_ABERTOS).update({ itens: lista, updated_at: Date.now() }).eq('id', idSel)
      mostrarAviso('Item removido.')
      recarregar()
    })
  }

  // Fecha o relatório e move para o histórico
  async function fecharNoHistorico() {
    const setorFinal = setor.trim() || relatorioAtivo?.setor || ''
    if (!setorFinal) { mostrarAviso('Informe o setor.', true); return }

    pedir('Fechar e salvar no Histórico?', async () => {
      setSalvando(true)
      try {
        if (idSel) {
          // Busca os dados completos do relatório aberto
          const { data: r } = await bd.from(TABELA_ABERTOS).select('*').eq('id', idSel).single()
          // Remove da tabela de abertos
          await bd.from(TABELA_ABERTOS).delete().eq('id', idSel)
          // Insere no histórico — SEM a coluna 'id' (Supabase gera automaticamente)
          await bd.from(TABELA_HISTORICO).insert({
            ...r,
            id:          undefined,
            setor:       setorFinal,
            data:        data,
            turno:       turno,
            tecnico:     tecnico     || sessao.nome,
            responsavel: responsavel || '',
            fechado_por: tecnico     || sessao.nome,
            fechado_em:  Date.now(),
          })
        } else {
          // Relatório novo sem itens — salva direto no histórico
          await bd.from(TABELA_HISTORICO).insert({
            setor:       setorFinal,
            data:        data,
            turno:       turno,
            itens:       [],
            criado_em:   Date.now(),
            tecnico:     tecnico     || sessao.nome,
            responsavel: responsavel || '',
            criado_por:  tecnico     || sessao.nome,
            fechado_por: tecnico     || sessao.nome,
            fechado_em:  Date.now(),
          })
        }
        limparFormulario(true)
        mostrarAviso('✓ Salvo no histórico!')
        recarregar()
      } catch (e) {
        mostrarAviso('Erro: ' + e.message, true)
      } finally {
        setSalvando(false)
      }
    })
  }

  // Limpa todos os campos do formulário
  function limparFormulario(silencioso) {
    if (!silencioso && !window.confirm('Limpar formulário?')) return
    setIdSel('')
    setData(new Date().toISOString().split('T')[0])
    setTurno(null)
    setSetor('')
  }

  return (
    <div className="pagina">
      <div className="conteudo">

        {/* Status da conexão com o banco */}
        <BarraStatus status={status} />

        {/* ── CARD DE IDENTIFICAÇÃO ─────────────────────────────────────── */}
        {/* Aparece sempre no topo para o técnico se identificar */}
        <div className="card">
          <div className="card-cabecalho">
            <span className="label-secao">👤 Identificação do Turno</span>
            {/* Mostra um ícone verde quando já foi identificado */}
            {idSalvou && <span style={{ color: 'var(--cor-verde, #2ecc71)', fontSize: 13 }}>✓ Identificado</span>}
          </div>
          <div className="card-corpo">

            <div className="grade-2">
              {/* Nome do técnico — quem está usando o sistema */}
              <div className="campo">
                <label>Seu nome <span style={{ color: '#e05c2a' }}>*</span></label>
                <input
                  type="text"
                  value={tecnico}
                  onChange={e => { setTecnico(e.target.value); setIdSalvou(false) }}
                  placeholder="Ex: Joel, Carlos, Tiago..."
                />
              </div>

              {/* Responsável / líder do turno */}
              <div className="campo">
                <label>Responsável pelo turno</label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={e => { setResponsavel(e.target.value); setIdSalvou(false) }}
                  placeholder="Ex: Jorge e Fabricio"
                />
              </div>
            </div>

            {/* Botão para confirmar — fica desabilitado quando já confirmado */}
            {!idSalvou && (
              <button
                className="botao botao-destaque"
                onClick={confirmarIdentificacao}
                style={{ marginTop: 8 }}
              >
                ✓ Confirmar Identificação
              </button>
            )}

          </div>
        </div>

        {/* ── CARD DO RELATÓRIO ─────────────────────────────────────────── */}
        <div className="card">
          <div className="card-cabecalho">
            <span className="label-secao">Informações do Relatório</span>
          </div>
          <div className="card-corpo">

            {/* Data e Turno lado a lado */}
            <div className="grade-2">
              <div className="campo">
                <label>Data</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
              <div className="campo">
                <label>Turno</label>
                <div className="grupo-botoes">
                  {['Manhã', 'Tarde', 'Noite'].map(t => (
                    <button key={t} type="button"
                      className={`botao-alternancia ${turno === t ? 'selecionado' : ''}`}
                      onClick={() => setTurno(t === turno ? null : t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Setor — dropdown de abertos ou campo livre para novo */}
            <div className="campo">
              <label>Setor</label>
              <div className="linha-setor">
                <select value={idSel} onChange={e => setIdSel(e.target.value)} style={{ flex: 1 }}>
                  <option value="">— Carregar relatório aberto —</option>
                  {abertos.map(r => {
                    const d = r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : ''
                    return (
                      <option key={r.id} value={r.id}>
                        {r.setor} — {d} {r.turno || ''}
                      </option>
                    )
                  })}
                </select>
                <span className="ou">ou</span>
                <input
                  type="text"
                  value={setor}
                  onChange={e => setSetor(e.target.value)}
                  placeholder="Novo setor..."
                  style={{ flex: 1 }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Lista de itens do relatório ativo */}
        {itens.map((item, i) => (
          <LinhaItem key={i} item={item} indice={i} aoEditar={editarItem} aoExcluir={excluirItem} />
        ))}

        {/* Botões para adicionar novos itens */}
        <div className="grade-adicionar">
          <div className="botao-adicionar botao-adicionar-ocorrencia" onClick={() => adicionarItem('ocorrencia')}>
            <span style={{ fontSize: 20 }}>🔧</span>+ Ocorrência
          </div>
          <div className="botao-adicionar botao-adicionar-atividade" onClick={() => adicionarItem('atividade')}>
            <span style={{ fontSize: 20 }}>📅</span>+ Atividade
          </div>
        </div>

        {/* Prévia da mensagem de texto */}
        <PrevisaoMensagem
          relatorio={dadosPrevia}
          aoAbrirWhatsapp={() => aoAbrirWhatsapp(dadosPrevia)}
          mostrarAviso={mostrarAviso}
        />

      </div>

      {/* Barra fixa no rodapé */}
      <div className="barra-rodape">
        <button className="botao" onClick={() => limparFormulario(false)}>↺</button>
        <button
          className="botao botao-destaque"
          onClick={fecharNoHistorico}
          disabled={salvando}
          style={{ flex: 2, justifyContent: 'center' }}
        >
          {salvando ? 'Salvando...' : '💾 Fechar no Histórico'}
        </button>
      </div>

    </div>
  )
}
