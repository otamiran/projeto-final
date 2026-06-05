// Tela de FCA para produção — visualização + aprovação
// Layout dois painéis: lista à direita, detalhe à esquerda

import { useState } from 'react'
import { useFCAs } from '../ganchos/useFCAs'
import CardFCA    from '../componentes/CardFCA'

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

export default function PaginaFCAProducao({ sessao, mostrarAviso }) {
  const autor = sessao?.login || sessao?.nome || 'Produção'
  const { fcas, carregando, validar } = useFCAs(!!sessao)
  const [selecionado, setSelecionado] = useState(null)
  const [mostraDetalhe, setMostraDetalhe] = useState(false)

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
          {selecionado ? (
            <CardFCA
              fca={fcas.find(f => f.id === selecionado.id) || selecionado}
              podeEditar={false}
              podeValidar={true}
              aoValidar={handleValidar}
              autor={autor}
            />
          ) : (
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
