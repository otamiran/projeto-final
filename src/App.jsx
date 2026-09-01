import { useState, useRef } from 'react'

import { useAutenticacaoBD }  from './ganchos/useAutenticacaoBD'
import { useRelatorios }       from './ganchos/useRelatorios'
import { useAviso }            from './ganchos/useAviso'
import { useConfirmacao }      from './ganchos/useConfirmacao'
import { useEstruturaEquipamentos } from './ganchos/useEstruturaEquipamentos'
import { useNotificacoesPush } from './ganchos/useNotificacoesPush'
import { useNotificacoesTempoReal } from './ganchos/useNotificacoesTempoReal'
import { useNotificacoesManutencaoTempoReal } from './ganchos/useNotificacoesManutencaoTempoReal'
import { useAbrirRelatorioDaNotificacao } from './ganchos/useAbrirRelatorioDaNotificacao'
import { useMesclarDuplicados } from './ganchos/useMesclarDuplicados'

import PaginaLogin         from './paginas/PaginaLogin'
import PaginaNovo          from './paginas/PaginaNovo'
import PaginaAbertos       from './paginas/PaginaAbertos'
import PaginaHistorico     from './paginas/PaginaHistorico'
import PaginaAdmin         from './paginas/PaginaAdmin'
import PaginaProducao      from './paginas/PaginaProducao'
import PaginaFCA           from './paginas/PaginaFCA'
import PaginaFCAProducao   from './paginas/PaginaFCAProducao'
import PaginaAlmoxarifado  from './paginas/PaginaAlmoxarifado'
import PaginaManutencao    from './paginas/PaginaManutencao'
import RondaApp            from './ronda/RondaApp'

import PainelItem          from './componentes/PainelItem'
import ModalVerRelatorio   from './componentes/ModalVerRelatorio'
import ModalConfirmacao    from './componentes/ModalConfirmacao'
import Aviso               from './componentes/Aviso'

import { ABA_ALMOX_ATIVA, ABA_RONDA_ATIVA } from './utilitarios/constantes'

import './estilos/global.css'
import './estilos/login.css'
import './estilos/componentes.css'
import './estilos/paginas.css'
import './estilos/producao.css'
import './estilos/fca.css'

