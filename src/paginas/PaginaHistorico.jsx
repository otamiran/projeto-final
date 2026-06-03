// Lista os relatórios fechados (histórico permanente)
// Admin pode excluir — usuário comum só pode ver e reabrir

import { bd, TABELA_ABERTOS, TABELA_HISTORICO } from '../utilitarios/supabase'
import { ehAdmin } from '../utilitarios/autenticacao'

export default function PaginaHistorico({
  historico,
  sessao,
  aoVer,
  pedir,
  mostrarAviso,
  recarregar,
}) {
  // Exclui permanentemente um relatório do histórico (só admin)
  function excluir(id) {
    if (!ehAdmin(sessao)) {
      mostrarAviso('Só o administrador pode excluir.', true)
      return
    }
    pedir('Excluir permanentemente este relatório?', async () => {
      await bd.from(TABELA_HISTORICO).delete().eq('id', id)
      mostrarAviso('Relatório excluído.')
      recarregar()
    })
  }

  // Move o relatório de volta para abertos
  function reabrir(relatorio) {
    pedir('Mover de volta para Abertos?', async () => {
      // Remove campos de fechamento antes de reinserir em abertos
      const { fechado_por, fechado_em, ...dados } = relatorio

      const { error } = await bd.from(TABELA_ABERTOS).insert({
        ...dados,
        id: undefined, // novo ID
        reaberto_em: Date.now(),
        reaberto_por: sessao.nome,
      })

      if (error) {
        mostrarAviso('Erro ao reabrir.', true)
        return
      }
      await bd.from(TABELA_HISTORICO).delete().eq('id', relatorio.id)
      mostrarAviso('Relatório reaberto!')
      recarregar()
    })
  }

  // Lista vazia
  if (!historico.length)
    return (
      <div className="pagina">
        <div className="conteudo">
          <div className="vazio">
            <div className="icone-vazio">📋</div>
            <p>Nenhum relatório no histórico.</p>
          </div>
        </div>
      </div>
    )

  return (
    <div className="pagina">
      <div className="conteudo">
        {/* Um card para cada relatório do histórico */}
        {historico.map(r => {
          const dataFormatada = r.data
            ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR')
            : 'Sem data'
          const qtdOcorrencias = (r.itens || []).filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ').length
          const qtdAtividades = (r.itens || []).filter(i => i.tipo === 'atividade'  || i.tipo === 'ativ').length
          const qtdFotos = (r.itens || []).reduce((total, i) => total + (i.fotos?.length || 0), 0)

          return (
            <div key={r.id} className="card-historico">
              {/* Cabeçalho clicável — abre o modal de visualização */}
              <div className="card-historico-cabecalho" onClick={() => aoVer(r)}>
                <div>
                  <div className="card-historico-titulo">
                    {r.setor || 'Sem setor'} — {dataFormatada}
                  </div>
                  <div className="card-historico-meta">
                    {r.turno || '?'} · {r.criado_por || '—'}
                    {r.fechado_por && ` · fechado por: ${r.fechado_por}`}
                  </div>
                </div>
                {/* Tags */}
                <div className="tags">
                  {r.turno && <span className="tag tag-turno">{r.turno}</span>}
                  {qtdOcorrencias > 0 && (
                    <span className="tag tag-ocorrencia">🔧 {qtdOcorrencias}</span>
                  )}
                  {qtdAtividades > 0 && (
                    <span className="tag tag-atividade">📅 {qtdAtividades}</span>
                  )}
                  {qtdFotos > 0 && <span className="tag tag-foto">📷 {qtdFotos}</span>}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="card-historico-acoes">
                <button className="botao botao-verde" onClick={() => aoVer(r)}>
                  👁 Ver
                </button>
                <button className="botao botao-azul" onClick={() => reabrir(r)}>
                  ↩ Reabrir
                </button>
                {/* Botão excluir só para admin */}
                {ehAdmin(sessao) && (
                  <button className="botao botao-vermelho" onClick={() => excluir(r.id)}>
                    🗑 Excluir
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
