// Faixa no topo da página "Novo" que mostra se o banco está conectado

export default function BarraStatus({ status }) {
  return (
    // A classe muda a cor: 'ok' = verde, 'erro' = vermelho, 'carregando' = amarelo
    <div className={`barra-status ${status.tipo}`}>
      <span className="pulsando" /> {/* pontinho animado */}
      {status.mensagem}
    </div>
  )
}
