// Aba "Buscar" — pesquisa, por qualquer palavra-chave usada no preenchimento,
// as ocorrências dos relatórios que estão no Histórico.
//
// Usa a mesma lista `historico` que a PaginaHistorico já recebe (vem do
// useRelatorios, com atualização em tempo real) — não faz nova consulta.
// Clicar em "Ver relatório" abre o mesmo modal do Histórico (aoVer).
//
// A lógica de busca fica em utilitarios/buscaOcorrencias.js.

import { useMemo, useState } from 'react'
import {
  extrairOcorrencias, buscarOcorrencias, termosDaBusca, trechosComDestaque,
} from '../utilitarios/buscaOcorrencias'

const POR_PAGINA = 30

// Texto com as palavras encontradas realçadas
function Destacado({ texto, termos }) {
  return (
    <>
      {trechosComDestaque(texto, termos).map((t, i) =>
        t.destaque
          ? <mark key={i} style={{ background: 'rgba(240, 165, 0, 0.35)', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>{t.texto}</mark>
          : <span key={i}>{t.texto}</span>
      )}
    </>
  )
}

function dataBR(iso) {
  return iso ? new Date(iso + 'T12:00').toLocaleDateString('pt-BR') : 'Sem data'
}

function Linha({ rotulo, valor, termos }) {
  if (!valor) return null
  return (
    <div style={{ fontSize: 13, lineHeight: 1.45 }}>
      <span className="texto-apagado" style={{ fontSize: 11 }}>{rotulo}: </span>
      <Destacado texto={String(valor)} termos={termos} />
    </div>
  )
}

function CartaoOcorrencia({ ocorrencia, termos, aoVer }) {
  const { relatorio, item, numero } = ocorrencia

  const executor = item.executor || item.autor
  const dh = Number(item.duracao_h) || 0
  const dm = Number(item.duracao_m) || 0
  const duracao = (dh || dm)
    ? ` (${[dh ? dh + 'h' : '', dm ? dm + 'min' : ''].filter(Boolean).join(' ')})`
    : ''
  const horario = (item.horario_inicio || item.horario_fim)
    ? `${item.horario_inicio || '?'} → ${item.horario_fim || '?'}${duracao}`
    : ''
  const qtdFotos = (item.fotos || []).length

  return (
    <div className="card-historico">
      <div className="card-historico-cabecalho" onClick={() => aoVer?.(relatorio)}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="card-historico-titulo">
            {relatorio.setor || 'Sem setor'} — {dataBR(relatorio.data)}
          </div>
          <div className="card-historico-meta">
            {relatorio.turno || '?'} · ocorrência {numero}{executor ? ` · ${executor}` : ''}
          </div>
        </div>
        <div className="tags">
          {relatorio.turno && <span className="tag tag-turno">{relatorio.turno}</span>}
          {qtdFotos > 0 && <span className="tag tag-foto">📷 {qtdFotos}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 13px 12px' }}>
        <Linha rotulo="Equipamento" valor={item.equipamento || item.equip} termos={termos} />
        <Linha rotulo="Sintoma" valor={item.sintoma} termos={termos} />
        <Linha rotulo="Modo de falha" valor={item.modo} termos={termos} />
        <Linha rotulo="Impacto" valor={item.impacto} termos={termos} />
        <Linha rotulo="Intervenção" valor={item.intervencao || item.tipo_int} termos={termos} />
        <Linha rotulo="Horário" valor={horario} termos={termos} />
        <Linha rotulo="Solução" valor={item.solucao} termos={termos} />
        {(item.fotos || []).filter(f => f?.legenda).map((f, i) => (
          <Linha key={i} rotulo="Legenda da foto" valor={f.legenda} termos={termos} />
        ))}
      </div>

      <div className="card-historico-acoes">
        <button className="botao botao-verde" onClick={() => aoVer?.(relatorio)}>
          👁 Ver relatório
        </button>
      </div>
    </div>
  )
}

export default function PaginaBuscaOcorrencias({ historico = [], aoVer }) {
  const [consulta, setConsulta] = useState('')
  const [setorFiltro, setSetorFiltro] = useState('')
  const [limite, setLimite] = useState(POR_PAGINA)

  // Só recalcula quando o histórico muda (não a cada tecla digitada)
  const todas = useMemo(() => extrairOcorrencias(historico), [historico])

  // Setores existentes no histórico (ignorando maiúsculas/minúsculas)
  const setores = useMemo(() => {
    const mapa = new Map()
    todas.forEach(o => {
      const nome = (o.relatorio.setor || '').trim()
      if (nome && !mapa.has(nome.toLowerCase())) mapa.set(nome.toLowerCase(), nome)
    })
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [todas])

  const termos = useMemo(() => termosDaBusca(consulta), [consulta])

  const resultados = useMemo(() => {
    const doSetor = setorFiltro
      ? todas.filter(o => (o.relatorio.setor || '').trim().toLowerCase() === setorFiltro.toLowerCase())
      : todas
    return buscarOcorrencias(doSetor, consulta)
  }, [todas, consulta, setorFiltro])

  const buscando = termos.length > 0 || !!setorFiltro
  const visiveis = resultados.slice(0, limite)

  return (
    <div className="pagina">
      <div className="conteudo">

        <div className="card">
          <div className="card-cabecalho">
            <span className="card-rotulo">🔎 Buscar ocorrências no histórico</span>
            {buscando && <span className="nav-badge badge-azul">{resultados.length}</span>}
          </div>
          <div className="card-corpo" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="campo">
              <label htmlFor="busca-palavra">Palavra-chave</label>
              <input
                id="busca-palavra"
                type="search"
                autoFocus
                placeholder="equipamento, sintoma, solução, executor, data…"
                value={consulta}
                onChange={e => { setConsulta(e.target.value); setLimite(POR_PAGINA) }}
              />
              <small>
                Procura em todos os campos preenchidos. Com mais de uma palavra, a ocorrência
                precisa conter todas. Não diferencia maiúsculas nem acentos.
              </small>
            </div>

            {setores.length > 1 && (
              <div className="campo">
                <label htmlFor="busca-setor">Setor</label>
                <select
                  id="busca-setor"
                  value={setorFiltro}
                  onChange={e => { setSetorFiltro(e.target.value); setLimite(POR_PAGINA) }}
                >
                  <option value="">Todos os setores</option>
                  {setores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {todas.length === 0 && (
          <div className="vazio">
            <div className="icone-vazio">🔎</div>
            <p>Nenhuma ocorrência no histórico ainda.</p>
          </div>
        )}

        {todas.length > 0 && !buscando && (
          <div className="vazio">
            <div className="icone-vazio">🔎</div>
            <p>Digite uma palavra para pesquisar.</p>
            <p>{todas.length} ocorrência(s) no histórico</p>
          </div>
        )}

        {buscando && resultados.length === 0 && (
          <div className="vazio">
            <div className="icone-vazio">🤷</div>
            <p>Nenhuma ocorrência encontrada{consulta.trim() ? ` para “${consulta.trim()}”` : ''}.</p>
            <p>Tente uma palavra mais curta ou sem acento.</p>
          </div>
        )}

        {buscando && visiveis.map(o => (
          <CartaoOcorrencia key={o.chave} ocorrencia={o} termos={termos} aoVer={aoVer} />
        ))}

        {buscando && resultados.length > visiveis.length && (
          <div style={{ textAlign: 'center' }}>
            <button className="botao botao-azul" onClick={() => setLimite(l => l + POR_PAGINA)}>
              Mostrar mais ({resultados.length - visiveis.length} restantes)
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
