// Modal para adicionar ou editar a observação de um item do Almoxarifado.
// Segue o padrão visual dos outros modais do projeto (fundo-modal, modal, etc.).

import { useState } from 'react'

export default function ModalObs({ linha, cabecalhos, obsExistente, aoSalvar, aoFechar }) {
  const [valor, setValor]       = useState(obsExistente?.descricao || '')
  const [salvando, setSalvando] = useState(false)

  // Resumo informativo com as 3 primeiras colunas
  const info = (cabecalhos || [])
    .slice(0, 3)
    .map(h => linha?.cells?.[h])
    .filter(Boolean)
    .join(' · ') || '—'

  async function handleSalvar() {
    setSalvando(true)
    try {
      await aoSalvar(valor.trim())
      aoFechar()
    } catch (erro) {
      alert('Erro ao salvar: ' + erro.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    // Fundo escuro — clique fora fecha
    <div className="fundo-modal" onClick={e => e.target === e.currentTarget && aoFechar()}>
      <div className="modal">

        {/* Cabeçalho */}
        <div className="modal-cabecalho">
          <h2>{obsExistente?.descricao ? 'Editar observação' : 'Adicionar observação'}</h2>
          <button className="botao-fechar-modal" onClick={aoFechar}>✕</button>
        </div>

        {/* Corpo */}
        <div className="modal-corpo" style={{ gap: 14 }}>

          {/* Identificação do item */}
          <div className="almox-info-item">{info}</div>

          {/* Campo de texto */}
          <div className="campo">
            <label className="campo-label">Onde é usado / Observação</label>
            <textarea
              rows={3}
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Ex: Usado na bomba P-101, linha de processo 3..."
              autoFocus
            />
          </div>

          {/* Última edição */}
          {obsExistente?.autor && (
            <p className="almox-ultima-edicao">
              Última edição: {obsExistente.autor}
            </p>
          )}

          {/* Aviso de visibilidade */}
          <div className="almox-aviso-info">
            💡 Sua observação ficará visível para <strong>todos os usuários</strong> do app
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="botao" onClick={aoFechar} disabled={salvando}>
              Cancelar
            </button>
            <button
              className="botao botao-destaque"
              onClick={handleSalvar}
              disabled={salvando}
              style={{ flex: 2 }}
            >
              {salvando ? '⏳ Salvando...' : '✓ Salvar para todos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
