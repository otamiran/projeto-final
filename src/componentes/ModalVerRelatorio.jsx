// Modal que exibe o conteúdo completo de um relatório (aberto ou do histórico)
// Inclui validações e comentários da produção por ocorrência

import { useState } from 'react'
import { textoOcorrencias, textoAtividades, textoCompleto } from '../utilitarios/textoRelatorio'
import { ehAdmin } from '../utilitarios/autenticacao'
import { useValidacoes } from '../ganchos/useValidacoes'

// ── Bloco de validação + comentários de uma ocorrência ───────────────────────
function InfoProducao({ indice, relatorioId }) {
  const { validacaoDo, comentariosDo } = useValidacoes(relatorioId)
  const val         = validacaoDo(indice)
  const comentarios = comentariosDo(indice)

  // Não renderiza nada se não houver validação nem comentários
  if (!val && comentarios.length === 0) return null

  function formatarData(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="info-producao-bloco">
      {/* Validação */}
      {val && (
        <div className={`val-badge-modal ${val.tipo === 'aprovado' ? 'val-aprovado' : 'val-reprovado'}`}>
          {val.tipo === 'aprovado' ? '✅ Aprovado' : '❌ Reprovado'}
          {' '}por <strong>{val.autor}</strong>
          {val.criado_em && (
            <span className="val-hora"> · {formatarData(val.criado_em)}</span>
          )}
        </div>
      )}

      {/* Comentários */}
      {comentarios.length > 0 && (
        <div className="comentarios-modal">
          <div className="comentarios-titulo">💬 Comentários da Produção</div>
          {comentarios.map(c => (
            <div key={c.id} className="comentario-modal">
              <div className="comentario-modal-header">
                <strong>{c.autor}</strong>
                <span>{formatarData(c.criado_em)}</span>
              </div>
              <p>{c.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal principal ──────────────────────────────────────────────────────────
export default function ModalVerRelatorio({
  relatorio,
  sessao,
  podeExcluir,
  aoExcluir,
  aoFechar,
  aoGerarPDF,
  mostrarAviso,
}) {
  const [aba, setAba]         = useState('ocorrencias')
  const [lightbox, setLightbox] = useState(null)

  if (!relatorio) return null

  const dataFormatada = relatorio.data
    ? new Date(relatorio.data + 'T12:00').toLocaleDateString('pt-BR')
    : 'Sem data'

  const texto =
    aba === 'ocorrencias'
      ? textoOcorrencias(relatorio)
      : aba === 'atividades'
        ? textoAtividades(relatorio)
        : textoCompleto(relatorio)

  // Fotos de todos os itens
  const todasFotos = (relatorio.itens || []).flatMap(item =>
    (item.fotos || []).map(foto => ({
      url: foto.url,
      label: `${item.tipo === 'ocorrencia' || item.tipo === 'occ' ? 'Ocorrência' : 'Atividade'} — ${item.equipamento || item.equip || '—'}`,
    }))
  )

  // Apenas ocorrências (para exibir validações/comentários)
  const ocorrencias = (relatorio.itens || []).filter(
    i => i.tipo === 'ocorrencia' || i.tipo === 'occ'
  )

  function copiar() {
    navigator.clipboard
      .writeText(texto)
      .then(() => mostrarAviso('✓ Copiado!'))
      .catch(() => mostrarAviso('Erro ao copiar.', true))
  }

  return (
    <>
      <div className="fundo-modal" onClick={e => e.target === e.currentTarget && aoFechar()}>
        <div className="modal modal-grande">
          {/* Cabeçalho */}
          <div className="modal-cabecalho">
            <h2>
              {relatorio.setor || '—'} — {dataFormatada} {relatorio.turno || ''}
            </h2>
            <button className="botao-fechar-modal" onClick={aoFechar}>✕</button>
          </div>

          <div className="modal-corpo">
            {/* Abas */}
            <div className="abas abas-modal">
              {[
                ['ocorrencias', '🔧 Ocorrências'],
                ['atividades',  '📅 Atividades'],
                ['completo',    '📋 Completo'],
              ].map(([v, r]) => (
                <button
                  key={v}
                  className={`aba ${aba === v ? 'ativa' : ''}`}
                  onClick={() => setAba(v)}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Texto da aba */}
            <div className="caixa-texto">{texto}</div>

            {/* ── Validações e comentários por ocorrência ── */}
            {ocorrencias.length > 0 && (
              <div className="secao-validacoes">
                <div className="secao-label" style={{ marginBottom: 8 }}>
                  🏭 Retorno da Produção
                </div>
                {ocorrencias.map((item, idx) => {
                  const indiceReal = (relatorio.itens || []).indexOf(item)
                  const equip = item.equipamento || item.equip || '(sem equipamento)'
                  return (
                    <div key={idx} className="item-validacao-modal">
                      <div className="item-validacao-titulo">🔧 {equip}</div>
                      <InfoProducao
                        indice={indiceReal}
                        relatorioId={relatorio.id}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Galeria de fotos */}
            {todasFotos.length > 0 && (
              <div>
                <div className="secao-label" style={{ marginBottom: 8 }}>
                  📷 Fotos do relatório
                </div>
                <div className="grade-fotos-modal">
                  {todasFotos.map((foto, i) => (
                    <div key={i} className="foto-modal">
                      <img
                        src={foto.url}
                        alt={`Foto ${i + 1}`}
                        onClick={() => setLightbox(foto.url)}
                      />
                      <span>{foto.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button className="botao botao-verde" onClick={copiar}>
                📋 Copiar
              </button>
              <button className="botao botao-pdf" onClick={() => aoGerarPDF(relatorio)}>
                📄 PDF
              </button>
              {podeExcluir && ehAdmin(sessao) && (
                <button className="botao botao-vermelho" onClick={() => aoExcluir(relatorio.id)}>
                  🗑 Excluir
                </button>
              )}
              <button className="botao" onClick={aoFechar}>Fechar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fundo-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Foto ampliada" />
          <button onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </>
  )
}
