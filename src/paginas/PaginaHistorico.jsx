// Lista os relatórios fechados (histórico permanente)
// Admin pode excluir — usuário comum só pode ver e reabrir
// Os relatórios são agrupados por setor (ignorando maiúsculas/minúsculas)
// e cada grupo pode ser recolhido/expandido

import { useState } from 'react'
import { bd, TABELA_ABERTOS, TABELA_HISTORICO } from '../utilitarios/supabase'
import { ehAdmin } from '../utilitarios/autenticacao'
import { useSetores } from '../ganchos/useSetores'

export default function PaginaHistorico({
  historico,
  sessao,
  aoVer,
  pedir,
  mostrarAviso,
  recarregar,
  aoGerarPDF,
}) {
  const { setores } = useSetores(!!sessao)

  // Setores recolhidos (chave: nome do grupo). Começam todos expandidos.
  const [colapsados, setColapsados] = useState({})

  function alternarGrupo(nomeGrupo) {
    setColapsados(c => ({ ...c, [nomeGrupo]: !c[nomeGrupo] }))
  }

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

  // ── Agrupa o histórico por setor, ignorando maiúsculas/minúsculas ──────────
  // Relatórios cujo "setor" coincide (case-insensitive) com um setor
  // permanente cadastrado (Admin → Setores) são exibidos com o nome
  // canônico desse setor. Os demais usam o nome como está salvo.
  const grupos = {}
  for (const r of historico) {
    const nomeOriginal = (r.setor || '').trim() || 'Sem setor'
    const chave = nomeOriginal.toLowerCase()

    if (!grupos[chave]) {
      const permanente = setores.find(s => s.nome.toLowerCase() === chave)
      grupos[chave] = { nome: permanente?.nome || nomeOriginal, itens: [] }
    }
    grupos[chave].itens.push(r)
  }

  // Ordena os grupos alfabeticamente — "Sem setor" sempre por último
  const gruposOrdenados = Object.values(grupos).sort((a, b) => {
    if (a.nome === 'Sem setor') return 1
    if (b.nome === 'Sem setor') return -1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  // Renderiza o card de um relatório do histórico
  function renderCard(r) {
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
          {aoGerarPDF && (
            <button className="botao botao-pdf" onClick={() => aoGerarPDF(r)}>
              📄 PDF
            </button>
          )}
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
  }

  return (
    <div className="pagina">
      <div className="conteudo">
        {/* Um grupo colapsável para cada setor */}
        {gruposOrdenados.map(grupo => {
          const colapsado = !!colapsados[grupo.nome]
          return (
            <div key={grupo.nome} className="grupo-setor-historico">
              <div className="grupo-setor-cabecalho" onClick={() => alternarGrupo(grupo.nome)}>
                <span className="grupo-setor-titulo">🏭 {grupo.nome}</span>
                <span className="grupo-setor-meta">
                  {grupo.itens.length} relatório(s)
                  <span className={`grupo-setor-seta ${colapsado ? '' : 'aberta'}`}>▸</span>
                </span>
              </div>
              {!colapsado && (
                <div className="grupo-setor-corpo">
                  {grupo.itens.map(renderCard)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
