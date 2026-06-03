// Página principal do módulo Almoxarifado.
// Orquestra ganchos, barra de ferramentas, tabela e modais.
// Segue exatamente o padrão das outras páginas do projeto (PaginaNovo, etc.).

import { useRef, useState }         from 'react'

// Ganchos
import { useAdmin }         from '../ganchos/useAdmin'
import { useAlmoxDados }    from '../ganchos/useAlmoxDados'
import { useAlmoxFiltro }   from '../ganchos/useAlmoxFiltro'

// Componentes
import TabelaAlmox          from '../componentes/TabelaAlmox'
import BarraProgressoAlmox  from '../componentes/BarraProgressoAlmox'
import ModalObs             from '../componentes/ModalObs'

// Estilo exclusivo do módulo
import '../estilos/almoxarifado.css'

// Nome do usuário salvo pelo app principal (mesmo localStorage)
function lerNomeUsuario() {
  try {
    const sessao = JSON.parse(localStorage.getItem('turno_sessao') || '{}')
    return sessao.tecnico || sessao.nome || ''
  } catch { return '' }
}

export default function PaginaAlmoxarifado({ mostrarAviso, pedir }) {
  // Ganchos de dados e autenticação
  const { ehAdmin, entrarAdmin, sair: sairAdmin } = useAdmin()
  const {
    status, lista, cabecalhos, obs,
    carregado, progresso,
    importar, limpar, salvarObservacao,
  } = useAlmoxDados({ mostrarAviso })

  // Filtro em memória
  const {
    busca, setBusca,
    colunaOrdem, direcao, alternarOrdem,
    linhasFiltradas,
  } = useAlmoxFiltro({ lista, cabecalhos, obs })

  // Linha cuja obs está sendo editada
  const [linhaObs, setLinhaObs] = useState(null)

  // Ref do input de arquivo (oculto)
  const inputArquivoRef = useRef()

  // ── Handlers ────────────────────────────────────────────────────────
  function handleImportar() {
    entrarAdmin(
      () => inputArquivoRef.current?.click(),
      msg => mostrarAviso(msg, true)
    )
  }

  function handleArquivoSelecionado(e) {
    importar(e.target.files[0])
    e.target.value = '' // permite reimportar o mesmo arquivo
  }

  function handleLimpar() {
    entrarAdmin(
      () => pedir(
        'Excluir TODA a lista do almoxarifado e os comentários? Esta ação não pode ser desfeita.',
        limpar
      ),
      msg => mostrarAviso(msg, true)
    )
  }

  async function handleSalvarObs(valor) {
    const nome = lerNomeUsuario()
    if (!nome) {
      mostrarAviso('Informe seu nome na aba "Novo" primeiro.', true)
      throw new Error('Nome não encontrado')
    }
    await salvarObservacao(linhaObs.row_idx, valor, nome)
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="pagina-almox">

      {/* ── Barra de ferramentas */}
      <div className="almox-toolbar">

        {/* Campo de busca */}
        <div className="almox-busca-wrap">
          <span className="almox-busca-icone">🔍</span>
          <input
            className="almox-busca-input"
            type="text"
            placeholder="Buscar material, código, descrição, observação..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          {busca && (
            <button className="almox-busca-limpar" onClick={() => setBusca('')} title="Limpar busca">
              ✕
            </button>
          )}
        </div>

        {/* Contador */}
        <span className="almox-contador">
          {lista.length
            ? linhasFiltradas.length === lista.length
              ? `${lista.length} itens`
              : `${linhasFiltradas.length} de ${lista.length}`
            : '—'}
        </span>

        {/* Ações de admin */}
        {ehAdmin ? (
          <>
            <div className="almox-badge-admin">
              <span>🔑</span> Admin
              <button
                className="botao botao-pequeno"
                onClick={sairAdmin}
                style={{ marginLeft: 4, fontSize: 9 }}
              >
                sair
              </button>
            </div>
            <button
              className="botao botao-destaque"
              onClick={() => inputArquivoRef.current?.click()}
              disabled={!!progresso}
            >
              📂 Importar Excel
            </button>
            <button
              className="botao botao-perigo"
              onClick={handleLimpar}
              disabled={!lista.length || !!progresso}
            >
              🗑 Excluir lista
            </button>
          </>
        ) : (
          <button
            className="botao"
            onClick={handleImportar}
            style={{ color: 'var(--cor-apagado)', fontSize: 10 }}
          >
            🔑 Admin
          </button>
        )}

        {/* Input de arquivo oculto */}
        <input
          ref={inputArquivoRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleArquivoSelecionado}
        />
      </div>

      {/* ── Barra de progresso da importação */}
      <BarraProgressoAlmox progresso={progresso} />

      {/* ── Área principal */}
      <div className="almox-area-tabela">
        {renderConteudo()}
      </div>

      {/* ── Modal de observação */}
      {linhaObs && (
        <ModalObs
          linha={linhaObs}
          cabecalhos={cabecalhos}
          obsExistente={obs[linhaObs.row_idx]}
          aoSalvar={handleSalvarObs}
          aoFechar={() => setLinhaObs(null)}
        />
      )}
    </div>
  )

  // ── Decide o que mostrar na área principal ───────────────────────────
  function renderConteudo() {
    // Carregando pela primeira vez
    if (!carregado && !lista.length) {
      return (
        <div className="almox-estado-vazio">
          <span className="pulsando" style={{ color: 'var(--ambar)', width: 14, height: 14 }} />
          <p className="almox-estado-titulo">Carregando lista...</p>
        </div>
      )
    }

    // Banco vazio
    if (!lista.length) {
      return (
        <div className="almox-estado-vazio">
          <div className="almox-estado-ico">📦</div>
          <p className="almox-estado-titulo">Nenhuma planilha carregada</p>
          <div className="almox-estado-corpo">
            <p>
              O <strong>administrador</strong> pode importar um arquivo{' '}
              <strong>.xlsx</strong> ou <strong>.csv</strong>.
            </p>
            {!ehAdmin && (
              <button
                className="botao botao-destaque"
                style={{ marginTop: 12 }}
                onClick={handleImportar}
              >
                🔑 Entrar como Admin
              </button>
            )}
          </div>
        </div>
      )
    }

    // Busca sem resultado
    if (!linhasFiltradas.length) {
      return (
        <div className="almox-estado-vazio">
          <div className="almox-estado-ico">🔍</div>
          <p className="almox-estado-titulo">Nenhum resultado para "{busca}"</p>
          <button className="botao" onClick={() => setBusca('')}>Limpar busca</button>
        </div>
      )
    }

    // Tabela
    return (
      <TabelaAlmox
        cabecalhos={cabecalhos}
        linhasFiltradas={linhasFiltradas}
        obs={obs}
        busca={busca}
        colunaOrdem={colunaOrdem}
        direcao={direcao}
        aoOrdenar={alternarOrdem}
        aoEditarObs={setLinhaObs}
      />
    )
  }
}
