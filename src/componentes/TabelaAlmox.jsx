// Tabela principal do Almoxarifado.
// Cabeçalhos são clicáveis para ordenar; última coluna é sempre "Observações".

import Destaque  from './Destaque'
import BotaoObs from './BotaoObs'

// ── Cabeçalho de coluna ordenável ─────────────────────────────────────────
function ColunaOrdenavel({ nome, colunaOrdem, direcao, aoClicar }) {
  const ativa = colunaOrdem === nome
  const seta  = ativa ? (direcao === 'asc' ? ' ↑' : ' ↓') : ''
  return (
    <th
      className={`almox-th almox-th--clicavel${ativa ? ' almox-th--ativa' : ''}`}
      onClick={() => aoClicar(nome)}
    >
      {nome}{seta}
    </th>
  )
}

// ── Tabela ────────────────────────────────────────────────────────────────
export default function TabelaAlmox({
  cabecalhos,
  linhasFiltradas,
  obs,
  busca,
  colunaOrdem,
  direcao,
  aoOrdenar,
  aoEditarObs,
}) {
  const q = busca.toLowerCase().trim()

  return (
    <table className="almox-tabela">
      {/* Cabeçalho */}
      <thead>
        <tr>
          {cabecalhos.map(h => (
            <ColunaOrdenavel
              key={h}
              nome={h}
              colunaOrdem={colunaOrdem}
              direcao={direcao}
              aoClicar={aoOrdenar}
            />
          ))}
          <th className="almox-th almox-th--obs">Onde é Usado / Obs.</th>
        </tr>
      </thead>

      {/* Corpo */}
      <tbody>
        {linhasFiltradas.map(row => (
          <tr key={row.id ?? row.row_idx} className="almox-tr">
            {cabecalhos.map(h => (
              <td key={h} className="almox-td">
                <Destaque texto={row.cells[h] || ''} busca={q} />
              </td>
            ))}
            <td className="almox-td almox-td--obs">
              <BotaoObs
                obsObj={obs[row.row_idx]}
                aoClicar={() => aoEditarObs(row)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
