// Utilitários de autenticação do modo administrador do Almoxarifado.
// Segue o mesmo padrão de autenticacao.js do app principal.

import { SENHA_ADMIN, CHAVE_ADMIN } from './constantes'

// Verifica se a sessão admin está ativa no localStorage
export function lerSessaoAdmin() {
  try { return localStorage.getItem(CHAVE_ADMIN) === '1' } catch { return false }
}

// Salva (ou remove) a sessão admin no localStorage
export function salvarSessaoAdmin(ativo) {
  try {
    if (ativo) localStorage.setItem(CHAVE_ADMIN, '1')
    else        localStorage.removeItem(CHAVE_ADMIN)
  } catch {}
}

// Valida a senha digitada e salva a sessão se correta.
// Retorna { ok: true } ou { ok: false, erro: string }
export function tentarLoginAdmin(senha) {
  if (senha === SENHA_ADMIN) {
    salvarSessaoAdmin(true)
    return { ok: true }
  }
  return { ok: false, erro: 'Senha incorreta.' }
}

// Encerra a sessão admin
export function sairAdmin() {
  salvarSessaoAdmin(false)
}
