import { useState, useEffect, useCallback } from 'react'
import {
  CHAVE_DB, listar, atualizar,
  atualizarTodos, excluir as excluirLinha, definirEstrutura,
} from './db.js'
import {
  buscarEstruturaRemota, criarRemoto, atualizarRemoto, excluirRemoto,
} from './remoto.js'
import PainelHierarquia from './componentes/PainelHierarquia.jsx'
import RelatorioModal from './componentes/RelatorioModal.jsx'
import './estilos.css'

// Módulo "Ronda de Produção", integrado ao Passagem de Turno.
// `ehAdmin` vem da sessão já logada no app principal — substitui a antiga
// senha própria da ronda (SENHA_ADMIN/LoginAdmin): só administradores do
// sistema principal conseguem entrar no modo "Gerenciar" (editar a
// estrutura de setores/grupos/máquinas/estações).
export default function RondaApp({ ehAdmin = false }) {
  const [setores, setSetores]   = useState([])
  const [grupos, setGrupos]     = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [estacoes, setEstacoes] = useState([])
  const [operador, setOperador] = useState(() => localStorage.getItem('ronda-operador') || '')
  const [gerenciar, setGerenciar]       = useState(false)
  const [verRelatorio, setVerRelatorio] = useState(false)
  const [carregando, setCarregando]     = useState(true)
  const [erro, setErro]                 = useState('')

  // ── carregar (local) ──────────────────────────────────────
  // Relê apenas o que já está salvo neste aparelho (sem rede) —
  // usado depois de alterar status/observação, que é 100% local.
  const carregarLocal = useCallback(() => {
    try {
      setSetores(listar('setores',   { ordenarPor: ['ordem', 'criado_em'] }))
      setGrupos(listar('grupos',     { ordenarPor: ['ordem', 'criado_em'] }))
      setMaquinas(listar('maquinas', { ordenarPor: ['ordem', 'criado_em'] }))
      const estacoesOrdenadas = listar('estacoes').sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' })
      )
      setEstacoes(estacoesOrdenadas)
    } catch (e) {
      setErro(`Erro ao carregar dados salvos no aparelho: ${e.message}`)
    }
  }, [])

  // ── carregar (remoto) ─────────────────────────────────────
  // Sempre que o app abre — e depois de qualquer alteração
  // estrutural — busca a lista/hierarquia de equipamentos no
  // Supabase e mescla com o status local (que nunca vai pro banco).
  const carregar = useCallback(async () => {
    try {
      const remoto = await buscarEstruturaRemota()
      definirEstrutura('setores', remoto.setores)
      definirEstrutura('grupos', remoto.grupos)
      definirEstrutura('maquinas', remoto.maquinas)
      definirEstrutura('estacoes', remoto.estacoes)
      setErro('')
    } catch (e) {
      setErro(`Não foi possível buscar a lista de equipamentos no banco (${e.message}). Mostrando a última lista salva neste aparelho.`)
    }
    carregarLocal()
    setCarregando(false)
  }, [carregarLocal])

  useEffect(() => {
    carregar()
    // se o app estiver aberto em mais de uma aba deste mesmo aparelho,
    // mantém as abas em sincronia quando o localStorage muda
    const aoMudarStorage = e => { if (e.key === CHAVE_DB) carregarLocal() }
    window.addEventListener('storage', aoMudarStorage)
    return () => window.removeEventListener('storage', aoMudarStorage)
  }, [carregar, carregarLocal])

  const salvarOperador = v => { setOperador(v); localStorage.setItem('ronda-operador', v) }

  // ── botão "Salvar" fixo no rodapé ────────────────────────────
  // reflete o estado (pendente / salvando / função salvar) da máquina que
  // está aberta no momento na coluna de detalhe, pra não depender de rolar
  // até o fim da tela pra encontrar o botão de salvar dela.
  const [estadoSalvar, setEstadoSalvar] = useState(null)
  const aoMudarEstadoSalvar = useCallback(estado => setEstadoSalvar(estado), [])
  const salvarPendenteAtual = () => estadoSalvar?.salvar?.()

  // ── salvar lote ───────────────────────────────────────────
  const salvarLote = useCallback((maquinaId, draftMaq, draftEst, op) => {
    const usuario = op || '—'
    const agora   = new Date().toISOString()
    const temObs  = status => status === 'pendencia' || status === 'parada'
    try {
      atualizar('maquinas', maquinaId, {
        status: draftMaq.status,
        obs: temObs(draftMaq.status) ? (draftMaq.obs || '') : '',
        usuario, atualizado_em: agora,
      })
      Object.entries(draftEst).forEach(([estId, d]) => {
        atualizar('estacoes', estId, {
          status: d.status,
          obs: temObs(d.status) ? (d.obs || '') : '',
          usuario, atualizado_em: agora,
        })
      })
      carregarLocal()
    } catch (e) {
      setErro(`Erro ao salvar: ${e.message}`)
    }
  }, [carregarLocal])

  // ── modo "Gerenciar" ───────────────────────────────────────
  // Antes exigia uma senha própria (SENHA_ADMIN) guardada no código da
  // ronda. Agora usa o mesmo controle de administrador do Passagem de
  // Turno: só quem já está logado como admin no app principal pode
  // editar a estrutura (setores/grupos/máquinas/estações).
  const clicarGerenciar = () => {
    if (!ehAdmin) return
    setGerenciar(g => !g)
  }

  // se o usuário deixar de ser admin durante a sessão (ex.: logout/troca de
  // conta), sai automaticamente do modo de edição
  useEffect(() => {
    if (!ehAdmin && gerenciar) setGerenciar(false)
  }, [ehAdmin, gerenciar])

  // ── estrutura (sempre enviada e buscada do banco) ─────────
  const addSetor = async nome => {
    if (!nome.trim()) return
    try {
      await criarRemoto('setores', { nome: nome.trim(), ordem: setores.length })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const addGrupo = async (setorId, nome) => {
    if (!nome.trim()) return
    try {
      await criarRemoto('grupos', { setor_id: setorId, nome: nome.trim(), ordem: grupos.filter(g => g.setor_id === setorId).length })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  // máquinas sempre ligadas a um grupo agora
  const addMaquina = async (grupoId, nome) => {
    if (!nome.trim()) return
    // descobre setor_id pelo grupo
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    try {
      await criarRemoto('maquinas', {
        setor_id: grupo.setor_id,
        grupo_id: grupoId,
        nome: nome.trim(),
        ordem: maquinas.filter(m => m.grupo_id === grupoId).length,
      })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const addEstacao = async (maquinaId, nome) => {
    if (!nome.trim()) return
    try {
      await criarRemoto('estacoes', { maquina_id: maquinaId, nome: nome.trim() })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const renomear = async (tabela, id, nome) => {
    try {
      await atualizarRemoto(tabela, id, { nome })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  // ── reordenar ─────────────────────────────────────────────
  const reordenarLista = async (tabela, lista, id, direcao) => {
    const ordenados = lista.slice().sort((a, b) =>
      (a.ordem ?? 0) - (b.ordem ?? 0) || (a.criado_em || '').localeCompare(b.criado_em || '')
    )
    const idx = ordenados.findIndex(i => i.id === id)
    const novoIdx = idx + direcao
    if (idx === -1 || novoIdx < 0 || novoIdx >= ordenados.length) return
    const trocado = ordenados.slice()
    ;[trocado[idx], trocado[novoIdx]] = [trocado[novoIdx], trocado[idx]]
    try {
      await Promise.all(trocado.map((item, i) => atualizarRemoto(tabela, item.id, { ordem: i })))
      await carregar()
    } catch (e) { setErro(`Erro ao reordenar: ${e.message}`) }
  }

  const moverGrupo = (grupoId, direcao) => {
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    const irmaos = grupos.filter(g => g.setor_id === grupo.setor_id)
    reordenarLista('grupos', irmaos, grupoId, direcao)
  }

  const moverMaquina = (maquinaId, direcao) => {
    const maquina = maquinas.find(m => m.id === maquinaId)
    if (!maquina) return
    const irmas = maquina.grupo_id
      ? maquinas.filter(m => m.grupo_id === maquina.grupo_id)
      : maquinas.filter(m => !m.grupo_id && m.setor_id === maquina.setor_id)
    reordenarLista('maquinas', irmas, maquinaId, direcao)
  }

  const excluir = async (tabela, id) => {
    try {
      await excluirRemoto(tabela, id)
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  // ── limpar ronda ────────────────────────────────────────
  // Antes ("Encerrar ronda") isto salvava um snapshot em `historico_rondas`
  // / `historico_itens` e podia ser revisto depois em "📋 Histórico". Esse
  // histórico foi eliminado do módulo — agora o botão só reseta o status
  // marcado (produzindo/parada/pendência) de todas as máquinas e estações,
  // sem guardar nada.
  const limparRonda = () => {
    if (!window.confirm('Limpar todas as marcações da ronda atual? Esta ação não pode ser desfeita.')) return
    try {
      const limpo = { status: null, obs: '', usuario: '', atualizado_em: null }
      atualizarTodos('maquinas', limpo)
      atualizarTodos('estacoes', limpo)
      carregarLocal()
    } catch (e) {
      setErro(`Erro ao limpar ronda: ${e.message}`)
      return
    }
    setVerRelatorio(false)
  }

  const gerarRelatorio = () => setVerRelatorio(true)

  const total  = maquinas.length + estacoes.length
  const feitas = maquinas.filter(m => m.status).length + estacoes.filter(e => e.status).length

  if (carregando) return <div className="ronda-modulo"><div className="carregando">Carregando…</div></div>

  return (
    <div className="ronda-modulo">
    <div className="app">
      <header className="topo">
        <div className="marca">
          <div>
            <h1>Ronda de Produção</h1>
            <div className="sub">{feitas}/{total} verificações · salvo neste aparelho</div>
          </div>
        </div>
        <div className="topo-acoes">
          <input
            className="campo-operador"
            value={operador}
            onChange={e => salvarOperador(e.target.value)}
            placeholder="Seu nome (opcional)"
          />
          {ehAdmin && (
            <button className={`fantasma ${gerenciar ? 'ativo' : ''}`} onClick={clicarGerenciar}>
              {gerenciar ? '🔓 Sair edição' : '⚙ Gerenciar'}
            </button>
          )}
        </div>
      </header>

      <div className="trilha-progresso">
        <div className="preenchimento-progresso" style={{ width: total ? `${(feitas/total)*100}%` : 0 }} />
      </div>

      <main className="main-arvore">
        {erro && (
          <div className="erro">
            {erro}
            <button className="fechar-erro" onClick={() => setErro('')}>✕</button>
          </div>
        )}

        {setores.length === 0 && !gerenciar ? (
          <div className="vazio" style={{ margin: 'auto' }}>
            {ehAdmin
              ? <>Nenhum setor cadastrado.{' '}
                  <button className="link-btn" onClick={clicarGerenciar}>Clique em ⚙ Gerenciar</button> para começar.
                </>
              : 'Nenhum setor cadastrado ainda. Peça a um administrador para configurar a estrutura em ⚙ Gerenciar.'}
          </div>
        ) : (
          <PainelHierarquia
            setores={setores}
            grupos={grupos}
            maquinas={maquinas}
            estacoes={estacoes}
            gerenciar={gerenciar}
            operador={operador}
            bloqueado={false}
            aoSalvarLote={salvarLote}
            aoAddSetor={addSetor}
            aoAddGrupo={addGrupo}
            aoAddMaquina={addMaquina}
            aoAddEstacao={addEstacao}
            aoExcluir={excluir}
            aoRenomear={renomear}
            aoMoverGrupo={moverGrupo}
            aoMoverMaquina={moverMaquina}
            aoMudarEstadoSalvar={aoMudarEstadoSalvar}
          />
        )}
      </main>

      <footer className="rodape">
        <button className="secundario" onClick={limparRonda}>Limpar ronda</button>
        <button
          className="primario btn-salvar-rodape"
          onClick={salvarPendenteAtual}
          disabled={!estadoSalvar?.pendente || estadoSalvar?.salvando}
          title={estadoSalvar?.pendente ? 'Salvar alterações da máquina aberta' : 'Nenhuma alteração pendente'}
        >
          {estadoSalvar?.salvando ? 'Salvando…' : (estadoSalvar?.pendente ? '💾 Salvar' : '✓ Salvo')}
        </button>
        <button className="primario" onClick={gerarRelatorio}>📲 WhatsApp</button>
      </footer>

      {verRelatorio && (
        <RelatorioModal
          setores={setores}
          grupos={grupos}
          maquinas={maquinas}
          estacoes={estacoes}
          operador={operador}
          aoFechar={() => setVerRelatorio(false)}
        />
      )}
    </div>
    </div>
  )
}
