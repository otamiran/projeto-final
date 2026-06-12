// Uma linha na lista de itens do relatório (ocorrência ou atividade)
// Exibe badge de validação da produção quando houver

import { EMOJI_STATUS } from '../utilitarios/constantes'

export default function LinhaItem({ item, indice, aoEditar, aoExcluir, validacao }) {
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

  return (
    <div className={`linha-item tipo-${item.tipo}`}>
      {/* Badge do tipo */}
      <span className={`badge-tipo ${ehOcorrencia ? 'badge-ocorrencia' : 'badge-atividade'}`}>
        {ehOcorrencia ? '🔧' : '📅'}
      </span>

      {/* Texto principal */}
      <div className="item-texto">
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

      <div className="botoes-item">
        <button className="botao botao-azul botao-pequeno" onClick={() => aoEditar(item, indice)}>✏</button>
        <button className="botao botao-vermelho botao-pequeno" onClick={() => aoExcluir(indice)}>✕</button>
      </div>
    </div>
  )
}
