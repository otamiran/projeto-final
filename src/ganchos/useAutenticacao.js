// Gerencia login, logout e sessão do usuário
// A sessão guarda: login, nome, perfil, tecnico, responsavel
// tecnico e responsavel são preenchidos NA TELA PRINCIPAL (não no login)

import { useState } from 'react'
import { fazerLogin, fazerLogout, lerSessao } from '../utilitarios/autenticacao'

export function useAutenticacao() {
  // Carrega a sessão salva no navegador ao iniciar
  const [sessao, setSessao] = useState(() => lerSessao())

  // Faz o login com usuário e senha
  // tecnico e responsavel ficam vazios — serão preenchidos depois na tela Novo
  function entrar(login, senha) {
    const resultado = fazerLogin(login, senha)
    if (resultado.ok) {
      // Adiciona campos extras à sessão (vazios por enquanto)
      const sessaoCompleta = {
        ...resultado.sessao,
        tecnico: '', // preenchido na tela principal
        responsavel: '', // preenchido na tela principal
      }
      try {
        localStorage.setItem('turno_sessao', JSON.stringify(sessaoCompleta))
      } catch {}
      setSessao(sessaoCompleta)
      return { ok: true, sessao: sessaoCompleta }
    }
    return resultado
  }

  // Atualiza o técnico e responsável sem sair do sistema
  function atualizarIdentificacao(tecnico, responsavel) {
    setSessao(s => {
      const nova = { ...s, tecnico, responsavel }
      try {
        localStorage.setItem('turno_sessao', JSON.stringify(nova))
      } catch {}
      return nova
    })
  }

  // Logout
  function sair() {
    fazerLogout()
    setSessao(null)
  }

  return {
    sessao,
    estaLogado: !!sessao,
    entrar,
    sair,
    atualizarIdentificacao, // usado pela tela principal
  }
}
