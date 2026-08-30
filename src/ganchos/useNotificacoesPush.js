// Gancho React para o botão de "ativar notificações" na barra superior

import { useState, useEffect, useCallback } from 'react'
import {
  suportaNotificacoesPush,
  statusNotificacoes,
  ativarNotificacoes,
  desativarNotificacoes,
} from '../utilitarios/pushNotificacoes'

export function useNotificacoesPush(sessao, mostrarAviso) {
  // 'carregando' | 'ativo' | 'inativo' | 'negado' | 'indisponivel'
  const [status, setStatus] = useState('carregando')

  const atualizarStatus = useCallback(async () => {
    if (!suportaNotificacoesPush()) {
      setStatus('indisponivel')
      return
    }
    setStatus(await statusNotificacoes())
  }, [])

  useEffect(() => {
    atualizarStatus()
  }, [atualizarStatus])

  async function alternar() {
    try {
      if (status === 'ativo') {
        await desativarNotificacoes()
        setStatus('inativo')
        mostrarAviso?.('🔕 Notificações desativadas.')
      } else {
        setStatus('carregando')
        const nome = sessao?.tecnico || sessao?.login || sessao?.nome || ''
        await ativarNotificacoes(nome, sessao?.id)
        setStatus('ativo')
        mostrarAviso?.('🔔 Notificações ativadas neste aparelho!')
      }
    } catch (erro) {
      await atualizarStatus()
      mostrarAviso?.(erro.message || 'Não foi possível alterar as notificações.', true)
    }
  }

  return { status, alternar }
}
