import { useState, useEffect } from 'react'
import { bd, TABELA_ABERTOS, TABELA_HISTORICO } from '../utilitarios/supabase'
import { useSetores } from '../ganchos/useSetores'
import BarraStatus      from '../componentes/BarraStatus'
import LinhaItem        from '../componentes/LinhaItem'

export default function PaginaNovo({
  sessao, abertos, status, painel,
  pedir, mostrarAviso, recarregar,
  atualizarIdentificacao, // função do hook de autenticação
  ehAdmin, // true apenas para o grupo "admin" — controla quem pode fechar no histórico
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
  const [titulo,   setTitulo]   = useState('Passagem de Turno')
  const [idSel,    setIdSel]    = useState('')
  const [salvando, setSalvando] = useState(false)

  // Lista permanente de setores cadastrados (gerenciada em Admin)
  const { setores } = useSetores(!!sessao)

  // Relatório atualmente selecionado no dropdown
  const relatorioAtivo = abertos.find(r => r.id === idSel) || null
  const itens = relatorioAtivo?.itens || []

  // Carrega data e turno ao selecionar um relatório existente
  useEffect(() => {
    if (!relatorioAtivo) return
    setData(relatorioAtivo.data || new Date().toISOString().split('T')[0])
    setTurno(relatorioAtivo.turno || null)
    setTitulo(relatorioAtivo.titulo || 'Passagem de Turno')
    setSetor(relatorioAtivo.setor || '')
  }, [idSel])

  // ── Um relatório por setor + turno + DATA ──────────────────────────────────
  // Sempre que o setor, turno ou data mudarem, verifica se já existe um
  // relatório ABERTO para essa combinação exata e, se existir, carrega ele
  // automaticamente — evitando que cada pessoa crie um relatório duplicado
  // para o mesmo setor/turno/dia.
  // IMPORTANTE: a data entra na comparação de propósito — um relatório aberto
  // de um dia anterior (esquecido, não fechado) NUNCA deve ser reaproveitado
  // automaticamente aqui, senão as ocorrências/atividades de ontem apareceriam
  // junto com as de hoje. Para continuar um relatório antigo, use o campo
  // "Carregar outro relatório aberto" manualmente.
  useEffect(() => {
    if (!setor || !turno || !data) return

    const existente = abertos.find(r => r.setor === setor && r.turno === turno && r.data === data)

    if (existente) {
      if (existente.id !== idSel) setIdSel(existente.id)
    } else if (idSel && relatorioAtivo &&
      (relatorioAtivo.setor !== setor || relatorioAtivo.turno !== turno || relatorioAtivo.data !== data)) {
      // O relatório carregado não corresponde mais ao setor/turno/data selecionados
      setIdSel('')
    }
  }, [setor, turno, data, abertos])

  // Pré-preenche o responsável com o valor do setor+turno cadastrado pelo admin
  useEffect(() => {
    if (!setor) return
    const setorObj = setores.find(s => s.nome === setor)
    if (!setorObj) return
    // Tenta pegar o responsável específico do turno selecionado;
    // se não houver, limpa o campo para o técnico preencher manualmente.
    const resp = turno ? setorObj.responsaveis?.[turno] : null
    if (resp) setResponsavel(resp)
  }, [setor, turno, setores])

  // Auto-salva data, turno, título e responsável quando mudam (só se há relatório aberto selecionado)
  useEffect(() => {
    if (!idSel) return
    bd.from(TABELA_ABERTOS)
      .update({ data, turno, titulo, responsavel, tecnico, updated_at: Date.now() })
      .eq('id', idSel)
      .then(() => {})
  }, [data, turno, titulo, responsavel, tecnico, idSel])

  // Salva o nome do técnico e responsável na sessão
  function confirmarIdentificacao() {
    if (!tecnico.trim()) {
      mostrarAviso('Informe seu nome.', true)
      return
    }
    if (!responsavel.trim()) {
      mostrarAviso('Informe o responsável pelo turno.', true)
      return
    }
    atualizarIdentificacao(tecnico.trim(), responsavel.trim())
    setIdSalvou(true)
    mostrarAviso('✓ Identificação salva!')
  }

  // Cria um novo relatório (setor + turno + data) ou reaproveita um já aberto.
  // Robusto contra condição de corrida: se dois cliques/usuários tentarem criar
  // o mesmo relatório ao mesmo tempo, o banco rejeita o segundo insert (restrição
  // única em setor+turno+data — ver instrução SQL) e aqui buscamos o registro que
  // já foi criado, evitando duplicidade sem mostrar erro para o usuário.
  async function obterOuCriarRelatorio(setorFinal, turnoFinal, dataFinal) {
    // 1) Checagem rápida local (evita ida ao banco na maioria dos casos)
    const existenteLocal = abertos.find(r => r.setor === setorFinal && r.turno === turnoFinal && r.data === dataFinal)
    if (existenteLocal) return existenteLocal.id

    // 2) Tenta criar
    const { data: novo, error } = await bd.from(TABELA_ABERTOS).insert({
      setor:       setorFinal,
      data:        dataFinal,
      turno:       turnoFinal,
      titulo:      titulo || 'Passagem de Turno',
      itens:       [],
      criado_em:   Date.now(),
      criado_por:  tecnico     || sessao.nome,
      tecnico:     tecnico     || sessao.nome,
      responsavel: responsavel || '',
    }).select().single()

    if (!error) {
      recarregar()
      return novo.id
    }

    // 3) Violação da restrição única (23505) = alguém criou ao mesmo tempo.
    //    Busca o relatório que já existe em vez de mostrar erro para o usuário.
    if (error.code === '23505') {
      const { data: jaExiste } = await bd.from(TABELA_ABERTOS)
        .select('*')
        .eq('setor', setorFinal).eq('turno', turnoFinal).eq('data', dataFinal)
        .maybeSingle()
      if (jaExiste) {
        recarregar()
        return jaExiste.id
      }
    }

    console.error('Erro Supabase:', error)
    mostrarAviso('Erro ao criar relatório: ' + error.message, true)
    return null
  }

  // Cria um novo relatório no banco (se ainda não existir um ativo)
  async function garantirRelatorio() {
    if (idSel) return idSel

    const setorFinal = setor.trim()
    if (!setorFinal) {
      mostrarAviso('Selecione o setor primeiro.', true)
      return null
    }
    if (!turno) {
      mostrarAviso('Selecione o turno primeiro.', true)
      return null
    }

    const id = await obterOuCriarRelatorio(setorFinal, turno, data)
    if (id) setIdSel(id)
    return id
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

  // Remove um item da lista (com confirmação) — só admin, para evitar que um
  // usuário exclua acidentalmente a ocorrência/atividade lançada por outro
  function excluirItem(indice) {
    if (!ehAdmin) {
      mostrarAviso('Só o administrador pode excluir itens já lançados.', true)
      return
    }
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
            titulo:      titulo || 'Passagem de Turno',
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
            titulo:      titulo || 'Passagem de Turno',
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
    setTitulo('Passagem de Turno')
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
                <label>Responsável pelo turno <span style={{ color: '#e05c2a' }}>*</span></label>
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

            {/* Título do relatório — editável, padrão "Passagem de Turno" */}
            <div className="campo">
              <label>Título do Relatório</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Passagem de Turno, Relatório de Parada..."
              />
            </div>

            {/* Data e Turno lado a lado */}
            <div className="grade-2">
              <div className="campo">
                <label>Data</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
              <div className="campo">
                <label>Turno</label>
                <div className="grupo-botoes">
                  {['Turno 0', 'Manhã', 'Tarde', 'Noite'].map(t => (
                    <button key={t} type="button"
                      className={`botao-alternancia ${turno === t ? 'selecionado' : ''}`}
                      onClick={() => setTurno(t === turno ? null : t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Setor — escolhido a partir da lista permanente cadastrada em Admin */}
            <div className="campo">
              <label>Setor</label>
              <select value={setor} onChange={e => setSetor(e.target.value)}>
                <option value="">— Selecione o setor —</option>
                {setores.map(s => (
                  <option key={s.id} value={s.nome}>{s.nome}</option>
                ))}
              </select>
              {setores.length === 0 && (
                <span className="texto-apagado" style={{ fontSize: 11 }}>
                  Nenhum setor cadastrado. Peça a um administrador para cadastrar em Admin → Setores.
                </span>
              )}
            </div>

            {/* Carregar outro relatório aberto (de outro setor/turno), se necessário */}
            {abertos.length > 0 && (
              <div className="campo">
                <label>Carregar outro relatório aberto (opcional)</label>
                <select value={idSel} onChange={e => setIdSel(e.target.value)}>
                  <option value="">— Nenhum —</option>
                  {abertos.map(r => {
                    const d = r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : ''
                    return (
                      <option key={r.id} value={r.id}>
                        {r.setor} — {d} {r.turno || ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

          </div>
        </div>

        {/* Lista de itens do relatório ativo */}
        {itens.map((item, i) => (
          <LinhaItem
            key={i} item={item} indice={i}
            aoEditar={editarItem} aoExcluir={excluirItem}
            podeExcluir={ehAdmin}
          />
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

      </div>

      {/* Barra fixa no rodapé */}
      <div className="barra-rodape">
        <button className="botao" onClick={() => limparFormulario(false)}>↺</button>
        {/* Cria relatório em branco com turno e nome já preenchidos */}
        <button
          className="botao botao-azul"
          title="Cria um relatório em branco já com turno e nome preenchidos"
          onClick={async () => {
            if (!idSalvou) { mostrarAviso('Confirme sua identificação primeiro.', true); return }
            if (!turno)    { mostrarAviso('Selecione o turno antes de criar o relatório.', true); return }
            const setorFinal = setor.trim()
            if (!setorFinal) { mostrarAviso('Selecione o setor antes de criar o relatório.', true); return }

            const jaAberto = abertos.some(r => r.setor === setorFinal && r.turno === turno && r.data === data)

            const id = await obterOuCriarRelatorio(setorFinal, turno, data)
            if (!id) return

            setIdSel(id)
            mostrarAviso(jaAberto
              ? 'Já existe um relatório aberto para esse setor/turno/dia — selecionado.'
              : '✓ Relatório em branco criado e selecionado!')
          }}
        >
          📋 Novo em Branco
        </button>
        {ehAdmin && (
          <button
            className="botao botao-destaque"
            onClick={fecharNoHistorico}
            disabled={salvando}
            style={{ flex: 2, justifyContent: 'center' }}
          >
            {salvando ? 'Salvando...' : '💾 Fechar no Histórico'}
          </button>
        )}
      </div>

    </div>
  )
}