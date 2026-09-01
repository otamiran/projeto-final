// Lista de equipamentos do Admin = a MESMA lista/hierarquia da Ronda
// (setor › grupo › máquina › estação), lida e editada direto das tabelas
// ronda_setores/ronda_grupos/ronda_maquinas/ronda_estacoes — não existe
// mais um cadastro de equipamentos separado. Isso é literalmente o
// mesmo componente <PainelHierarquia> que a Ronda usa, sempre no modo
// "gerenciar" (é uma tela de administração, não de execução da ronda).
import './estilos.css'
import { useEstruturaRemota } from './useEstruturaRemota.js'
import PainelHierarquia from './componentes/PainelHierarquia.jsx'

export default function PainelEquipamentosAdmin() {
  const {
    setores, grupos, maquinas, estacoes, carregando, erro, setErro,
    addSetor, addGrupo, addMaquina, addEstacao, renomear, excluir,
    moverGrupo, moverMaquina,
  } = useEstruturaRemota()

  const totalMaquinas = maquinas.length
  const totalEstacoes = estacoes.length

  return (
    <div className="ronda-modulo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div className="sub">
            {setores.length} setor(es) · {totalMaquinas} máquina(s) · {totalEstacoes} estação(ões)
          </div>
        </div>

        {erro && (
          <div className="erro">
            {erro}
            <button className="fechar-erro" onClick={() => setErro('')}>✕</button>
          </div>
        )}

        {carregando ? (
          <div className="carregando">Carregando…</div>
        ) : setores.length === 0 ? (
          <div className="vazio">
            Nenhum setor cadastrado ainda. Use o campo "+ setor" abaixo para começar — a mesma lista
            aparecerá automaticamente na Ronda.
          </div>
        ) : null}

        <div style={{ height: 560, display: 'flex', flexDirection: 'column', border: '1px solid var(--ronda-borda)', borderRadius: 10, overflow: 'hidden' }}>
          <PainelHierarquia
            setores={setores}
            grupos={grupos}
            maquinas={maquinas}
            estacoes={estacoes}
            gerenciar={true}
            operador=""
            bloqueado={true}
            aoSalvarLote={() => {}}
            aoAddSetor={addSetor}
            aoAddGrupo={addGrupo}
            aoAddMaquina={addMaquina}
            aoAddEstacao={addEstacao}
            aoExcluir={excluir}
            aoRenomear={renomear}
            aoMoverGrupo={moverGrupo}
            aoMoverMaquina={moverMaquina}
            aoMudarEstadoSalvar={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
