import { useState, useRef } from 'react'

// Gancho de autenticação via banco (substitui useAutenticacao)
import { useAutenticacaoBD } from './ganchos/useAutenticacaoBD'
import { useRelatorios } from './ganchos/useRelatorios'
import { useAviso } from './ganchos/useAviso'
import { useConfirmacao } from './ganchos/useConfirmacao'

// Páginas
import PaginaLogin    from './paginas/PaginaLogin'
import PaginaNovo     from './paginas/PaginaNovo'
import PaginaAbertos  from './paginas/PaginaAbertos'
import PaginaHistorico from './paginas/PaginaHistorico'
import PaginaAdmin    from './paginas/PaginaAdmin'       // novo: painel admin
import PaginaProducao from './paginas/PaginaProducao'   // novo: visão produção

// Componentes de modal
import PainelItem       from './componentes/PainelItem'
import ModalVerRelatorio from './componentes/ModalVerRelatorio'
import ModalWhatsapp    from './componentes/ModalWhatsapp'
import ModalConfirmacao from './componentes/ModalConfirmacao'
import Aviso            from './componentes/Aviso'

// Almoxarifado
import PaginaAlmoxarifado from './paginas/PaginaAlmoxarifado'

// Estilos
import './estilos/global.css'
import './estilos/login.css'
import './estilos/componentes.css'
import './estilos/paginas.css'
import './estilos/producao.css'  // novo: estilos da tela de produção

