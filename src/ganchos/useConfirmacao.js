// Gancho para exibir um modal de confirmação antes de ações perigosas (excluir, etc.)

import { useState, useRef } from 'react'

export function useConfirmacao() {
  const [aberto, setAberto] = useState(false) // modal visível?
  const [mensagem, setMensagem] = useState('') // pergunta exibida

  // Guarda a função a executar se confirmar
  const acaoPendente = useRef(null)

  // Abre o modal com uma mensagem e guarda a ação
  function pedir(mensagem, aoConfirmar) {
    acaoPendente.current = aoConfirmar
    setMensagem(mensagem)
    setAberto(true)
  }

  // Usuário clicou em "Confirmar"
  async function confirmar() {
    setAberto(false)
    if (acaoPendente.current) await acaoPendente.current()
  }

  // Usuário clicou em "Cancelar"
  function cancelar() {
    setAberto(false)
    acaoPendente.current = null
  }

  return {
    confirmacaoAberta: aberto,
    mensagemConfirmacao: mensagem,
    pedir, // abre o modal
    confirmar, // executa a ação
    cancelar, // fecha sem fazer nada
  }
}
