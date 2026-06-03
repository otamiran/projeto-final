// Gancho para mostrar mensagens temporárias (toast) no rodapé da tela

import { useState, useRef } from 'react'

export function useAviso() {
  const [aviso, setAviso] = useState({ texto: '', erro: false, visivel: false })
  const temporizador = useRef(null) // guarda o timer para poder cancelar

  // Mostra uma mensagem por 2.5 segundos
  // erro = true → mensagem em vermelho
  function mostrar(texto, erro = false) {
    // Cancela o timer anterior se ainda estiver ativo
    if (temporizador.current) clearTimeout(temporizador.current)

    // Torna o aviso visível
    setAviso({ texto, erro, visivel: true })

    // Esconde após 2.5 segundos
    temporizador.current = setTimeout(() => {
      setAviso(a => ({ ...a, visivel: false }))
    }, 2500)
  }

  return { aviso, mostrar }
}
