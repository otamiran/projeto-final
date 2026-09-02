// Exibe (somente leitura) os dados da ocorrência que originou um FCA.
// Usado lado a lado com o FCA (form ou card) na tela de FCA — ver PaginaFCA.jsx.

// Formata duração "1h 30min" / "45min" / "2h" — ou null se não preenchida
function formatarDuracao(h, m) {
  const hNum = Number(h) || 0
  const mNum = Number(m) || 0
  if (!hNum && !mNum) return null
  return [hNum ? `${hNum}h` : '', mNum ? `${mNum}min` : ''].filter(Boolean).join(' ')
}

function Linha({ rotulo, valor }) {
  if (!valor) return null
  return (
    <div className="ocorrencia-origem-linha">
      <span className="ocorrencia-origem-rotulo">{rotulo}</span>
      <span className="ocorrencia-origem-valor">{valor}</span>
    </div>
  )
}

function Bloco({ icone, titulo, texto }) {
  if (!texto) return null
  return (
    <div className="fca-secao">
      <div className="fca-secao-header"><span>{icone}</span><span>{titulo}</span></div>
      <p className="fca-texto">{texto}</p>
    </div>
  )
}

export default function VisualizarOcorrencia({ ocorrencia }) {
  if (!ocorrencia) return null

  const dataRelatorio = ocorrencia.data
    ? new Date(ocorrencia.data + 'T12:00').toLocaleDateString('pt-BR')
    : null
  const duracao = formatarDuracao(ocorrencia.duracao_h, ocorrencia.duracao_m)
  const horario = ocorrencia.horario_inicio || ocorrencia.horario_fim
    ? `${ocorrencia.horario_inicio || '?'} → ${ocorrencia.horario_fim || '?'}${duracao ? ` (${duracao})` : ''}`
    : null

  return (
    <div className="card card-ocorrencia-origem">
      <div className="fca-header">
        <div>
          <div className="ocorrencia-origem-titulo">🔧 Ocorrência de origem — {ocorrencia.equipamento}</div>
          <div className="fca-meta">
            lançada por {ocorrencia.autor || '—'}
            {dataRelatorio && ` · ${dataRelatorio}`}
            {ocorrencia.turno && ` · ${ocorrencia.turno}`}
            {ocorrencia.setor && ` · ${ocorrencia.setor}`}
          </div>
        </div>
      </div>

      <div className="fca-corpo">
        <Bloco icone="📝" titulo="Sintoma observado" texto={ocorrencia.sintoma} />

        <div className="fca-secao">
          <div className="fca-secao-header"><span>⚠️</span><span>Falha & impacto</span></div>
          <Linha rotulo="Modo de falha" valor={ocorrencia.modo} />
          <Linha rotulo="Impacto"       valor={ocorrencia.impacto} />
          <Linha rotulo="Intervenção"   valor={ocorrencia.intervencao} />
          <Linha rotulo="Horário"       valor={horario} />
        </div>

        <Bloco icone="✅" titulo="Descrição da solução" texto={ocorrencia.solucao} />
        <Linha rotulo="Executor" valor={ocorrencia.executor} />

        {(ocorrencia.fotos || []).length > 0 && (
          <div className="fca-secao">
            <div className="fca-secao-header"><span>📷</span><span>Fotos</span></div>
            <div className="ocorrencia-origem-fotos">
              {ocorrencia.fotos.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer" title={f.legenda || ''}>
                  <img src={f.url} alt={f.legenda || 'foto da ocorrência'} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
