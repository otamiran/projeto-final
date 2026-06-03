// Barra de progresso exibida durante a importação de planilha.
// Exibe porcentagem e contagem de linhas enviadas.

export default function BarraProgressoAlmox({ progresso }) {
  if (!progresso) return null

  const pct = Math.round((progresso.atual / progresso.total) * 100)

  return (
    <div className="almox-progresso-faixa">
      <span className="pulsando" />
      <span>
        Enviando... {progresso.atual} / {progresso.total} itens ({pct}%)
      </span>
      <div className="almox-progresso-trilha">
        <div className="almox-progresso-barra" style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}
