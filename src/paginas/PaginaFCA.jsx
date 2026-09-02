// Tela de FCA — manutenção e admin
// Layout dois painéis: lista à direita, detalhe à esquerda

import { useState, useMemo } from 'react'
import { useFCAs } from '../ganchos/useFCAs'
import FormFCA               from '../componentes/FormFCA'
import CardFCA                from '../componentes/CardFCA'
import VisualizarOcorrencia   from '../componentes/VisualizarOcorrencia'
import { agruparFCAsPorDia }  from '../utilitarios/agruparFcasPorDia'

// Item compacto na lista lateral
function ItemLista({ fca, selecionado, aoSelecionar }) {
  const hora = fca.criado_em
    ? new Date(fca.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <button
      className={`fca-item-lista ${selecionado ? 'selecionado' : ''}`}
      onClick={aoSelecionar}
    >
      <div className="fca-item-nome">🔧 {fca.equipamento}</div>
      <div className="fca-item-meta">
        <span>
          {hora}
          {/* Indica que este FCA nasceu automaticamente de uma ocorrência */}
          {fca.ocorrencia_origem && <span className="fca-tag-auto" title="Gerado a partir de uma ocorrência"> ⚡ ocorrência</span>}
        </span>
        {fca.validacao_tipo === 'aprovado'  && <span className="fca-dot fca-dot-verde">✅</span>}
        {fca.validacao_tipo === 'reprovado' && <span className="fca-dot fca-dot-vermelho">❌</span>}
        {!fca.validacao_tipo                && <span className="fca-dot fca-dot-cinza">○</span>}
      </div>
    </button>
  )
}

