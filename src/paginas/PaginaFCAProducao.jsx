// Tela de FCA para produção — visualização + aprovação
// Layout dois painéis: lista à direita, detalhe à esquerda

import { useState, useMemo } from 'react'
import { useFCAs } from '../ganchos/useFCAs'
import CardFCA               from '../componentes/CardFCA'
import VisualizarOcorrencia  from '../componentes/VisualizarOcorrencia'
import { agruparFCAsPorDia } from '../utilitarios/agruparFcasPorDia'

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

export default function PaginaFCAProducao({ sessao, mostrarAviso }) {
  const autor = sessao?.login || sessao?.nome || 'Produção'
  const { fcas, carregando, validar } = useFCAs(!!sessao)
  const [selecionado, setSelecionado] = useState(null)
  const [mostraDetalhe, setMostraDetalhe] = useState(false)

  // Agrupamento por dia (colapsável) — grupo mais recente começa aberto
  const grupos = useMemo(() => agruparFCAsPorDia(fcas), [fcas])
  const [gruposAbertos, setGruposAbertos] = useState({})
  function grupoEstaAberto(chave, indice) {
    if (chave in gruposAbertos) return gruposAbertos[chave]
    return indice === 0
  }
  function alternarGrupo(chave, indice) {
    setGruposAbertos(g => ({ ...g, [chave]: !grupoEstaAberto(chave, indice) }))
  }

  function selecionar(fca) {
    setSelecionado(fca)
    setMostraDetalhe(true)
  }

  async function handleValidar(id, tipo, quem) {
    await validar(id, tipo, quem)
    mostrarAviso(tipo === 'aprovado' ? '✅ FCA aprovado!' : '❌ FCA reprovado.')
  }

  return (
    <div className="pagina">
      <div className="fca-layout">

        {/* Painel esquerdo — detalhe */}
        <div className={`fca-painel-detalhe ${mostraDetalhe ? 'visivel-mobile' : ''}`}>
          <button className="fca-btn-voltar" onClick={() => setMostraDetalhe(false)}>
            ← Voltar à lista
          </button>
          {selecionado ? (() => {
            const fcaAtual = fcas.find(f => f.id === selecionado.id) || selecionado
            const cartaoFca = (
              <CardFCA
                fca={fcaAtual}
                podeEditar={false}
                podeValidar={true}
                aoValidar={handleValidar}
                autor={autor}
                mostrarAviso={mostrarAviso}
              />
            )
            // FCA (esquerda) + ocorrência que o originou (direita), lado a lado
            if (fcaAtual.ocorrencia_origem) {
              return (
                <div className="fca-duplo">
                  {cartaoFca}
                  <VisualizarOcorrencia ocorrencia={fcaAtual.ocorrencia_origem} />
                </div>
              )
            }
            return cartaoFca
          })() : (
            <div className="fca-vazio-detalhe">
              <div className="vazio-icone">📋</div>
              <p>Selecione um FCA na lista para visualizar e validar.</p>
            </div>
          )}
        </div>

        {/* Painel direito — lista */}
        <div className={`fca-painel-lista ${mostraDetalhe ? 'oculto-mobile' : ''}`}>
          <div className="fca-lista-header">
            <span className="fca-lista-titulo">FCAs disponíveis</span>
          </div>
          {carregando && <p className="texto-apagado" style={{ padding: 12, textAlign: 'center' }}>Carregando...</p>}
          {!carregando && fcas.length === 0 && (
            <p className="texto-apagado" style={{ padding: 12, textAlign: 'center' }}>Nenhum FCA disponível.</p>
          )}
          {grupos.map((grupo, indice) => (
            <GrupoDia
              key={grupo.chave}
              grupo={grupo}
              aberto={grupoEstaAberto(grupo.chave, indice)}
              aoAlternar={() => alternarGrupo(grupo.chave, indice)}
              selecionado={selecionado}
              aoSelecionar={selecionar}
              criterioPendente={f => !f.validacao_tipo}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
