// Gancho para o painel de administração
// Gerencia usuários: lista, aprovação, bloqueio, exclusão

import { useState, useEffect, useCallback } from 'react'
import { bd, TABELA_USUARIOS } from '../utilitarios/supabase'

export function useAdmin(estaLogado, ehAdmin) {
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(false)

  // Busca todos os usuários do banco (exceto o próprio admin pela senha hash)
  const recarregar = useCallback(async () => {
    if (!estaLogado || !ehAdmin) return
    setCarregando(true)
    const { data } = await bd
      .from(TABELA_USUARIOS)
      .select('id, username, grupo, status, criado_em, ultimo_acesso')
      .order('criado_em', { ascending: false })
    setUsuarios(data || [])
    setCarregando(false)
  }, [estaLogado, ehAdmin])

  useEffect(() => {
    recarregar()

    // Realtime: atualiza a lista quando alguém se cadastra ou é aprovado
    const canal = bd
      .channel('canal-usuarios')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_USUARIOS }, recarregar)
      .subscribe()

    return () => bd.removeChannel(canal)
  }, [recarregar])

  // Aprova um cadastro pendente
  async function aprovar(id) {
    await bd.from(TABELA_USUARIOS).update({ status: 'aprovado' }).eq('id', id)
  }

  // Bloqueia um usuário aprovado
  async function bloquear(id) {
    await bd.from(TABELA_USUARIOS).update({ status: 'bloqueado' }).eq('id', id)
  }

  // Exclui um usuário permanentemente
  async function excluir(id) {
    await bd.from(TABELA_USUARIOS).delete().eq('id', id)
  }

  // Usuários separados por status para facilitar a exibição
  const pendentes  = usuarios.filter(u => u.status === 'pendente')
  const aprovados  = usuarios.filter(u => u.status === 'aprovado' && u.grupo !== 'admin')
  const bloqueados = usuarios.filter(u => u.status === 'bloqueado')

  return { usuarios, pendentes, aprovados, bloqueados, carregando, aprovar, bloquear, excluir, recarregar }
}
