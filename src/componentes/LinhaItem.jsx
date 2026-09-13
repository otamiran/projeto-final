// Uma linha na lista de itens do relatório (ocorrência ou atividade)
// Exibe badge de validação da produção quando houver

import { useState } from 'react'
import { EMOJI_STATUS } from '../utilitarios/constantes'

export default function LinhaItem({ item, indice, aoEditar, aoExcluir, validacao, podeExcluir = true }) {
  const [expandido, setExpandido] = useState(false)
  const ehOcorrencia = item.tipo === 'ocorrencia' || item.tipo === 'occ'

  const corPonto = ehOcorrencia
    ? 'ponto-verde'
    : {
        Concluída:       'ponto-verde',
        'Em andamento':  'ponto-azul',
        Pendente:        'ponto-vermelho',
      }[item.status] || 'ponto-cinza'

  // Formata duração: "1h 30min", "45min", "2h" ou omite se não preenchida
  function formatarDuracao(h, m) {
    const hNum = Number(h) || 0
    const mNum = Number(m) || 0
    if (!hNum && !mNum) return null
    return [hNum ? `${hNum}h` : '', mNum ? `${mNum}min` : ''].filter(Boolean).join(' ')
  }

  const duracao = ehOcorrencia ? formatarDuracao(item.duracao_h, item.duracao_m) : null

  const subtexto = ehOcorrencia
    ? [item.modo, item.impacto, item.intervencao || item.tipo_int, duracao ? `⏱ ${duracao}` : null].filter(Boolean).join(' · ') || '—'
    : `${item.descricao || item.desc || '—'} · ${EMOJI_STATUS[item.status] || ''} ${item.status || '—'}`

  const quantidadeFotos = (item.fotos || []).length

  // Descrição completa: "sintoma" na ocorrência, "descricao" na atividade.
  // A linha resumida já mostra outros campos, mas não isso — por isso vale
  // a pena poder expandir pra ler o texto inteiro.
  const descricaoCompleta = ehOcorrencia ? (item.sintoma || item.descricao) : (item.descricao || item.desc)
  const temDetalhe = !!(descricaoCompleta || (ehOcorrencia && item.solucao))

  return (
    <div className="linha-item-wrapper">
      <div className={`linha-item tipo-${item.tipo}`}>
        {/* Badge do tipo */}
        <span className={`badge-tipo ${ehOcorrencia ? 'badge-ocorrencia' : 'badge-atividade'}`}>
          {ehOcorrencia ? '🔧' : '📅'}
        </span>

        {/* Texto principal — clicável pra expandir, quando há descrição pra mostrar */}
        <div
          className="item-texto"
          style={temDetalhe ? { cursor: 'pointer' } : undefined}
          onClick={() => temDetalhe && setExpandido(v => !v)}
        >
          <strong>{item.equipamento || item.equip || '(sem equipamento)'}</strong>
          <span>
            {subtexto}
            {(item.executor || item.autor) && <> · <em>{item.executor || item.autor}</em></>}
          </span>

          {/* Badge de validação da produção — aparece se a produção já validou */}
          {ehOcorrencia && validacao && (
            <span className={`badge-validacao-linha ${validacao.tipo === 'aprovado' ? 'bv-aprovado' : 'bv-reprovado'}`}>
              {validacao.tipo === 'aprovado' ? '✅' : '❌'} {validacao.autor}
            </span>
          )}

          {quantidadeFotos > 0 && (
            <span className="contador-fotos">
              📷 {quantidadeFotos} foto{quantidadeFotos > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <span className={`ponto-status ${corPonto}`} />

        {/* Seta de expandir/recolher — só aparece se tem descrição pra ler */}
        {temDetalhe && (
          <button
            className="botao botao-cinza botao-pequeno botao-expandir"
            onClick={() => setExpandido(v => !v)}
            title={expandido ? 'Recolher descrição' : 'Ver descrição completa'}
          >
            {expandido ? '▲' : '▼'}
          </button>
        )}

        <div className="botoes-item">
          <button className="botao botao-azul botao-pequeno" onClick={() => aoEditar(item, indice)}>✏</button>
          {podeExcluir && (
            <button className="botao botao-vermelho botao-pequeno" onClick={() => aoExcluir(indice)}>✕</button>
          )}
        </div>
      </div>

      {/* Bloco expandido com a descrição/solução completa */}
      {expandido && temDetalhe && (
        <div className="linha-item-detalhe">
          {descricaoCompleta && (
            <p><strong>{ehOcorrencia ? 'Descrição:' : 'Detalhes:'}</strong> {descricaoCompleta}</p>
          )}
          {ehOcorrencia && item.solucao && (
            <p><strong>Solução:</strong> {item.solucao}</p>
          )}
        </div>
      )}
    </div>
  )
}