export default function App() {
  // Aba ativa do app principal (manutenção e admin)
  const [aba, setAba] = useState('novo')

  // Modais de visualização e WhatsApp
  const [relatorioVendo, setRelatorioVendo] = useState(null)
  const [relatorioWa, setRelatorioWa]       = useState(null)

  // Estado do painel de item (bottom sheet)
  const [painelAberto, setPainelAberto]   = useState(false)
  const [painelTipo, setPainelTipo]       = useState('ocorrencia')
  const [itemEditando, setItemEditando]   = useState(null)
  const [indiceEditando, setIndiceEditando] = useState(null)
  const idRelatorioRef = useRef(null)

  // ── Ganchos ────────────────────────────────────────────────────────────────
  const {
    sessao, estaLogado, carregando: carregandoAuth,
    entrar, sair, atualizarIdentificacao,
    ehManutencao, ehProducao, ehAdmin,
  } = useAutenticacaoBD()

  const { abertos, historico, status, recarregar } = useRelatorios(estaLogado)
  const { aviso, mostrar: mostrarAviso }            = useAviso()
  const { confirmacaoAberta, mensagemConfirmacao, pedir, confirmar, cancelar } = useConfirmacao()

  // ── Controle do painel de item ─────────────────────────────────────────────
  const painel = {
    setIdRelatorio: id => { idRelatorioRef.current = id },
    abrirNovo: tipo => {
      setPainelTipo(tipo); setItemEditando(null); setIndiceEditando(null); setPainelAberto(true)
    },
    abrirEditar: (item, indice) => {
      setPainelTipo(item.tipo); setItemEditando(item); setIndiceEditando(indice); setPainelAberto(true)
    },
  }

  // ── Gerador de PDF (importado dinamicamente) ───────────────────────────────
  async function gerarPDF(relatorio) {
    mostrarAviso('Gerando PDF, aguarde...')
    const { gerarPDF: gerar } = await import('./utilitarios/geradorPDF')
    await gerar({
      ...relatorio,
      tecnico:     relatorio.tecnico     || relatorio.criado_por || sessao?.tecnico || '—',
      responsavel: relatorio.responsavel || relatorio.fechado_por || '—',
    })
    mostrarAviso('✓ PDF baixado!')
  }

  // ── Excluir do histórico ───────────────────────────────────────────────────
  function excluirDoHistorico(id) {
    setRelatorioVendo(null)
    pedir('Excluir permanentemente este relatório?', async () => {
      const { bd, TABELA_HISTORICO } = await import('./utilitarios/supabase')
      await bd.from(TABELA_HISTORICO).delete().eq('id', id)
      mostrarAviso('Relatório excluído.')
      recarregar()
    })
  }

  // ── Tela de login ──────────────────────────────────────────────────────────
  if (!estaLogado) {
    return <PaginaLogin aoEntrar={entrar} carregando={carregandoAuth} />
  }

  // ── Tela de produção (apenas visualização + validação) ─────────────────────
  // Produção vê apenas os relatórios abertos, sem poder editar nada
  if (ehProducao) {
    return (
      <>
        <nav className="nav">
          <div className="nav-logo">
            <div className="hexagono" />
            <span className="nav-nome">Passagem de Turno</span>
          </div>
          <div className="nav-abas">
            {/* Produção tem apenas uma visão */}
            <span className="nav-aba ativa">🏭 Produção</span>
          </div>
          <div className="nav-usuario">
            <span>{sessao.login} · 🏭 Produção</span>
            <button className="botao botao-pequeno" onClick={sair}>Sair</button>
          </div>
        </nav>
        <PaginaProducao sessao={sessao} abertos={abertos} status={status} />
        <Aviso aviso={aviso} />
      </>
    )
  }

  // ── App de manutenção + admin ──────────────────────────────────────────────
  return (
    <>
      {/* ── Navegação ── */}
      <nav className="nav">
        <div className="nav-logo">
          <div className="hexagono" src="/favicon.icon.png" />
          <span className="nav-nome">Passagem de Turno</span>
        </div>

        <div className="nav-abas">
          <button className={`nav-aba ${aba === 'novo' ? 'ativa' : ''}`} onClick={() => setAba('novo')}>
            <h1>✦</h1> Novo
          </button>
          <button className={`nav-aba ${aba === 'abertos' ? 'ativa' : ''}`} onClick={() => setAba('abertos')}>
            <h1>◉</h1> Abertos
            {abertos.length > 0 && <span className="nav-badge badge-azul">{abertos.length}</span>}
          </button>
          <button className={`nav-aba ${aba === 'historico' ? 'ativa' : ''}`} onClick={() => setAba('historico')}>
            <h1>↺</h1> Histórico
            {historico.length > 0 && <span className="nav-badge badge-laranja">{historico.length}</span>}
          </button>
          <button className={`nav-aba ${aba === 'almox' ? 'ativa' : ''}`} onClick={() => setAba('almox')}>
            <h1>📦</h1> Almoxarifado
          </button>
          {/* Aba Admin — só visível para o grupo admin */}
          {ehAdmin && (
            <button className={`nav-aba nav-aba-admin ${aba === 'admin' ? 'ativa' : ''}`} onClick={() => setAba('admin')}>
              <h1>⚙</h1> Admin
            </button>
          )}
        </div>

        <div className="nav-usuario">
          <span>
            {sessao.tecnico || sessao.nome}
            {ehAdmin && ' 👑'}
          </span>
          <button className="botao botao-pequeno" onClick={sair}>Sair</button>
        </div>
      </nav>

      {/* ── Páginas ── */}
      {aba === 'novo' && (
        <PaginaNovo
          sessao={sessao}
          abertos={abertos}
          status={status}
          painel={painel}
          pedir={pedir}
          mostrarAviso={mostrarAviso}
          recarregar={recarregar}
          aoAbrirWhatsapp={setRelatorioWa}
          atualizarIdentificacao={atualizarIdentificacao}
        />
      )}
      {aba === 'abertos' && (
        <PaginaAbertos
          abertos={abertos}
          sessao={sessao}
          aoVer={setRelatorioVendo}
          pedir={pedir}
          mostrarAviso={mostrarAviso}
          recarregar={recarregar}
        />
      )}
      {aba === 'historico' && (
        <PaginaHistorico
          historico={historico}
          sessao={sessao}
          aoVer={setRelatorioVendo}
          pedir={pedir}
          mostrarAviso={mostrarAviso}
          recarregar={recarregar}
        />
      )}
      {aba === 'almox' && (
        <PaginaAlmoxarifado mostrarAviso={mostrarAviso} pedir={pedir} />
      )}
      {aba === 'admin' && ehAdmin && (
        <PaginaAdmin
          sessao={sessao}
          historico={historico}
          pedir={pedir}
          mostrarAviso={mostrarAviso}
          aoVerRelatorio={setRelatorioVendo}
        />
      )}

      {/* ── Painel de item (bottom sheet) ── */}
      <PainelItem
        aberto={painelAberto}
        tipo={painelTipo}
        itemEditando={itemEditando}
        indiceEditando={indiceEditando}
        idRelatorio={idRelatorioRef.current}
        nomeusuario={sessao.tecnico || sessao.nome}
        aoSalvar={recarregar}
        aoFechar={() => setPainelAberto(false)}
        mostrarAviso={mostrarAviso}
      />

      {/* ── Modal: ver relatório ── */}
      <ModalVerRelatorio
        relatorio={relatorioVendo}
        sessao={sessao}
        podeExcluir={true}
        aoExcluir={excluirDoHistorico}
        aoFechar={() => setRelatorioVendo(null)}
        aoGerarPDF={gerarPDF}
        mostrarAviso={mostrarAviso}
      />

      {/* ── Modal: WhatsApp ── */}
      <ModalWhatsapp
        relatorio={relatorioWa}
        aoFechar={() => setRelatorioWa(null)}
        mostrarAviso={mostrarAviso}
      />

      {/* ── Modal: confirmação ── */}
      <ModalConfirmacao
        aberto={confirmacaoAberta}
        mensagem={mensagemConfirmacao}
        aoConfirmar={confirmar}
        aoCancelar={cancelar}
      />

      {/* ── Aviso temporário (toast) ── */}
      <Aviso aviso={aviso} />
    </>
  )
}
