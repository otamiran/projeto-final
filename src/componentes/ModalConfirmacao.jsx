// Modal simples de sim/não para ações perigosas (excluir, fechar, etc.)

export default function ModalConfirmacao({ aberto, mensagem, aoConfirmar, aoCancelar }) {
  // Se não estiver aberto, não renderiza nada
  if (!aberto) return null

  return (
    // Fundo escuro semi-transparente — clique nele cancela
    <div className="fundo-modal" onClick={e => e.target === e.currentTarget && aoCancelar()}>
      <div className="modal">
        {/* Cabeçalho */}
        <div className="modal-cabecalho">
          <h2>Confirmar</h2>
          <button className="botao-fechar-modal" onClick={aoCancelar}>
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="modal-corpo" style={{ textAlign: 'center', padding: 20 }}>
          <p style={{ marginBottom: 20 }}>{mensagem}</p>

          {/* Botões de ação */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="botao botao-destaque" onClick={aoConfirmar}>
              Confirmar
            </button>
            <button className="botao" onClick={aoCancelar}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
