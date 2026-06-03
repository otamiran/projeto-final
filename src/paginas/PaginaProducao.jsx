// Tela exclusiva para o grupo Produção
// Somente visualização dos relatórios abertos + validação + comentários

import { useState } from 'react'
import { useValidacoes } from '../ganchos/useValidacoes'
import PainelComentarios from '../componentes/PainelComentarios'

// ── Botões de validação de uma ocorrência ────────────────────────────────────
function AcoesOcorrencia({ indice, relatorioId, autor }) {
  const { validacaoDo, comentariosDo, validar, comentar } = useValidacoes(relatorioId)
  const [painelAberto, setPainelAberto] = useState(false)

  const val         = validacaoDo(indice)
  const comentarios = comentariosDo(indice)

  return (
    <div>
      {/* Badge da validação atual */}
      {val && (
        <div className={`val-badge ${val.tipo === 'aprovado' ? 'val-aprovado' : 'val-reprovado'}`}
          style={{ marginBottom: 8 }}>
          {val.tipo === 'aprovado' ? '✅ Aprovado' : '❌ Reprovado'} por {val.autor}
        </div>
      )}

      {/* Botões de ação */}
      <div className="oc-acoes-prod">
        <button
          className={`botao-validar ${val?.tipo === 'aprovado' ? 'ativo-verde' : ''}`}
          onClick={() => validar(indice, 'aprovado', autor)}
        >
          ✅ Aprovar
        </button>
        <button
          className={`botao-validar ${val?.tipo === 'reprovado' ? 'ativo-vermelho' : ''}`}
          onClick={() => validar(indice, 'reprovado', autor)}
        >
          ❌ Reprovar
        </button>
        <button className="botao-comentar" onClick={() => setPainelAberto(v => !v)}>
          💬 {comentarios.length > 0 ? `${comentarios.length} comentário(s)` : 'Comentar'}
        </button>
      </div>

      {/* Painel de comentários */}
      {painelAberto && (
        <PainelComentarios
          comentarios={comentarios}
          aoEnviar={texto => comentar(indice, texto, autor)}
        />
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function PaginaProducao({ sessao, abertos, status }) {
  const autor = sessao?.login || sessao?.nome || 'Produção'

  // Filtra só ocorrências (aceita formato antigo 'occ' e novo 'ocorrencia')
  function ehOcorrencia(tipo) {
    return tipo === 'ocorrencia' || tipo === 'occ'
  }
  function ehAtividade(tipo) {
    return tipo === 'atividade' || tipo === 'ativ'
  }

  return (
    <div className="pagina">
      <div className="container">

        {/* Aviso de modo somente leitura */}
        <div className="aviso-producao">
          <span>🏭</span>
          <span>Visão Produção — use os botões para validar as ocorrências e enviar comentários.</span>
        </div>

        {/* Status de conexão */}
        {status && (
          <div className={`barra-status status-${status.tipo}`}>
            <span className="ponto-pulsante" />
            {status.mensagem}
          </div>
        )}

        {/* Nenhum relatório aberto */}
        {(!abertos || abertos.length === 0) && (
          <div className="vazio">
            <div className="vazio-icone">◉</div>
            <p>Nenhum relatório aberto no momento.</p>
          </div>
        )}

        {/* Lista de relatórios */}
        {(abertos || []).map(r => {
          const df = r.data
            ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR')
            : '—'
          const itens = r.itens || []
          const ocorrencias = itens.filter(i => ehOcorrencia(i.tipo))
          const atividades  = itens.filter(i => ehAtividade(i.tipo))

          return (
            <div key={r.id} className="card" style={{ borderLeft: '3px solid var(--azul, #4a90e2)' }}>

              {/* Cabeçalho do relatório */}
              <div className="rel-prod-header">
                <div>
                  <div className="rel-prod-setor">{r.setor || 'Sem setor'}</div>
                  <div className="rel-prod-meta">
                    {df} · {r.turno || '—'} · por {r.criado_por || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {ocorrencias.length > 0 && (
                    <span className="tag tag-ocorrencia">🔧 {ocorrencias.length}</span>
                  )}
                  {atividades.length > 0 && (
                    <span className="tag tag-atividade">📅 {atividades.length}</span>
                  )}
                </div>
              </div>

              {/* Ocorrências com validação */}
              {ocorrencias.length > 0 && (
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--cor-borda)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="secao-titulo">🔧 Ocorrências</div>
                  {ocorrencias.map((item, idx) => {
                    const indiceReal = itens.indexOf(item)
                    // Aceita campos antigos (equip) e novos (equipamento)
                    const equip    = item.equipamento || item.equip || '(sem equipamento)'
                    const sintoma  = item.sintoma || '—'
                    const modo     = item.modo || ''
                    const impacto  = item.impacto || ''
                    const interv   = item.intervencao || item.tipo_int || ''
                    const solucao  = item.solucao || ''
                    const fotos    = item.fotos || []

                    return (
                      <div key={idx} className="bloco-ocorrencia-prod">
                        {/* Dados */}
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{equip}</div>
                        {item.autor && <div style={{ fontSize: 11, color: 'var(--cor-apagado)', marginBottom: 6 }}>por {item.autor}</div>}
                        <div className="oc-detalhes">
                          {sintoma  && <div><span className="oc-label">Sintoma:</span> {sintoma}</div>}
                          {modo     && <div><span className="oc-label">Modo:</span> {modo}{impacto ? ` · ${impacto}` : ''}</div>}
                          {interv   && <div><span className="oc-label">Intervenção:</span> {interv}</div>}
                          {solucao  && <div><span className="oc-label">Solução:</span> {solucao}</div>}
                        </div>

                        {/* Fotos */}
                        {fotos.length > 0 && (
                          <div className="oc-fotos-prod">
                            {fotos.map((f, fi) => (
                              <img key={fi} src={f.url} alt={`Foto ${fi + 1}`}
                                className="foto-prod"
                                onClick={() => window.open(f.url, '_blank')}
                              />
                            ))}
                          </div>
                        )}

                        {/* Validação e comentários */}
                        <AcoesOcorrencia
                          indice={indiceReal}
                          relatorioId={r.id}
                          autor={autor}
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Atividades — somente leitura */}
              {atividades.length > 0 && (
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--cor-borda)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="secao-titulo">📅 Atividades</div>
                  {atividades.map((item, idx) => {
                    const equip = item.equipamento || item.equip || '—'
                    const desc  = item.descricao || item.desc || '—'
                    return (
                      <div key={idx} className="bloco-atividade-prod">
                        <span className="at-badge">📅</span>
                        <div>
                          <strong>{equip}</strong>
                          <span className="at-meta"> · {desc} · {item.status || '—'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
