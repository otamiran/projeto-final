// Tela exclusiva para usuários do grupo Produção
// Apenas visualização dos relatórios abertos + validação + comentários por ocorrência

import { useState } from 'react'
import { useValidacoes } from '../ganchos/useValidacoes'
import PainelComentarios from '../componentes/PainelComentarios'

// Exibe um bloco de ocorrência com botões de validação
function BlocoOcorrencia({ item, indice, relatorioId, autor }) {
  const { validacaoDo, comentariosDo, validar, comentar } = useValidacoes(relatorioId)
  const [painelAberto, setPainelAberto] = useState(false)

  const val = validacaoDo(indice)
  const comentarios = comentariosDo(indice)

  return (
    <div className="bloco-ocorrencia-prod">
      {/* ── Dados da ocorrência ── */}
      <div className="oc-cabecalho">
        <span className="oc-badge">🔧</span>
        <div className="oc-titulo">
          <strong>{item.equipamento || item.equip || '(sem equipamento)'}</strong>
          {item.autor && <span className="oc-autor"> · por {item.autor}</span>}
        </div>
        {/* Indicador de validação atual */}
        {val && (
          <span className={`val-badge ${val.tipo === 'aprovado' ? 'val-aprovado' : 'val-reprovado'}`}>
            {val.tipo === 'aprovado' ? '✅ Aprovado' : '❌ Reprovado'} por {val.autor}
          </span>
        )}
      </div>

      {/* Detalhes */}
      <div className="oc-detalhes">
        {item.sintoma   && <div><span className="oc-label">Sintoma:</span> {item.sintoma}</div>}
        {item.modo      && <div><span className="oc-label">Modo:</span> {item.modo} · {item.impacto}</div>}
        {(item.intervencao || item.tipo_int) && <div><span className="oc-label">Intervenção:</span> {item.intervencao || item.tipo_int}</div>}
        {item.solucao   && <div><span className="oc-label">Solução:</span> {item.solucao}</div>}
      </div>

      {/* Fotos (somente visualização) */}
      {(item.fotos || []).length > 0 && (
        <div className="oc-fotos-prod">
          {item.fotos.map((f, i) => (
            <img key={i} src={f.url} alt={`Foto ${i + 1}`} className="foto-prod"
              onClick={() => window.open(f.url, '_blank')} />
          ))}
        </div>
      )}

      {/* ── Ações da produção ── */}
      <div className="oc-acoes-prod">
        {/* Botões de validação */}
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

        {/* Botão comentários com contador */}
        <button
          className="botao-comentar"
          onClick={() => setPainelAberto(v => !v)}
        >
          💬 {comentarios.length > 0 ? `${comentarios.length} comentário(s)` : 'Comentar'}
        </button>
      </div>

      {/* Painel de comentários (expandível) */}
      {painelAberto && (
        <PainelComentarios
          comentarios={comentarios}
          aoEnviar={texto => comentar(indice, texto, autor)}
        />
      )}
    </div>
  )
}

// ── Componente principal da página ──────────────────────────────────────────
export default function PaginaProducao({ sessao, abertos, status }) {
  const autor = sessao?.login || sessao?.nome || 'Produção'

  return (
    <div className="pagina pagina-producao">
      <div className="container">

        {/* Cabeçalho informativo */}
        <div className="aviso-producao">
          <span>🏭</span>
          <span>Visão Produção — somente leitura. Use os botões de aprovação para validar as ocorrências.</span>
        </div>

        {/* Barra de status */}
        {status && (
          <div className={`barra-status status-${status.tipo}`}>
            <span className="ponto-pulsante" />
            {status.mensagem}
          </div>
        )}

        {/* Lista de relatórios abertos */}
        {abertos.length === 0 ? (
          <div className="vazio">
            <div className="vazio-icone">◉</div>
            <p>Nenhum relatório aberto no momento.</p>
          </div>
        ) : (
          abertos.map(r => {
            const df = r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : '—'
            const ocorrencias = (r.itens || []).filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ')
            const atividades  = (r.itens || []).filter(i => i.tipo === 'atividade'  || i.tipo === 'ativ')

            return (
              <div key={r.id} className="card card-relatorio-prod">
                {/* Cabeçalho do relatório */}
                <div className="rel-prod-header">
                  <div>
                    <div className="rel-prod-setor">{r.setor || 'Sem setor'}</div>
                    <div className="rel-prod-meta">
                      {df} · {r.turno || '—'} · por {r.criado_por || '—'}
                    </div>
                  </div>
                  <div className="rel-prod-tags">
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
                  <div className="rel-prod-ocorrencias">
                    <div className="secao-titulo">🔧 Ocorrências</div>
                    {ocorrencias.map((item, idx) => {
                      // Calcula o índice real do item no array completo (inclui atividades)
                      const indiceReal = (r.itens || []).indexOf(item)
                      return (
                        <BlocoOcorrencia
                          key={idx}
                          item={item}
                          indice={indiceReal}
                          relatorioId={r.id}
                          autor={autor}
                        />
                      )
                    })}
                  </div>
                )}

                {/* Atividades — somente leitura (sem validação) */}
                {atividades.length > 0 && (
                  <div className="rel-prod-atividades">
                    <div className="secao-titulo">📅 Atividades</div>
                    {atividades.map((item, idx) => (
                      <div key={idx} className="bloco-atividade-prod">
                        <span className="at-badge">📅</span>
                        <div>
                          <strong>{item.equipamento || item.equip || '—'}</strong>
                          <span className="at-meta"> · {item.descricao || item.desc || item.desc || '—'} · {item.status || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
