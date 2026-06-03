// Tela exclusiva para o grupo Produção
// Relatórios agrupados por setor, colapsáveis, com validação e comentários

import { useState } from 'react'
import { useValidacoes } from '../ganchos/useValidacoes'
import PainelComentarios from '../componentes/PainelComentarios'

// ── Ações de uma ocorrência (validar + comentar) ─────────────────────────────
function AcoesOcorrencia({ indice, relatorioId, autor }) {
  const { validacaoDo, comentariosDo, validar, comentar } = useValidacoes(relatorioId)
  const [painelAberto, setPainelAberto] = useState(false)

  const val         = validacaoDo(indice)
  const comentarios = comentariosDo(indice)

  return (
    <div>
      {val && (
        <div className={`val-badge ${val.tipo === 'aprovado' ? 'val-aprovado' : 'val-reprovado'}`}
          style={{ marginBottom: 8 }}>
          {val.tipo === 'aprovado' ? '✅ Aprovado' : '❌ Reprovado'} por <strong>{val.autor}</strong>
        </div>
      )}
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
      {painelAberto && (
        <PainelComentarios
          comentarios={comentarios}
          aoEnviar={texto => comentar(indice, texto, autor)}
        />
      )}
    </div>
  )
}

// ── Card de um relatório (colapsável) ────────────────────────────────────────
function CardRelatorio({ relatorio, autor, abertoPorPadrao }) {
  const [expandido, setExpandido] = useState(abertoPorPadrao)

  const itens       = relatorio.itens || []
  const ocorrencias = itens.filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ')
  const atividades  = itens.filter(i => i.tipo === 'atividade'  || i.tipo === 'ativ')
  const df = relatorio.data
    ? new Date(relatorio.data + 'T12:00').toLocaleDateString('pt-BR')
    : '—'

  return (
    <div className="card card-relatorio-prod">

      {/* ── Cabeçalho clicável para colapsar ── */}
      <button
        className="rel-prod-header rel-prod-toggle"
        onClick={() => setExpandido(v => !v)}
        aria-expanded={expandido}
      >
        <div style={{ flex: 1 }}>
          <div className="rel-prod-meta">
            {df} · {relatorio.turno || '—'} · por {relatorio.criado_por || '—'}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
            {ocorrencias.length > 0 && (
              <span className="tag tag-ocorrencia">🔧 {ocorrencias.length}</span>
            )}
            {atividades.length > 0 && (
              <span className="tag tag-atividade">📅 {atividades.length}</span>
            )}
          </div>
        </div>
        {/* Seta indicadora */}
        <span className={`seta-collapse ${expandido ? 'aberta' : ''}`}>▼</span>
      </button>

      {/* ── Conteúdo colapsável ── */}
      {expandido && (
        <div className="rel-prod-conteudo">

          {/* Ocorrências com validação */}
          {ocorrencias.length > 0 && (
            <div className="rel-prod-secao">
              <div className="secao-titulo">🔧 Ocorrências</div>
              {ocorrencias.map((item, idx) => {
                const indiceReal = itens.indexOf(item)
                const equip   = item.equipamento || item.equip || '(sem equipamento)'
                const sintoma = item.sintoma || ''
                const modo    = item.modo    || ''
                const impacto = item.impacto || ''
                const interv  = item.intervencao || item.tipo_int || ''
                const solucao = item.solucao || ''
                const fotos   = item.fotos || []

                return (
                  <div key={idx} className="bloco-ocorrencia-prod">
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{equip}</div>
                    {item.autor && (
                      <div style={{ fontSize: 11, color: 'var(--cor-apagado)', marginBottom: 6 }}>
                        por {item.autor}
                      </div>
                    )}
                    <div className="oc-detalhes">
                      {sintoma && <div><span className="oc-label">Sintoma:</span> {sintoma}</div>}
                      {modo    && <div><span className="oc-label">Modo:</span> {modo}{impacto ? ` · ${impacto}` : ''}</div>}
                      {interv  && <div><span className="oc-label">Intervenção:</span> {interv}</div>}
                      {solucao && <div><span className="oc-label">Solução:</span> {solucao}</div>}
                    </div>
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
                    <AcoesOcorrencia indice={indiceReal} relatorioId={relatorio.id} autor={autor} />
                  </div>
                )
              })}
            </div>
          )}

          {/* Atividades — somente leitura */}
          {atividades.length > 0 && (
            <div className="rel-prod-secao">
              <div className="secao-titulo">📅 Atividades</div>
              {atividades.map((item, idx) => (
                <div key={idx} className="bloco-atividade-prod">
                  <span className="at-badge">📅</span>
                  <div>
                    <strong>{item.equipamento || item.equip || '—'}</strong>
                    <span className="at-meta">
                      {' · '}{item.descricao || item.desc || '—'}{' · '}{item.status || '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Grupo de um setor (colapsável) ───────────────────────────────────────────
function GrupoSetor({ setor, relatorios, autor }) {
  const [expandido, setExpandido] = useState(true)

  // Totais do setor para exibir no cabeçalho mesmo colapsado
  const totalOc = relatorios.reduce((s, r) =>
    s + (r.itens || []).filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ').length, 0)
  const totalAt = relatorios.reduce((s, r) =>
    s + (r.itens || []).filter(i => i.tipo === 'atividade' || i.tipo === 'ativ').length, 0)

  return (
    <div className="grupo-setor-prod">
      {/* Cabeçalho do grupo */}
      <button
        className="grupo-setor-header"
        onClick={() => setExpandido(v => !v)}
        aria-expanded={expandido}
      >
        <span className="grupo-setor-nome">{setor}</span>
        <div className="grupo-setor-tags">
          <span className="tag tag-relatorio">{relatorios.length} relatório(s)</span>
          {totalOc > 0 && <span className="tag tag-ocorrencia">🔧 {totalOc}</span>}
          {totalAt > 0 && <span className="tag tag-atividade">📅 {totalAt}</span>}
        </div>
        <span className={`seta-collapse ${expandido ? 'aberta' : ''}`}>▼</span>
      </button>

      {/* Relatórios do setor */}
      {expandido && (
        <div className="grupo-setor-corpo">
          {relatorios.map((r, idx) => (
            <CardRelatorio
              key={r.id}
              relatorio={r}
              autor={autor}
              abertoPorPadrao={relatorios.length === 1} // expande automaticamente se só tiver 1
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function PaginaProducao({ sessao, abertos, status }) {
  const autor = sessao?.login || sessao?.nome || 'Produção'

  // Agrupa relatórios por setor (ordenado alfabeticamente)
  const grupos = (abertos || []).reduce((acc, r) => {
    const setor = (r.setor || 'Sem setor').trim()
    acc[setor] = acc[setor] || []
    acc[setor].push(r)
    return acc
  }, {})
  const setoresOrdenados = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return (
    <div className="pagina">
      <div className="container">

        {/* Aviso modo somente leitura */}
        <div className="aviso-producao">
          <span>🏭</span>
          <span>
            Visão Produção — relatórios agrupados por setor.
            Clique no setor ou no relatório para expandir.
          </span>
        </div>

        {/* Status de conexão */}
        {status && (
          <div className={`barra-status status-${status.tipo}`}>
            <span className="ponto-pulsante" />
            {status.mensagem}
          </div>
        )}

        {/* Sem relatórios abertos */}
        {setoresOrdenados.length === 0 && (
          <div className="vazio">
            <div className="vazio-icone">◉</div>
            <p>Nenhum relatório aberto no momento.</p>
          </div>
        )}

        {/* Grupos por setor */}
        {setoresOrdenados.map(setor => (
          <GrupoSetor
            key={setor}
            setor={setor}
            relatorios={grupos[setor]}
            autor={autor}
          />
        ))}

      </div>
    </div>
  )
}