// Grupo colapsável de FCAs de um mesmo dia, na lista lateral
function GrupoDia({ grupo, aberto, aoAlternar, selecionado, aoSelecionar, criterioPendente }) {
  const pendentes = grupo.itens.filter(criterioPendente).length

  return (
    <div className="fca-grupo-dia">
      <button className="fca-grupo-dia-cabecalho" onClick={aoAlternar}>
        <span className="fca-grupo-dia-seta" style={{ transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        <span className="fca-grupo-dia-titulo">{grupo.rotulo}</span>
        <span className="fca-grupo-dia-badges">
          {pendentes > 0 && <span className="fca-grupo-dia-badge fca-grupo-dia-badge-pendente">{pendentes} pendente{pendentes > 1 ? 's' : ''}</span>}
          <span className="fca-grupo-dia-badge">{grupo.itens.length}</span>
        </span>
      </button>
      {aberto && (
        <div className="fca-grupo-dia-corpo">
          {grupo.itens.map(fca => (
            <ItemLista
              key={fca.id}
              fca={fca}
              selecionado={selecionado?.id === fca.id}
              aoSelecionar={() => aoSelecionar(fca)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PaginaFCA({ sessao, pedir, mostrarAviso }) {
  const autor = sessao?.login || sessao?.nome || '—'
  const { fcas, carregando, criar, atualizar, excluir } = useFCAs(!!sessao)

  const [selecionado, setSelecionado] = useState(null)  // fca selecionado na lista
  const [criando, setCriando]         = useState(false) // mostra form de criação
  const [editando, setEditando]       = useState(null)  // fca sendo editado
  const [salvando, setSalvando]       = useState(false)
  // mobile: mostra detalhe ou lista
  const [mostraDetalhe, setMostraDetalhe] = useState(false)

  // Agrupamento por dia (colapsável) — grupo mais recente começa aberto
  const grupos = useMemo(() => agruparFCAsPorDia(fcas), [fcas])
  const [gruposAbertos, setGruposAbertos] = useState({})
  function grupoEstaAberto(chave, indice) {
    if (chave in gruposAbertos) return gruposAbertos[chave]
    return indice === 0 // primeiro grupo (mais recente) começa aberto por padrão
  }
  function alternarGrupo(chave, indice) {
    setGruposAbertos(g => ({ ...g, [chave]: !grupoEstaAberto(chave, indice) }))
  }

  // Ao selecionar item da lista — abre o detalhe
  function selecionar(fca) {
    setSelecionado(fca)
    setCriando(false)
    setEditando(null)
    setMostraDetalhe(true)
  }

  // Novo FCA
  function abrirNovo() {
    setSelecionado(null)
    setEditando(null)
    setCriando(true)
    setMostraDetalhe(true)
  }

  async function handleCriar(dados) {
    setSalvando(true)
    const res = await criar(dados, autor)
    setSalvando(false)
    if (!res.ok) { mostrarAviso('Erro: ' + res.erro); return }
    setCriando(false)
    mostrarAviso('✓ FCA salvo!')
  }

  async function handleAtualizar(dados) {
    setSalvando(true)
    const res = await atualizar(editando.id, dados)
    setSalvando(false)
    if (!res.ok) { mostrarAviso('Erro: ' + res.erro); return }
    // Atualiza o selecionado com os novos dados
    setSelecionado({ ...editando, ...dados })
    setEditando(null)
    mostrarAviso('✓ FCA atualizado!')
  }

  function handleExcluir(id) {
    pedir('Excluir este FCA?', async () => {
      await excluir(id)
      setSelecionado(null)
      setMostraDetalhe(false)
      mostrarAviso('FCA excluído.')
    })
  }

  // Conteúdo do painel esquerdo (detalhe)
  function renderDetalhe() {
    if (criando) {
      return (
        <div className="card">
          <div className="card-cabecalho">
            <span className="card-rotulo">Novo FCA</span>
            <button className="botao-fechar-modal" onClick={() => { setCriando(false); setMostraDetalhe(false) }}>✕</button>
          </div>
          <div className="card-corpo">
            <FormFCA aoSalvar={handleCriar} aoFechar={() => { setCriando(false); setMostraDetalhe(false) }} salvando={salvando} />
          </div>
        </div>
      )
    }
    if (editando) {
      const formFCA = (
        <div className="card">
          <div className="card-cabecalho">
            <span className="card-rotulo">Editando — {editando.equipamento}</span>
            <button className="botao-fechar-modal" onClick={() => setEditando(null)}>✕</button>
          </div>
          <div className="card-corpo">
            <FormFCA inicial={editando} aoSalvar={handleAtualizar} aoFechar={() => setEditando(null)} salvando={salvando} />
          </div>
        </div>
      )
      // Ocorrência de origem lado a lado, quando este FCA foi gerado automaticamente
      if (editando.ocorrencia_origem) {
        return (
          <div className="fca-duplo">
            {formFCA}
            <VisualizarOcorrencia ocorrencia={editando.ocorrencia_origem} />
          </div>
        )
      }
      return formFCA
    }
    if (selecionado) {
      // Sincroniza dados atualizados da lista
      const fcaAtual = fcas.find(f => f.id === selecionado.id) || selecionado
      const cartaoFca = (
        <CardFCA
          fca={fcaAtual}
          podeEditar={true}
          podeValidar={false}
          aoEditar={f => { setEditando(f); setSelecionado(null) }}
          aoExcluir={handleExcluir}
          mostrarAviso={mostrarAviso}
        />
      )
      // FCA a preencher (esquerda) + ocorrência que o originou (direita)
      if (fcaAtual.ocorrencia_origem) {
        return (
          <div className="fca-duplo">
            {cartaoFca}
            <VisualizarOcorrencia ocorrencia={fcaAtual.ocorrencia_origem} />
          </div>
        )
      }
      return cartaoFca
    }
    // Nenhum selecionado
    return (
      <div className="fca-vazio-detalhe">
        <div className="vazio-icone">📋</div>
        <p>Selecione um FCA na lista ou crie um novo.</p>
        <button className="botao botao-destaque" onClick={abrirNovo}>+ Novo FCA</button>
      </div>
    )
  }

  return (
    <div className="pagina">
      <div className="fca-layout">

        {/* ── Painel esquerdo — detalhe ── */}
        <div className={`fca-painel-detalhe ${mostraDetalhe ? 'visivel-mobile' : ''}`}>
          {/* Botão voltar no mobile */}
          <button className="fca-btn-voltar" onClick={() => setMostraDetalhe(false)}>
            ← Voltar à lista
          </button>
          {renderDetalhe()}
        </div>

        {/* ── Painel direito — lista ── */}
        <div className={`fca-painel-lista ${mostraDetalhe ? 'oculto-mobile' : ''}`}>
          <div className="fca-lista-header">
            <span className="fca-lista-titulo">FCAs registrados</span>
            <button className="botao botao-destaque botao-pequeno" onClick={abrirNovo}>+ Novo</button>
          </div>

          {carregando && <p className="texto-apagado" style={{ padding: 12, textAlign: 'center' }}>Carregando...</p>}

          {!carregando && fcas.length === 0 && (
            <p className="texto-apagado" style={{ padding: 12, textAlign: 'center' }}>Nenhum FCA ainda.</p>
          )}

          {grupos.map((grupo, indice) => (
            <GrupoDia
              key={grupo.chave}
              grupo={grupo}
              aberto={grupoEstaAberto(grupo.chave, indice)}
              aoAlternar={() => alternarGrupo(grupo.chave, indice)}
              selecionado={selecionado}
              aoSelecionar={selecionar}
              criterioPendente={f => f.preenchido === false}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
