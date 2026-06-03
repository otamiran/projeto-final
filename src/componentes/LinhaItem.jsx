// Uma linha na lista de itens do relatório (ocorrência ou atividade)

import { EMOJI_STATUS } from '../utilitarios/constantes'

export default function LinhaItem({ item, indice, aoEditar, aoExcluir }) {
  const ehOcorrencia = item.tipo === 'ocorrencia'

  // Cor do pontinho indicador de status
  const corPonto = ehOcorrencia
    ? 'ponto-verde'
    : {
        Concluída: 'ponto-verde',
        'Em andamento': 'ponto-azul',
        Pendente: 'ponto-vermelho',
      }[item.status] || 'ponto-cinza'

  // Subtexto descritivo da linha
  const subtexto = ehOcorrencia
    ? [item.modo, item.impacto, item.intervencao].filter(Boolean).join(' · ') || '—'
    : `${item.descricao || '—'} · ${EMOJI_STATUS[item.status] || ''} ${item.status || '—'}`

  const quantidadeFotos = (item.fotos || []).length

  return (
    <div className={`linha-item tipo-${item.tipo}`}>
      {/* Badge do tipo: 🔧 ou 📅 */}
      <span className={`badge-tipo ${ehOcorrencia ? 'badge-ocorrencia' : 'badge-atividade'}`}>
        {ehOcorrencia ? '🔧' : '📅'}
      </span>

      {/* Texto principal */}
      <div className="item-texto">
        <strong>{item.equipamento || '(sem equipamento)'}</strong>
        <span>
          {subtexto}
          {item.autor && (
            <>
              {' '}
              · <em>{item.autor}</em>
            </>
          )}
        </span>
        {/* Contador de fotos — só aparece se tiver fotos */}
        {quantidadeFotos > 0 && (
          <span className="contador-fotos">
            📷 {quantidadeFotos} foto{quantidadeFotos > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Pontinho de status */}
      <span className={`ponto-status ${corPonto}`} />

      {/* Botões editar e excluir */}
      <div className="botoes-item">
        <button className="botao botao-azul botao-pequeno" onClick={() => aoEditar(item, indice)}>
          ✏
        </button>
        <button className="botao botao-vermelho botao-pequeno" onClick={() => aoExcluir(indice)}>
          ✕
        </button>
      </div>
    </div>
  )
}
