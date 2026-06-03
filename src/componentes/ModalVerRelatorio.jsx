// Modal que exibe o conteúdo completo de um relatório (aberto ou do histórico)

import { useState } from 'react'
import { textoOcorrencias, textoAtividades, textoCompleto } from '../utilitarios/textoRelatorio'
import { ehAdmin } from '../utilitarios/autenticacao'

export default function ModalVerRelatorio({
  relatorio,
  sessao,
  podeExcluir,
  aoExcluir,
  aoFechar,
  aoGerarPDF,
  mostrarAviso,
}) {
  const [aba, setAba] = useState('ocorrencias')
  const [lightbox, setLightbox] = useState(null) // URL da foto em tela cheia

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

  // Junta todas as fotos de todos os itens
  const todasFotos = (relatorio.itens || []).flatMap(item =>
    (item.fotos || []).map(foto => ({
      url: foto.url,
      label: `${item.tipo === 'ocorrencia' || item.tipo === 'occ' ? 'Ocorrência' : 'Atividade'} — ${item.equipamento || item.equip || '—'}`,
    }))
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
            <button className="botao-fechar-modal" onClick={aoFechar}>
              ✕
            </button>
          </div>

          <div className="modal-corpo">
            {/* Abas */}
            <div className="abas abas-modal">
              {[
                ['ocorrencias', '🔧 Ocorrências'],
                ['atividades', '📅 Atividades'],
                ['completo', '📋 Completo'],
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

            {/* Texto */}
            <div className="caixa-texto">{texto}</div>

            {/* Galeria de fotos — só aparece se tiver fotos */}
            {todasFotos.length > 0 && (
              <div>
                <div className="secao-label" style={{ marginBottom: 8 }}>
                  📷 Fotos do relatório
                </div>
                <div className="grade-fotos-modal">
                  {todasFotos.map((foto, i) => (
                    <div key={i} className="foto-modal">
                      {/* Clique na foto abre em tela cheia */}
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
              {/* Botão excluir: só aparece se pode excluir E o usuário é admin */}
              {podeExcluir && ehAdmin(sessao) && (
                <button className="botao botao-vermelho" onClick={() => aoExcluir(relatorio.id)}>
                  🗑 Excluir
                </button>
              )}
              <button className="botao" onClick={aoFechar}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox — foto em tela cheia */}
      {lightbox && (
        <div className="fundo-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Foto ampliada" />
          <button onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </>
  )
}
