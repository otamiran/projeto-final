// Funções de autenticação via Supabase
import { bd, TABELA_USUARIOS } from './supabase'

// Gera hash SHA-256 da senha
async function gerarHash(texto) {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(texto)
  )
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function fazerLoginBD(username, senha) {
  try {
    const hash = await gerarHash(senha)

    // Busca pelo username primeiro (sem filtrar senha)
    const { data, error } = await bd
      .from(TABELA_USUARIOS)
      .select('*')
      .eq('username', username.trim())

    if (error) {
      console.error('Erro ao buscar usuário:', error)
      return { ok: false, erro: 'Erro de conexão: ' + error.message }
    }

    // Nenhum usuário encontrado com esse username
    if (!data || data.length === 0) {
      return { ok: false, erro: 'Usuário não encontrado.' }
    }

    const usuario = data[0]

    // Compara o hash manualmente
    if (usuario.senha_hash !== hash) {
      console.log('Hash esperado:', hash)
      console.log('Hash no banco:', usuario.senha_hash)
      return { ok: false, erro: 'Senha incorreta.' }
    }

    // Verifica status
    if (usuario.status === 'pendente') {
      return { ok: false, erro: 'Cadastro aguardando aprovação do administrador.' }
    }
    if (usuario.status === 'bloqueado') {
      return { ok: false, erro: 'Acesso bloqueado. Contate o administrador.' }
    }

    // Atualiza último acesso
    bd.from(TABELA_USUARIOS)
      .update({ ultimo_acesso: Date.now() })
      .eq('id', usuario.id)

    return {
      ok: true,
      sessao: {
        id:          usuario.id,
        login:       usuario.username,
        nome:        usuario.username,
        grupo:       usuario.grupo,
        perfil:      usuario.grupo === 'admin' ? 'admin' : 'usuario',
        tecnico:     '',
        responsavel: '',
      },
    }
  } catch (e) {
    console.error('Erro no login:', e)
    return { ok: false, erro: 'Erro inesperado: ' + String(e) }
  }
}

export async function solicitarCadastro(username, senha, grupo) {
  try {
    const hash = await gerarHash(senha)
    const { error } = await bd.from(TABELA_USUARIOS).insert({
      username:   username.trim(),
      senha_hash: hash,
      grupo,
      status:     'pendente',
      criado_em:  Date.now(),
    })
    if (error) {
      if (error.code === '23505') return { ok: false, erro: 'Usuário já existe.' }
      return { ok: false, erro: 'Erro ao cadastrar: ' + error.message }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: 'Erro de conexão.' }
  }
}

export function fazerLogoutBD() {
  try { localStorage.removeItem('turno_sessao') } catch {}
}

export function lerSessaoBD() {
  try {
    const salvo = localStorage.getItem('turno_sessao')
    return salvo ? JSON.parse(salvo) : null
  } catch { return null }
}
