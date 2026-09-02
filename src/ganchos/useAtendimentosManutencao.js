// Gancho para contar atendimentos de manutenção ativos, em tempo real —
// usado para exibir os dois números-indicadores na aba "Manutenção"
// (quantos estão sendo atendidos agora e quantos aguardam manutentor).
//
// Reaproveita a mesma tabela/consulta usada dentro de PaginaManutencao.jsx
// (ver ronda/manutencao.js → listarAtendimentosAtivos), mas escuta o
// Supabase Realtime para manter a contagem sempre atualizada, mesmo sem
// abrir a aba.

import { useState, useEffect, useCallback } from 'react'
import { bd } from '../utilitarios/supabase.js'
import { listarAtendimentosAtivos } from '../ronda/manutencao.js'

export function useAtendimentosManutencao(ativo) {
  const [atendimentos, setAtendimentos] = useState([])

  const recarregar = useCallback(async () => {
    if (!ativo) return
    try {
      const dados = await listarAtendimentosAtivos()
      setAtendimentos(dados)
    } catch (e) {
      console.error('useAtendimentosManutencao:', e)
    }
  }, [ativo])

  useEffect(() => {
    if (!ativo) { setAtendimentos([]); return }

    recarregar()

    const canal = bd
      .channel('canal-atendimentos-badge-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ronda_atendimentos_manutencao' }, recarregar)
      .subscribe()

    return () => bd.removeChannel(canal)
  }, [ativo, recarregar])

  // "em andamento" = já tem manutentor atuando agora
  const emAndamento = atendimentos.filter(a => a.manutentor_id).length
  // "pendentes" = registrados mas ainda aguardando alguém assumir
  const pendentes = atendimentos.filter(a => !a.manutentor_id).length

  return { atendimentos, emAndamento, pendentes, recarregar }
}
