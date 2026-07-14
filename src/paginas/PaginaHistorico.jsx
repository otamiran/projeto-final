// Lista os relatórios fechados (histórico permanente)
// Admin pode excluir — usuário comum só pode ver e reabrir
// Os relatórios são agrupados por setor (ignorando maiúsculas/minúsculas)
// e cada grupo pode ser recolhido/expandido

import { useState } from 'react'
import { bd, TABELA_ABERTOS, TABELA_HISTORICO, BUCKET_FOTOS } from '../utilitarios/supabase'
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

  // ── Exportar + limpar relatórios de um período (economiza espaço no Supabase) ──
  const [dataInicioExport, setDataInicioExport] = useState('')
  const [dataFimExport, setDataFimExport]       = useState('')
  const [exportando, setExportando]             = useState(false)

  // Gera um .zip com um PDF de cada relatório selecionado (padrão visual do app, com fotos),
  // depois apaga as fotos do Storage e os registros da tabela de histórico.
  async function handleExportarELimpar() {
    if (!dataInicioExport || !dataFimExport) {
      mostrarAviso('Selecione a data de início e fim do período.', true)
      return
    }
    if (dataInicioExport > dataFimExport) {
      mostrarAviso('A data de início deve ser antes (ou igual) à data de fim.', true)
      return
    }

    // Filtra os relatórios do histórico dentro do período (inclusive)
    const selecionados = historico.filter(r => r.data && r.data >= dataInicioExport && r.data <= dataFimExport)

    if (selecionados.length === 0) {
      mostrarAviso('Nenhum relatório encontrado nesse período.', true)
      return
    }

    const dataInicioBR = new Date(dataInicioExport + 'T12:00').toLocaleDateString('pt-BR')
    const dataFimBR    = new Date(dataFimExport    + 'T12:00').toLocaleDateString('pt-BR')

    pedir(
      `Exportar e APAGAR ${selecionados.length} relatório(s) entre ${dataInicioBR} e ${dataFimBR}? ` +
      'Um arquivo .zip com um PDF de cada relatório (com fotos) será baixado antes da exclusão. Esta ação NÃO pode ser desfeita.',
      async () => {
        setExportando(true)
        try {
          // 1) Gera um PDF por relatório (no padrão visual já usado no app, com fotos)
          //    e baixa tudo junto em um .zip
          mostrarAviso(`Gerando ${selecionados.length} PDF(s), aguarde...`)
          const { gerarZipDeRelatorios } = await import('../utilitarios/geradorPDF')
          await gerarZipDeRelatorios(
            selecionados,
            `relatorios_${dataInicioExport}_a_${dataFimExport}.zip`
          )

          // 2) Remove as fotos do Storage (é o que realmente ocupa mais espaço)
          for (const r of selecionados) {
            for (const item of (r.itens || [])) {
              for (const foto of (item.fotos || [])) {
                if (foto.path) await bd.storage.from(BUCKET_FOTOS).remove([foto.path])
              }
            }
          }

          // 3) Remove os registros do histórico no banco
          const ids = selecionados.map(r => r.id)
          const { error } = await bd.from(TABELA_HISTORICO).delete().in('id', ids)
          if (error) throw error

          mostrarAviso(`✓ ${selecionados.length} relatório(s) exportado(s) em PDF e removido(s) do Supabase!`)
          setDataInicioExport('')
          setDataFimExport('')
          recarregar()
        } catch (e) {
          mostrarAviso('Erro ao exportar/limpar: ' + e.message, true)
        } finally {
          setExportando(false)
        }
      }
    )
  }

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
          {/* <button className="botao botao-azul" onClick={() => reabrir(r)}>
            ↩ Reabrir
          </button> */}
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

        {/* ── Exportar e limpar relatórios de um período (só admin) ── */}
        {ehAdmin(sessao) && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-cabecalho">
              <span className="card-rotulo">📦 Exportar e Limpar Período</span>
            </div>
            <div className="card-corpo">
              <p className="texto-apagado" style={{ fontSize: 11, marginBottom: 10 }}>
                Baixa um arquivo .zip com um PDF de cada relatório do período (no mesmo padrão do
                relatório individual, com fotos) e depois os remove do Supabase para economizar espaço.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="campo" style={{ flex: '1 1 140px' }}>
                  <label>De</label>
                  <input
                    type="date"
                    value={dataInicioExport}
                    onChange={e => setDataInicioExport(e.target.value)}
                  />
                </div>
                <div className="campo" style={{ flex: '1 1 140px' }}>
                  <label>Até</label>
                  <input
                    type="date"
                    value={dataFimExport}
                    onChange={e => setDataFimExport(e.target.value)}
                  />
                </div>
                <button
                  className="botao botao-laranja"
                  onClick={handleExportarELimpar}
                  disabled={exportando}
                  style={{ height: 37 }}
                >
                  {exportando ? 'Processando...' : '📦 Exportar e Limpar'}
                </button>
              </div>
            </div>
          </div>
        )}

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
