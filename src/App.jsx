import { useState, useRef } from 'react'

import { useAutenticacaoBD }  from './ganchos/useAutenticacaoBD'
import { useRelatorios }       from './ganchos/useRelatorios'
import { useAviso }            from './ganchos/useAviso'
import { useConfirmacao }      from './ganchos/useConfirmacao'

import PaginaLogin         from './paginas/PaginaLogin'
import PaginaNovo          from './paginas/PaginaNovo'
import PaginaAbertos       from './paginas/PaginaAbertos'
import PaginaHistorico     from './paginas/PaginaHistorico'
import PaginaAdmin         from './paginas/PaginaAdmin'
import PaginaProducao      from './paginas/PaginaProducao'
import PaginaFCA           from './paginas/PaginaFCA'
import PaginaFCAProducao   from './paginas/PaginaFCAProducao'
import PaginaAlmoxarifado  from './paginas/PaginaAlmoxarifado'

import PainelItem          from './componentes/PainelItem'
import ModalVerRelatorio   from './componentes/ModalVerRelatorio'
import ModalWhatsapp       from './componentes/ModalWhatsapp'
import ModalConfirmacao    from './componentes/ModalConfirmacao'
import Aviso               from './componentes/Aviso'

import './estilos/global.css'
import './estilos/login.css'
import './estilos/componentes.css'
import './estilos/paginas.css'
import './estilos/producao.css'
import './estilos/fca.css'

