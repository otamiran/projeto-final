// Funções de autenticação via Supabase
// Substitui a lista fixa de usuários do constantes.js

import { bd, TABELA_USUARIOS } from './supabase'

// Gera hash SHA-256 da senha (Web Crypto API — disponível em todos os browsers modernos)
async function gerarHash(texto) {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(texto)
  )
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Tenta fazer login — retorna { ok, sessao } ou { ok: false, erro }
export async function fazerLoginBD(username, senha) {
  try {
    const hash = await gerarHash(senha)

    // Busca usuário com username e senha corretos
    const { data, error } = await bd
      .from(TABELA_USUARIOS)
      .select('*')
      .eq('username', username.trim())
      .eq('senha_hash', hash)
      .single()

    if (error || !data) {
      return { ok: false, erro: 'Usuário ou senha incorretos.' }
    }

    // Verifica se o cadastro foi aprovado pelo admin
    if (data.status === 'pendente') {
      return { ok: false, erro: 'Cadastro aguardando aprovação do administrador.' }
    }
    if (data.status === 'bloqueado') {
      return { ok: false, erro: 'Acesso bloqueado. Contate o administrador.' }
    }

    // Atualiza timestamp do último acesso (sem aguardar)
    bd.from(TABELA_USUARIOS)
      .update({ ultimo_acesso: Date.now() })
      .eq('id', data.id)

    // Retorna sessão sem a senha
    return {
      ok: true,
      sessao: {
        id: data.id,
        login: data.username,
        nome: data.username,
        grupo: data.grupo,  // 'manutencao' | 'producao' | 'admin'
        perfil: data.grupo === 'admin' ? 'admin' : 'usuario',
        tecnico: '',        // preenchido depois na tela principal
        responsavel: '',
      },
    }
  } catch (e) {
    return { ok: false, erro: 'Erro de conexão. Tente novamente.' }
  }
}

// Solicita cadastro de novo usuário — fica com status 'pendente' até admin aprovar
export async function solicitarCadastro(username, senha, grupo) {
  try {
    const hash = await gerarHash(senha)
    const { error } = await bd.from(TABELA_USUARIOS).insert({
      username: username.trim(),
      senha_hash: hash,
      grupo,             // 'manutencao' | 'producao'
      status: 'pendente',
      criado_em: Date.now(),
    })
    if (error) {
      // Código 23505 = violação de unique (username já existe)
      if (error.code === '23505') return { ok: false, erro: 'Usuário já existe.' }
      return { ok: false, erro: 'Erro ao cadastrar: ' + error.message }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: 'Erro de conexão.' }
  }
}

// Remove a sessão do navegador
export function fazerLogoutBD() {
  try { localStorage.removeItem('turno_sessao') } catch {}
}

// Lê sessão salva no navegador
export function lerSessaoBD() {
  try {
    const salvo = localStorage.getItem('turno_sessao')
    return salvo ? JSON.parse(salvo) : null
  } catch { return null }
}
