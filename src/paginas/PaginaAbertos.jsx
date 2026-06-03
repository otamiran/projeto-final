// Lista os relatórios que ainda estão sendo preenchidos

import { bd, TABELA_ABERTOS, TABELA_HISTORICO } from '../utilitarios/supabase'

export default function PaginaAbertos({ abertos, sessao, aoVer, pedir, mostrarAviso, recarregar }) {
  // Fecha o relatório e move para o histórico
  function fechar(relatorio) {
    pedir('Mover este relatório para o Histórico?', async () => {
      await bd.from(TABELA_ABERTOS).delete().eq('id', relatorio.id)
      await bd.from(TABELA_HISTORICO).insert({
        ...relatorio,
        id: undefined,
        fechado_por: sessao.nome,
        fechado_em: Date.now(),
      })
      mostrarAviso('Fechado e salvo no histórico!')
      recarregar()
    })
  }

  // Exclui permanentemente um relatório aberto
  function excluir(id) {
    pedir('Excluir este relatório aberto?', async () => {
      await bd.from(TABELA_ABERTOS).delete().eq('id', id)
      mostrarAviso('Excluído.')
      recarregar()
    })
  }

  // Lista vazia
  if (!abertos.length)
    return (
      <div className="pagina">
        <div className="conteudo">
          <div className="vazio">
            <div className="icone-vazio">◉</div>
            <p>Nenhum relatório aberto.</p>
            <p>Preencha a aba Novo — salvo automaticamente.</p>
          </div>
        </div>
      </div>
    )

  return (
    <div className="pagina">
      <div className="conteudo">
        <p className="label-pagina">Relatórios em preenchimento — contribua ou feche</p>

        {/* Um card para cada relatório aberto */}
        {abertos.map(r => {
          const dataFormatada = r.data
            ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR')
            : 'Sem data'
          const qtdOcorrencias = (r.itens || []).filter(i => i.tipo === 'ocorrencia').length
          const qtdAtividades = (r.itens || []).filter(i => i.tipo === 'atividade').length

          return (
            <div key={r.id} className="card-aberto">
              {/* Cabeçalho do card */}
              <div className="card-aberto-cabecalho">
                <div>
                  <div className="card-aberto-setor">{r.setor || 'Sem setor'}</div>
                  <div className="card-aberto-meta">
                    {dataFormatada} · {r.turno || '?'} · por {r.criado_por || '—'}
                  </div>
                </div>
                {/* Tags de contagem */}
                <div className="tags">
                  {qtdOcorrencias > 0 && (
                    <span className="tag tag-ocorrencia">🔧 {qtdOcorrencias}</span>
                  )}
                  {qtdAtividades > 0 && (
                    <span className="tag tag-atividade">📅 {qtdAtividades}</span>
                  )}
                </div>
              </div>

              {/* Preview dos primeiros 3 itens */}
              {(r.itens || []).slice(0, 3).length > 0 && (
                <div className="card-aberto-itens">
                  {(r.itens || []).slice(0, 3).map((item, i) => (
                    <div
                      key={i}
                      className={`linha-item tipo-${item.tipo}`}
                      style={{ background: 'var(--cor-fundo-3)' }}
                    >
                      <span
                        className={`badge-tipo ${item.tipo === 'ocorrencia' ? 'badge-ocorrencia' : 'badge-atividade'}`}
                      >
                        {item.tipo === 'ocorrencia' ? '🔧' : '📅'}
                      </span>
                      <div className="item-texto">
                        <strong>{item.equipamento || '—'}</strong>
                        <span>{item.tipo === 'ocorrencia' ? item.sintoma : item.descricao}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botões de ação */}
              <div className="card-aberto-acoes">
                <button className="botao botao-verde" onClick={() => aoVer(r)}>
                  👁 Ver
                </button>
                <button className="botao botao-destaque" onClick={() => fechar(r)}>
                  ✓ Fechar
                </button>
                <button className="botao botao-vermelho" onClick={() => excluir(r.id)}>
                  🗑
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