export default function App() {
  const [aba, setAba] = useState('novo')

  const [relatorioVendo, setRelatorioVendo] = useState(null)
  const [relatorioWa,    setRelatorioWa]    = useState(null)

  const [painelAberto,     setPainelAberto]     = useState(false)
  const [painelTipo,       setPainelTipo]       = useState('ocorrencia')
  const [itemEditando,     setItemEditando]     = useState(null)
  const [indiceEditando,   setIndiceEditando]   = useState(null)
  const idRelatorioRef = useRef(null)

  const {
    sessao, estaLogado, carregando: carregandoAuth,
    entrar, sair, atualizarIdentificacao,
    ehManutencao, ehProducao, ehAdmin,
  } = useAutenticacaoBD()

  const { abertos, historico, status, recarregar } = useRelatorios(estaLogado)
  const { aviso, mostrar: mostrarAviso }            = useAviso()
  const { confirmacaoAberta, mensagemConfirmacao, pedir, confirmar, cancelar } = useConfirmacao()

  const painel = {
    setIdRelatorio: id => { idRelatorioRef.current = id },
    abrirNovo:    tipo         => { setPainelTipo(tipo); setItemEditando(null);  setIndiceEditando(null);  setPainelAberto(true) },
    abrirEditar:  (item, idx)  => { setPainelTipo(item.tipo); setItemEditando(item); setIndiceEditando(idx); setPainelAberto(true) },
  }

  async function gerarPDF(relatorio) {
    mostrarAviso('Gerando PDF, aguarde...')
    const { gerarPDF: gerar } = await import('./utilitarios/geradorPDF')
    await gerar({
      ...relatorio,
      tecnico:     relatorio.tecnico     || relatorio.criado_por  || sessao?.tecnico     || '—',
      responsavel: relatorio.responsavel || sessao?.responsavel   || '—',
    })
    mostrarAviso('✓ PDF baixado!')
  }

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

  // ── Tela de produção ───────────────────────────────────────────────────────
  if (ehProducao) {
    return (
      <>
        <nav className="nav">
          <div className="nav-logo">
            <img src="/favicon.icon.png" alt="Logo" className="logo-favicon" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            <span className="nav-nome">Passagem de Turno</span>
          </div>
          <div className="nav-abas">
            <button className={`nav-aba ${aba === 'producao' ? 'ativa' : ''}`} onClick={() => setAba('producao')}>
              🏭 Relatórios
            </button>
            <button className={`nav-aba nav-aba-fca ${aba === 'fca' ? 'ativa' : ''}`} onClick={() => setAba('fca')}>
              📋 FCAs
            </button>
          </div>
          <div className="nav-usuario">
            <span>{sessao.login} · 🏭</span>
            <button className="botao botao-pequeno" onClick={sair}>Sair</button>
          </div>
        </nav>

        {aba === 'producao' && (
          <PaginaProducao sessao={sessao} abertos={abertos} status={status} />
        )}
        {aba === 'fca' && (
          <PaginaFCAProducao sessao={sessao} mostrarAviso={mostrarAviso} />
        )}

        <Aviso aviso={aviso} />
      </>
    )
  }

  // ── App manutenção + admin ─────────────────────────────────────────────────
  return (
    <>
      <nav className="nav">
        <div className="nav-logo">
          <img src="/favicon.icon.png" alt="Logo" className="logo-favicon" style={{ width: 26, height: 26, objectFit: 'contain' }} />
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
            <h1>📦</h1> Almox
          </button>
          <button className={`nav-aba nav-aba-fca ${aba === 'fca' ? 'ativa' : ''}`} onClick={() => setAba('fca')}>
            <h1>📋</h1> FCA
          </button>
          {ehAdmin && (
            <button className={`nav-aba nav-aba-admin ${aba === 'admin' ? 'ativa' : ''}`} onClick={() => setAba('admin')}>
              <h1>⚙</h1> Admin
            </button>
          )}
        </div>

        <div className="nav-usuario">
          <span>{sessao.tecnico || sessao.nome}{ehAdmin && ' 👑'}</span>
          <button className="botao botao-pequeno" onClick={sair}>Sair</button>
        </div>
      </nav>

      {aba === 'novo' && (
        <PaginaNovo
          sessao={sessao} abertos={abertos} status={status} painel={painel}
          pedir={pedir} mostrarAviso={mostrarAviso} recarregar={recarregar}
          aoAbrirWhatsapp={setRelatorioWa} atualizarIdentificacao={atualizarIdentificacao}
        />
      )}
      {aba === 'abertos' && (
        <PaginaAbertos
          abertos={abertos} sessao={sessao} aoVer={setRelatorioVendo}
          pedir={pedir} mostrarAviso={mostrarAviso} recarregar={recarregar}
        />
      )}
      {aba === 'historico' && (
        <PaginaHistorico
          historico={historico} sessao={sessao} aoVer={setRelatorioVendo}
          pedir={pedir} mostrarAviso={mostrarAviso} recarregar={recarregar}
          aoGerarPDF={gerarPDF}
        />
      )}
      {aba === 'almox' && (
        <PaginaAlmoxarifado mostrarAviso={mostrarAviso} pedir={pedir} />
      )}
      {aba === 'fca' && (
        <PaginaFCA sessao={sessao} pedir={pedir} mostrarAviso={mostrarAviso} />
      )}
      {aba === 'admin' && ehAdmin && (
        <PaginaAdmin
          sessao={sessao} historico={historico}
          pedir={pedir} mostrarAviso={mostrarAviso} aoVerRelatorio={setRelatorioVendo}
        />
      )}

      <PainelItem
        aberto={painelAberto} tipo={painelTipo}
        itemEditando={itemEditando} indiceEditando={indiceEditando}
        idRelatorio={idRelatorioRef.current}
        nomeusuario={sessao.tecnico || sessao.nome}
        aoSalvar={recarregar} aoFechar={() => setPainelAberto(false)}
        mostrarAviso={mostrarAviso}
      />

      <ModalVerRelatorio
        relatorio={relatorioVendo} sessao={sessao} podeExcluir={true}
        aoExcluir={excluirDoHistorico} aoFechar={() => setRelatorioVendo(null)}
        aoGerarPDF={gerarPDF} mostrarAviso={mostrarAviso}
      />

      <ModalWhatsapp
        relatorio={relatorioWa} aoFechar={() => setRelatorioWa(null)} mostrarAviso={mostrarAviso}
      />

      <ModalConfirmacao
        aberto={confirmacaoAberta} mensagem={mensagemConfirmacao}
        aoConfirmar={confirmar} aoCancelar={cancelar}
      />

      <Aviso aviso={aviso} />
    </>
  )
}
