// Grupo de botões onde só um pode ficar selecionado por vez
// Usado para: modo de falha, impacto, turno, status da atividade...

export default function BotoesAlternancia({ opcoes, valor, aoMudar, getClasse }) {
  return (
    <div className="grupo-botoes">
      {opcoes.map(opcao => (
        <button
          key={opcao}
          type="button"
          // 'selecionado' adiciona a cor de destaque via CSS
          className={`botao-alternancia ${valor === opcao ? 'selecionado' : ''} ${getClasse ? getClasse(opcao) : ''}`}
          onClick={() => aoMudar(opcao === valor ? null : opcao)} // clica de novo = desmarca
        >
          {opcao}
        </button>
      ))}
    </div>
  )
}
