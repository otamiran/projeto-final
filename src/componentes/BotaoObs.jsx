// Botão de observação exibido na última coluna de cada linha da tabela.
// Se já houver observação, mostra o resumo e o autor.
// Se não houver, mostra "+ Adicionar obs."

export default function BotaoObs({ obsObj, aoClicar }) {
  const temObs = !!obsObj?.descricao

  if (temObs) {
    const texto  = obsObj.descricao
    const resumo = texto.length > 34 ? texto.slice(0, 34) + '…' : texto
    return (
      <button
        className="almox-botao-obs almox-botao-obs--com-obs"
        onClick={aoClicar}
        title={texto}
      >
        ✏ {resumo}
        <em className="almox-obs-autor"> — {obsObj.autor || '?'}</em>
      </button>
    )
  }

  return (
    <button className="almox-botao-obs" onClick={aoClicar}>
      + Adicionar obs.
    </button>
  )
}