export default function App() {
  const [aba, setAba] = useState('novo')
  // Controla o menu de abas "flutuante" no celular: fica recolhido por
  // padrão e só aparece ao tocar no ícone de menu (☰) na barra superior.
  const [menuAbasAberto, setMenuAbasAberto] = useState(false)

  const [relatorioVendo, setRelatorioVendo] = useState(null)
  // Guarda o ID de um relatório recém-reaberto do Histórico, para a PaginaNovo
  // selecioná-lo automaticamente assim que a aba "Novo" for exibida.
  const [idParaAbrirNovo, setIdParaAbrirNovo] = useState(null)

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
  useNotificacoesTempoReal(abertos)
  // Notifica (mesma técnica: showNotification local, sem depender de push)
  // quando um manutentor inicia ou conclui o atendimento de um equipamento.
  useNotificacoesManutencaoTempoReal(estaLogado)
  useAbrirRelatorioDaNotificacao(abertos, historico, setRelatorioVendo)
  const equipamentosGancho = useEstruturaEquipamentos(estaLogado)
  const { aviso, mostrar: mostrarAviso }            = useAviso()
  const { status: statusNotif, alternar: alternarNotif } = useNotificacoesPush(sessao, mostrarAviso)
  const { confirmacaoAberta, mensagemConfirmacao, pedir, confirmar, cancelar } = useConfirmacao()

  // Se dois relatórios abertos existirem para o mesmo setor+turno+dia,
  // pergunta ao usuário se pode uni-los em um só (ver gancho para detalhes).
  useMesclarDuplicados(abertos, pedir, mostrarAviso, recarregar)

  // Seleciona uma aba e, no celular, recolhe o menu flutuante de abas.
  function selecionarAba(novaAba) {
    setAba(novaAba)
    setMenuAbasAberto(false)
  }

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

  // Chamado pela PaginaHistorico após reabrir um relatório: leva o usuário
  // para a aba "Novo" já com esse relatório selecionado para preenchimento.
  function handleReabrirParaPreenchimento(idRelatorio) {
    if (!idRelatorio) return
    setAba('novo')
    setIdParaAbrirNovo(idRelatorio)
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
          {/* Ícone de menu — só aparece no celular; abre/fecha as abas flutuantes */}
          <button
            className="nav-menu-toggle"
            onClick={() => setMenuAbasAberto(a => !a)}
            aria-label="Abrir menu de abas"
            aria-expanded={menuAbasAberto}
          >
            ☰
          </button>
          {menuAbasAberto && <div className="nav-abas-overlay" onClick={() => setMenuAbasAberto(false)} />}
          <div className={`nav-abas ${menuAbasAberto ? 'aberta' : ''}`}>
            <button className={`nav-aba ${aba === 'producao' ? 'ativa' : ''}`} onClick={() => selecionarAba('producao')}>
              🏭 Relatórios
            </button>
            <button className={`nav-aba nav-aba-fca ${aba === 'fca' ? 'ativa' : ''}`} onClick={() => selecionarAba('fca')}>
              📋 FCAs
            </button>
            {ABA_RONDA_ATIVA && (
              <button className={`nav-aba ${aba === 'ronda' ? 'ativa' : ''}`} onClick={() => selecionarAba('ronda')}>
                🔄 Ronda
              </button>
            )}
            <button className={`nav-aba ${aba === 'manutencao' ? 'ativa' : ''}`} onClick={() => selecionarAba('manutencao')}>
              🔧 Manutenção
            </button>
          </div>
          <div className="nav-usuario">
            {statusNotif !== 'indisponivel' && (
              <button
                className="botao botao-pequeno"
                onClick={alternarNotif}
                disabled={statusNotif === 'carregando' || statusNotif === 'negado'}
                title={
                  statusNotif === 'negado'
                    ? 'Notificações bloqueadas nas configurações do navegador'
                    : statusNotif === 'ativo'
                    ? 'Desativar notificações de novas ocorrências'
                    : 'Ativar notificações de novas ocorrências'
                }
              >
                {statusNotif === 'ativo' ? '🔔' : statusNotif === 'negado' ? '🔕' : '🔔'}
              </button>
            )}
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
        {ABA_RONDA_ATIVA && aba === 'ronda' && (
          <RondaApp ehAdmin={ehAdmin} />
        )}
        {aba === 'manutencao' && (
          <PaginaManutencao sessao={sessao} mostrarAviso={mostrarAviso} />
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

        {/* Ícone de menu — só aparece no celular; abre/fecha as abas flutuantes */}
        <button
          className="nav-menu-toggle"
          onClick={() => setMenuAbasAberto(a => !a)}
          aria-label="Abrir menu de abas"
          aria-expanded={menuAbasAberto}
        >
          ☰
        </button>
        {menuAbasAberto && <div className="nav-abas-overlay" onClick={() => setMenuAbasAberto(false)} />}

        <div className={`nav-abas ${menuAbasAberto ? 'aberta' : ''}`}>
          <button className={`nav-aba ${aba === 'novo' ? 'ativa' : ''}`} onClick={() => selecionarAba('novo')}>
            <h1>✦</h1> Novo
          </button>
          <button className={`nav-aba ${aba === 'abertos' ? 'ativa' : ''}`} onClick={() => selecionarAba('abertos')}>
            <h1>◉</h1> Abertos
            {abertos.length > 0 && <span className="nav-badge badge-azul">{abertos.length}</span>}
          </button>
          <button className={`nav-aba ${aba === 'historico' ? 'ativa' : ''}`} onClick={() => selecionarAba('historico')}>
            <h1>↺</h1> Histórico
            {historico.length > 0 && <span className="nav-badge badge-laranja">{historico.length}</span>}
          </button>
          {ABA_ALMOX_ATIVA && (
            <button className={`nav-aba ${aba === 'almox' ? 'ativa' : ''}`} onClick={() => selecionarAba('almox')}>
              <h1>📦</h1> Almox
            </button>
          )}
          <button className={`nav-aba nav-aba-fca ${aba === 'fca' ? 'ativa' : ''}`} onClick={() => selecionarAba('fca')}>
            <h1>📋</h1> FCA
          </button>
          {ABA_RONDA_ATIVA && (
            <button className={`nav-aba ${aba === 'ronda' ? 'ativa' : ''}`} onClick={() => selecionarAba('ronda')}>
              <h1>🔄</h1> Ronda
            </button>
          )}
          <button className={`nav-aba ${aba === 'manutencao' ? 'ativa' : ''}`} onClick={() => selecionarAba('manutencao')}>
            <h1>🔧</h1> Manutenção
          </button>
          {ehAdmin && (
            <button className={`nav-aba nav-aba-admin ${aba === 'admin' ? 'ativa' : ''}`} onClick={() => selecionarAba('admin')}>
              <h1>⚙</h1> Admin
            </button>
          )}
        </div>

        <div className="nav-usuario">
          {statusNotif !== 'indisponivel' && (
            <button
              className="botao botao-pequeno"
              onClick={alternarNotif}
              disabled={statusNotif === 'carregando' || statusNotif === 'negado'}
              title={
                statusNotif === 'negado'
                  ? 'Notificações bloqueadas nas configurações do navegador'
                  : statusNotif === 'ativo'
                  ? 'Desativar notificações de novas ocorrências'
                  : 'Ativar notificações de novas ocorrências'
              }
            >
              {statusNotif === 'ativo' ? '🔔' : statusNotif === 'negado' ? '🔕' : '🔔'}
            </button>
          )}
          <span>{sessao.tecnico || sessao.nome}{ehAdmin && ' 👑'}</span>
          <button className="botao botao-pequeno" onClick={sair}>Sair</button>
        </div>
      </nav>

      {aba === 'novo' && (
        <PaginaNovo
          sessao={sessao} abertos={abertos} status={status} painel={painel}
          pedir={pedir} mostrarAviso={mostrarAviso} recarregar={recarregar}
          atualizarIdentificacao={atualizarIdentificacao}
          ehAdmin={ehAdmin}
          idParaSelecionar={idParaAbrirNovo}
          aoConsumirSelecao={() => setIdParaAbrirNovo(null)}
        />
      )}
      {aba === 'abertos' && (
        <PaginaAbertos
          abertos={abertos} sessao={sessao} aoVer={setRelatorioVendo}
          pedir={pedir} mostrarAviso={mostrarAviso} recarregar={recarregar}
          ehAdmin={ehAdmin} aoGerarPDF={gerarPDF}
        />
      )}
      {aba === 'historico' && (
        <PaginaHistorico
          historico={historico} sessao={sessao} aoVer={setRelatorioVendo}
          pedir={pedir} mostrarAviso={mostrarAviso} recarregar={recarregar}
          aoGerarPDF={gerarPDF}
          aoReabrir={handleReabrirParaPreenchimento}
        />
      )}
      {ABA_ALMOX_ATIVA && aba === 'almox' && (
        <PaginaAlmoxarifado mostrarAviso={mostrarAviso} pedir={pedir} />
      )}
      {aba === 'fca' && (
        <PaginaFCA sessao={sessao} pedir={pedir} mostrarAviso={mostrarAviso} />
      )}
      {ABA_RONDA_ATIVA && aba === 'ronda' && (
        <RondaApp ehAdmin={ehAdmin} />
      )}
      {aba === 'manutencao' && (
        <PaginaManutencao sessao={sessao} mostrarAviso={mostrarAviso} />
      )}
      {aba === 'admin' && ehAdmin && (
        <PaginaAdmin
          sessao={sessao} historico={historico}
          pedir={pedir} mostrarAviso={mostrarAviso} aoVerRelatorio={setRelatorioVendo}
          equipamentosGancho={equipamentosGancho}
        />
      )}

      <PainelItem
        aberto={painelAberto} tipo={painelTipo}
        itemEditando={itemEditando} indiceEditando={indiceEditando}
        idRelatorio={idRelatorioRef.current}
        nomeusuario={sessao.tecnico || sessao.nome}
        equipamentos={equipamentosGancho.equipamentos}
        aoSalvar={recarregar} aoFechar={() => setPainelAberto(false)}
        mostrarAviso={mostrarAviso}
      />

      <ModalVerRelatorio
        relatorio={relatorioVendo} sessao={sessao} podeExcluir={true}
        aoExcluir={excluirDoHistorico} aoFechar={() => setRelatorioVendo(null)}
        aoGerarPDF={gerarPDF} mostrarAviso={mostrarAviso}
      />

      <ModalConfirmacao
        aberto={confirmacaoAberta} mensagem={mensagemConfirmacao}
        aoConfirmar={confirmar} aoCancelar={cancelar}
      />

      <Aviso aviso={aviso} />
    </>
  )
}
