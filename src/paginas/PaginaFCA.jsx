// Tela de FCA — manutenção e admin
// Layout dois painéis: lista à direita, detalhe à esquerda

import { useState } from 'react'
import { useFCAs } from '../ganchos/useFCAs'
import FormFCA    from '../componentes/FormFCA'
import CardFCA    from '../componentes/CardFCA'

// Item compacto na lista lateral
function ItemLista({ fca, selecionado, aoSelecionar }) {
  const data = fca.criado_em
    ? new Date(fca.criado_em).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

  return (
    <button
      className={`fca-item-lista ${selecionado ? 'selecionado' : ''}`}
      onClick={aoSelecionar}
    >
      <div className="fca-item-nome">🔧 {fca.equipamento}</div>
      <div className="fca-item-meta">
        <span>{data}</span>
        {fca.validacao_tipo === 'aprovado'  && <span className="fca-dot fca-dot-verde">✅</span>}
        {fca.validacao_tipo === 'reprovado' && <span className="fca-dot fca-dot-vermelho">❌</span>}
        {!fca.validacao_tipo                && <span className="fca-dot fca-dot-cinza">○</span>}
      </div>
    </button>
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
      return (
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
    }
    if (selecionado) {
      // Sincroniza dados atualizados da lista
      const fcaAtual = fcas.find(f => f.id === selecionado.id) || selecionado
      return (
        <CardFCA
          fca={fcaAtual}
          podeEditar={true}
          podeValidar={false}
          aoEditar={f => { setEditando(f); setSelecionado(null) }}
          aoExcluir={handleExcluir}
        />
      )
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

          {fcas.map(fca => (
            <ItemLista
              key={fca.id}
              fca={fca}
              selecionado={selecionado?.id === fca.id}
              aoSelecionar={() => selecionar(fca)}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
