// Funções simples de login, logout e verificação de sessão

import { USUARIOS, CHAVE_SESSAO } from './constantes'

// Tenta fazer login com o usuário e senha informados
// Retorna { ok: true, sessao } se correto, ou { ok: false, erro } se errado
export function fazerLogin(login, senha) {
  // Procura o usuário na lista (ignora maiúsculas/minúsculas no login)
  const encontrado = USUARIOS.find(
    u => u.login.toLowerCase() === login.trim().toLowerCase() && u.senha === senha.trim()
  )

  // Usuário não encontrado ou senha errada
  if (!encontrado) {
    return { ok: false, erro: 'Usuário ou senha inválidos.' }
  }

  // Monta o objeto de sessão (sem a senha!)
  const sessao = {
    login: encontrado.login,
    nome: encontrado.nome,
    perfil: encontrado.perfil,
  }

  // Salva no navegador para não precisar logar de novo ao recarregar
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
  } catch {}

  return { ok: true, sessao }
}

// Remove a sessão do navegador (logout)
export function fazerLogout() {
  try {
    localStorage.removeItem(CHAVE_SESSAO)
  } catch {}
}

// Lê a sessão salva no navegador
// Retorna o objeto de sessão ou null se não estiver logado
export function lerSessao() {
  try {
    const salvo = localStorage.getItem(CHAVE_SESSAO)
    return salvo ? JSON.parse(salvo) : null
  } catch {
    return null
  }
}

// Verifica se o usuário é administrador
export const ehAdmin = sessao => sessao?.perfil === 'admin'
